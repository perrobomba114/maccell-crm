from __future__ import annotations

from typing import cast

from psycopg import Connection
from psycopg.rows import class_row

from cerebro_rag.models import IngestionJob


MAX_ATTEMPTS = 3
MAX_ERROR_LENGTH = 500


def truncate_error(message: str) -> str:
    return message[:MAX_ERROR_LENGTH]


class JobRepository:
    def __init__(self, connection: Connection[object]) -> None:
        self.connection = connection

    def lease_next(self, job_type: str) -> IngestionJob | None:
        with self.connection.cursor(row_factory=class_row(IngestionJob)) as cursor:
            cursor.execute(
                """
                WITH candidate AS (
                    SELECT id, status AS previous_status
                    FROM rag_ingestion_jobs
                    WHERE job_type = %s
                      AND attempts < %s
                      AND (
                          status IN ('PENDING', 'RETRYING')
                          OR (status = 'RUNNING' AND lease_until < now())
                      )
                    ORDER BY
                        CASE WHEN status = 'RUNNING' THEN 0 ELSE 1 END,
                        created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                UPDATE rag_ingestion_jobs AS job
                SET status = CASE
                        WHEN candidate.previous_status = 'RUNNING' THEN 'RETRYING'::rag_job_status
                        ELSE 'RUNNING'::rag_job_status
                    END,
                    attempts = job.attempts + 1,
                    lease_until = now() + interval '5 minutes',
                    updated_at = now()
                FROM candidate
                WHERE job.id = candidate.id
                RETURNING job.id, job.job_type, job.source_key, job.status::text,
                          job.attempts, job.lease_until
                """,
                (job_type, MAX_ATTEMPTS),
            )
            return cast(IngestionJob | None, cursor.fetchone())

    def mark_failed(self, job_id: str, error: str) -> None:
        self.connection.execute(
            """
            UPDATE rag_ingestion_jobs
            SET status = CASE
                    WHEN attempts >= %s THEN 'FAILED'::rag_job_status
                    ELSE 'RETRYING'::rag_job_status
                END,
                lease_until = NULL,
                error_message = %s,
                updated_at = now()
            WHERE id = %s
            """,
            (MAX_ATTEMPTS, truncate_error(error), job_id),
        )
