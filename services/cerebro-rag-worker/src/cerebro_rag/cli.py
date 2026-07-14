from __future__ import annotations

import argparse
from pathlib import Path

import psycopg

from cerebro_rag.config import WorkerSettings
from cerebro_rag.embeddings import get_embedding_service
from cerebro_rag.indexer import PdfIndexer
from cerebro_rag.pdf_inventory import iter_pdf_inventory


def index_pdfs(settings: WorkerSettings, limit: int | None, model: str | None) -> None:
    entries = iter_pdf_inventory(settings.library_root)
    processed = ready = failed = pages = chunks = 0
    with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
        indexer = PdfIndexer(
            connection,
            get_embedding_service(settings.embedding_model, settings.batch_size),
            settings.page_cache_root,
        )
        for entry in entries:
            if model and model.casefold() not in entry.identity.model.casefold():
                continue
            if limit is not None and processed >= limit:
                break
            processed += 1
            try:
                _, page_count, chunk_count, skipped = indexer.index(entry)
                ready += 1
                pages += page_count
                chunks += chunk_count
                print(f"INDEXED {processed} ready={ready} skipped={int(skipped)} failed={failed}", flush=True)
            except Exception as error:
                failed += 1
                print(f"FAILED {processed} type={type(error).__name__} ready={ready} failed={failed}", flush=True)
    print(f"SUMMARY processed={processed} ready={ready} failed={failed} pages={pages} chunks={chunks}")
    if failed:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(prog="cerebro-rag")
    commands = parser.add_subparsers(dest="command", required=True)
    pdfs = commands.add_parser("index-pdfs")
    pdfs.add_argument("--limit", type=int)
    pdfs.add_argument("--model")
    pilot = commands.add_parser("pilot")
    pilot.add_argument("--model", default="SM-A405FN")
    pilot.add_argument("--pdf-limit", type=int, default=2)
    args = parser.parse_args()
    settings = WorkerSettings()
    if args.command == "index-pdfs":
        index_pdfs(settings, args.limit, args.model)
    elif args.command == "pilot":
        index_pdfs(settings, args.pdf_limit, args.model)


if __name__ == "__main__":
    main()
