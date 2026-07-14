from __future__ import annotations

import os
import subprocess
import unittest
from pathlib import Path


SCHEMA_PATH = Path(__file__).parents[1] / "src" / "cerebro_rag" / "schema.sql"


class RagSchemaTest(unittest.TestCase):
    def test_schema_has_fixed_vector_dimension_and_indexes(self) -> None:
        database_url = os.environ.get("RAG_TEST_DATABASE_URL")
        if not database_url:
            self.skipTest("RAG_TEST_DATABASE_URL is required for the integration test")

        self.assertTrue(SCHEMA_PATH.exists(), "schema.sql must exist")
        subprocess.run(
            ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-f", str(SCHEMA_PATH)],
            check=True,
            capture_output=True,
            text=True,
        )
        result = subprocess.run(
            [
                "psql",
                database_url,
                "-Atc",
                """
                SELECT format_type(a.atttypid, a.atttypmod)
                FROM pg_attribute a
                JOIN pg_class c ON c.oid = a.attrelid
                WHERE c.relname = 'rag_chunks' AND a.attname = 'embedding';
                """,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.stdout.strip(), "vector(1024)")

        indexes = subprocess.run(
            [
                "psql",
                database_url,
                "-Atc",
                "SELECT indexname FROM pg_indexes WHERE tablename = 'rag_chunks' ORDER BY indexname;",
            ],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        self.assertIn("rag_chunks_hnsw", indexes)
        self.assertIn("rag_chunks_search", indexes)


if __name__ == "__main__":
    unittest.main()
