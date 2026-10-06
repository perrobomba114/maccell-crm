from __future__ import annotations

import argparse
import signal
import threading
from pathlib import Path

import psycopg

from cerebro_rag.config import WorkerSettings
from cerebro_rag.device_alias_catalog import catalog_pdf_aliases
from cerebro_rag.embeddings import get_worker_embedding_service
from cerebro_rag.indexer import PdfIndexer, pdf_descriptor
from cerebro_rag.migrations import apply_migrations
from cerebro_rag.pdf_inventory import iter_pdf_inventory, published_pdf_paths
from cerebro_rag.repair_indexer import RepairIndexer, repair_source_from_row
from cerebro_rag.repairs import REPAIR_EXPORT_QUERY
from cerebro_rag.repair_sync import run_repair_sync


def index_pdfs(
    settings: WorkerSettings,
    limit: int | None,
    model: str | None,
    shard_index: int = 0,
    shard_count: int = 1,
    force: bool = False,
    incremental: bool = False,
) -> None:
    entries = iter_pdf_inventory(settings.library_root, shard_index, shard_count, newest_first=incremental)
    processed = ready = failed = pages = chunks = 0
    with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
        if incremental:
            locked = connection.execute("SELECT pg_try_advisory_lock(748193206)").fetchone()
            if not locked or not locked[0]:
                print("WATCH busy: another PDF ingestion owns the lock", flush=True)
                return
        paths = [path.relative_to(settings.library_root.resolve()).as_posix() for path in published_pdf_paths(settings.library_root)]
        connection.execute(
            "UPDATE rag_documents SET retired_at=now(),updated_at=now() WHERE source_type='PDF' AND retired_at IS NULL AND NOT (relative_path = ANY(%s))",
            (paths,),
        )
        connection.commit()
        known = set()
        if incremental and not force:
            known = {(row[0], row[1].strip()) for row in connection.execute(
                "SELECT relative_path,sha256 FROM rag_documents WHERE source_type='PDF' AND retired_at IS NULL AND status IN ('READY','FAILED')"
            ).fetchall()}
        catalog_pdf_aliases(settings.library_root, connection)
        indexer = PdfIndexer(
            connection,
            get_worker_embedding_service(settings),
            settings.page_cache_root,
        )
        for entry in entries:
            if (entry.relative_path.as_posix(), entry.sha256) in known:
                continue
            if model and model.casefold() not in entry.identity.model.casefold():
                continue
            if limit is not None and processed >= limit:
                break
            processed += 1
            try:
                _, page_count, chunk_count, skipped = indexer.index(entry, force=force)
                ready += 1
                pages += page_count
                chunks += chunk_count
                print(f"INDEXED {processed} ready={ready} skipped={int(skipped)} failed={failed}", flush=True)
            except Exception as error:
                connection.rollback()
                document_id = indexer.versions.create_or_get(pdf_descriptor(entry))
                connection.execute(
                    "UPDATE rag_documents SET status='FAILED', metadata=metadata || jsonb_build_object('error_type', %s::text), updated_at=now() WHERE id=%s",
                    (type(error).__name__, document_id),
                )
                connection.commit()
                failed += 1
                print(f"FAILED {processed} type={type(error).__name__} ready={ready} failed={failed}", flush=True)
    print(f"SUMMARY processed={processed} ready={ready} failed={failed} pages={pages} chunks={chunks}")



def index_repairs(settings: WorkerSettings, limit: int | None) -> None:
    indexed = skipped = processed = 0
    embeddings = get_worker_embedding_service(settings)
    with (
        psycopg.connect(settings.source_database_url.get_secret_value()) as source_connection,
        psycopg.connect(settings.rag_database_url.get_secret_value()) as rag_connection,
    ):
        source_connection.read_only = True
        repair_indexer = RepairIndexer(rag_connection, embeddings)
        batch = []
        for row in source_connection.execute(REPAIR_EXPORT_QUERY):
            if limit is not None and processed >= limit:
                break
            batch.append(repair_source_from_row(row))
            processed += 1
            if len(batch) == settings.batch_size:
                batch_indexed, batch_skipped = repair_indexer.index_batch(batch)
                indexed += batch_indexed
                skipped += batch_skipped
                batch.clear()
                print(f"REPAIRS processed={processed} indexed={indexed} skipped={skipped}", flush=True)
        if batch:
            batch_indexed, batch_skipped = repair_indexer.index_batch(batch)
            indexed += batch_indexed
            skipped += batch_skipped
    print(f"SUMMARY processed={processed} indexed={indexed} skipped={skipped}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="cerebro-rag")
    commands = parser.add_subparsers(dest="command", required=True)
    pdfs = commands.add_parser("index-pdfs")
    pdfs.add_argument("--limit", type=int)
    pdfs.add_argument("--model")
    pdfs.add_argument("--shard-index", type=int, default=0)
    pdfs.add_argument("--shard-count", type=int, default=1)
    pdfs.add_argument("--watch", action="store_true", help="Ingesta incremental continua; conserva READY y fallos ya informados")
    pdfs.add_argument("--interval", type=int, default=300)
    pdfs.add_argument("--force", action="store_true", help="Force re-indexing even if already indexed")
    pilot = commands.add_parser("pilot")
    pilot.add_argument("--model", default="SM-A405FN")
    pilot.add_argument("--pdf-limit", type=int, default=2)
    repairs = commands.add_parser("index-repairs")
    repairs.add_argument("--limit", type=int)
    commands.add_parser("migrate")
    commands.add_parser("catalog-aliases")
    sync = commands.add_parser("sync-repairs")
    sync.add_argument("--interval", type=int, default=300)
    args = parser.parse_args()
    settings = WorkerSettings()
    if args.command == "index-pdfs":
        if args.watch:
            if args.force or args.shard_count != 1 or args.shard_index != 0:
                parser.error("--watch no permite --force ni shards")
            stop = threading.Event()
            signal.signal(signal.SIGTERM, lambda *_: stop.set())
            signal.signal(signal.SIGINT, lambda *_: stop.set())
            while not stop.is_set():
                index_pdfs(settings, args.limit or 25, args.model, incremental=True)
                print("WATCH idle; next scan after interval", flush=True)
                stop.wait(max(60, args.interval))
        else:
            index_pdfs(settings, args.limit, args.model, args.shard_index, args.shard_count, force=args.force)

    elif args.command == "pilot":
        index_pdfs(settings, args.pdf_limit, args.model)
    elif args.command == "index-repairs":
        index_repairs(settings, args.limit)
    elif args.command == "migrate":
        with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
            apply_migrations(connection)
    elif args.command == "catalog-aliases":
        with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
            count = catalog_pdf_aliases(settings.library_root, connection)
        print(f"ALIASES cataloged={count}", flush=True)
    elif args.command == "sync-repairs":
        run_repair_sync(settings, max(60, args.interval))


if __name__ == "__main__":
    main()
