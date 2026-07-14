from __future__ import annotations

import os
import unittest

import psycopg

from cerebro_rag.jobs import JobRepository, truncate_error


class JobRepositoryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.database_url = os.environ["RAG_TEST_DATABASE_URL"]

    def setUp(self) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute("TRUNCATE rag_ingestion_jobs")
            connection.execute(
                """
                INSERT INTO rag_ingestion_jobs (job_type, source_key)
                VALUES ('PDF', 'one'), ('PDF', 'two')
                """
            )

    def test_two_workers_lease_different_jobs(self) -> None:
        first_connection = psycopg.connect(self.database_url)
        second_connection = psycopg.connect(self.database_url)
        self.addCleanup(first_connection.close)
        self.addCleanup(second_connection.close)

        first = JobRepository(first_connection).lease_next("PDF")
        second = JobRepository(second_connection).lease_next("PDF")

        self.assertIsNotNone(first)
        self.assertIsNotNone(second)
        self.assertNotEqual(first.id, second.id)
        first_connection.commit()
        second_connection.commit()

    def test_expired_running_job_is_retried_and_attempt_incremented(self) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute(
                """
                UPDATE rag_ingestion_jobs
                SET status = 'RUNNING', lease_until = now() - interval '1 minute', attempts = 1
                WHERE source_key = 'one'
                """
            )
            job = JobRepository(connection).lease_next("PDF")

            self.assertIsNotNone(job)
            self.assertEqual(job.source_key, "one")
            self.assertEqual(job.attempts, 2)
            self.assertEqual(job.status, "RETRYING")

    def test_error_message_is_capped_at_500_characters(self) -> None:
        self.assertEqual(len(truncate_error("x" * 700)), 500)


if __name__ == "__main__":
    unittest.main()
