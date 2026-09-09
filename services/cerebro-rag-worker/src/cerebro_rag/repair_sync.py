from __future__ import annotations

from time import sleep

import psycopg
from psycopg.types.json import Jsonb

from cerebro_rag.config import WorkerSettings
from cerebro_rag.embeddings import get_worker_embedding_service
from cerebro_rag.repair_cursor import RepairCursor
from cerebro_rag.repair_indexer import RepairIndexer, repair_source_from_row
from cerebro_rag.repairs import REPAIR_SYNC_QUERY, REPAIR_SYNC_QUERY_WITHOUT_LEARNING

ACTIVE_REPAIR_IDS_QUERY = 'SELECT id FROM repairs WHERE "statusId" IN (1, 2, 3, 4)'


class RepairSyncStageError(RuntimeError):
    def __init__(self, stage: str, sqlstate: str) -> None:
        super().__init__(f"repair sync failed at stage={stage}")
        self.stage = stage
        self.sqlstate = sqlstate


def _is_permission_denied(error: BaseException) -> bool:
    sqlstate = getattr(error, "sqlstate", None)
    return sqlstate == "42501" or "permission denied" in str(error).lower()


def _is_optional_permission_denied(stage: str, error: BaseException) -> bool:
    return stage == "retire_active_repairs" and _is_permission_denied(error)


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
    stored = row[0] if row else {}
    cursor = RepairCursor.from_json(stored)
    if stored != cursor.to_json():
        connection.execute(
            """
            UPDATE rag_ingestion_jobs
            SET cursor = %s, updated_at = now()
            WHERE job_type = 'REPAIR_SYNC' AND source_key = 'main'
            """,
            (Jsonb(cursor.to_json()),),
        )
        connection.commit()
    return cursor


def sync_repairs_once(settings: WorkerSettings) -> tuple[int, int]:
    embeddings = get_worker_embedding_service(settings)
    indexed = skipped = 0
    stage = "connect"
    try:
        with (
            psycopg.connect(settings.source_database_url.get_secret_value()) as source_connection,
            psycopg.connect(settings.rag_database_url.get_secret_value()) as rag_connection,
        ):
            source_connection.read_only = True
            stage = "retire_active_repairs"
            try:
                _retire_active_repairs(source_connection, rag_connection)
                rag_connection.commit()
            except Exception as error:
                if not _is_optional_permission_denied(stage, error):
                    raise
                source_connection.rollback()
                rag_connection.rollback()
                print(
                    "REPAIR_SYNC_DEGRADED reason=permission_denied optional=active_repair_retirement",
                    flush=True,
                )

            stage = "load_cursor"
            cursor = _load_cursor(rag_connection)
            indexer = RepairIndexer(rag_connection, embeddings)
            repair_query = REPAIR_SYNC_QUERY
            while True:
                stage = "source_export"
                try:
                    rows = source_connection.execute(
                        repair_query,
                        (cursor.updated_at, cursor.repair_id, settings.batch_size),
                    ).fetchall()
                except Exception as error:
                    if repair_query != REPAIR_SYNC_QUERY or not _is_permission_denied(error):
                        raise
                    source_connection.rollback()
                    repair_query = REPAIR_SYNC_QUERY_WITHOUT_LEARNING
                    print(
                        "REPAIR_SYNC_DEGRADED reason=permission_denied optional=repair_learning_records",
                        flush=True,
                    )
                    rows = source_connection.execute(
                        repair_query,
                        (cursor.updated_at, cursor.repair_id, settings.batch_size),
                    ).fetchall()
                if not rows:
                    break
                stage = "index_batch"
                batch_indexed, batch_skipped = indexer.index_batch(repair_source_from_row(row) for row in rows)
                indexed += batch_indexed
                skipped += batch_skipped
                last = rows[-1]
                cursor = RepairCursor(last[12], str(last[0]))
                stage = "update_cursor"
                rag_connection.execute(
                    """
                    UPDATE rag_ingestion_jobs
                    SET cursor = %s, status = 'READY', error_message = NULL, updated_at = now()
                    WHERE job_type = 'REPAIR_SYNC' AND source_key = 'main'
                    """,
                    (Jsonb(cursor.to_json()),),
                )
                rag_connection.commit()
    except RepairSyncStageError:
        raise
    except Exception as error:
        sqlstate = getattr(error, "sqlstate", None) or "unknown"
        raise RepairSyncStageError(stage, sqlstate) from error
    return indexed, skipped


def run_repair_sync(settings: WorkerSettings, interval_seconds: int) -> None:
    while True:
        try:
            indexed, skipped = sync_repairs_once(settings)
            print(f"REPAIR_SYNC indexed={indexed} skipped={skipped}", flush=True)
        except Exception as error:
            sqlstate = getattr(error, "sqlstate", None) or "unknown"
            stage = getattr(error, "stage", None) or "unknown"
            print(
                f"REPAIR_SYNC_FAILED stage={stage} type={type(error).__name__} sqlstate={sqlstate}",
                flush=True,
            )
        sleep(interval_seconds)
