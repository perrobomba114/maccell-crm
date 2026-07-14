from __future__ import annotations

from time import sleep

import psycopg
from psycopg.types.json import Jsonb

from cerebro_rag.config import WorkerSettings
from cerebro_rag.embeddings import get_worker_embedding_service
from cerebro_rag.repair_cursor import RepairCursor
from cerebro_rag.repair_indexer import RepairIndexer, repair_source_from_row
from cerebro_rag.repairs import REPAIR_SYNC_QUERY

ACTIVE_REPAIR_IDS_QUERY = 'SELECT id FROM repairs WHERE "statusId" IN (1, 2, 3, 4)'


def _retire_active_repairs(
    source_connection: psycopg.Connection[object],
    rag_connection: psycopg.Connection[object],
) -> int:
    active_ids = [str(row[0]) for row in source_connection.execute(ACTIVE_REPAIR_IDS_QUERY)]
    if not active_ids:
        return 0
    result = rag_connection.execute(
        """
        UPDATE rag_documents
        SET retired_at = now(), updated_at = now()
        WHERE source_type = 'REPAIR'
          AND source_id = ANY(%s)
          AND retired_at IS NULL
        """,
        (active_ids,),
    )
    return result.rowcount

def _load_cursor(connection: psycopg.Connection[object]) -> RepairCursor:
    connection.execute(
        """
        INSERT INTO rag_ingestion_jobs (job_type, source_key, status)
        VALUES ('REPAIR_SYNC', 'main', 'READY')
        ON CONFLICT (job_type, source_key) DO NOTHING
        """
    )
    row = connection.execute(
        "SELECT cursor FROM rag_ingestion_jobs WHERE job_type = 'REPAIR_SYNC' AND source_key = 'main'"
    ).fetchone()
    return RepairCursor.from_json(row[0] if row else {})


def sync_repairs_once(settings: WorkerSettings) -> tuple[int, int]:
    embeddings = get_worker_embedding_service(settings)
    indexed = skipped = 0
    with (
        psycopg.connect(settings.source_database_url.get_secret_value()) as source_connection,
        psycopg.connect(settings.rag_database_url.get_secret_value()) as rag_connection,
    ):
        source_connection.read_only = True
        _retire_active_repairs(source_connection, rag_connection)
        rag_connection.commit()
        cursor = _load_cursor(rag_connection)
        indexer = RepairIndexer(rag_connection, embeddings)
        while True:
            rows = source_connection.execute(
                REPAIR_SYNC_QUERY,
                (cursor.updated_at, cursor.repair_id, settings.batch_size),
            ).fetchall()
            if not rows:
                break
            batch_indexed, batch_skipped = indexer.index_batch(repair_source_from_row(row) for row in rows)
            indexed += batch_indexed
            skipped += batch_skipped
            last = rows[-1]
            cursor = RepairCursor(last[11], str(last[0]))
            rag_connection.execute(
                """
                UPDATE rag_ingestion_jobs
                SET cursor = %s, status = 'READY', error_message = NULL, updated_at = now()
                WHERE job_type = 'REPAIR_SYNC' AND source_key = 'main'
                """,
                (Jsonb(cursor.to_json()),),
            )
            rag_connection.commit()
    return indexed, skipped


def run_repair_sync(settings: WorkerSettings, interval_seconds: int) -> None:
    while True:
        try:
            indexed, skipped = sync_repairs_once(settings)
            print(f"REPAIR_SYNC indexed={indexed} skipped={skipped}", flush=True)
        except Exception as error:
            print(f"REPAIR_SYNC_FAILED type={type(error).__name__}", flush=True)
        sleep(interval_seconds)
