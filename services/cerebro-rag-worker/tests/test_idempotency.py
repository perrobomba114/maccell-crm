from __future__ import annotations

import os
import unittest

import psycopg

from cerebro_rag.document_versions import DocumentDescriptor, DocumentVersionRepository


class DocumentVersionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        database_url = os.environ.get("RAG_TEST_DATABASE_URL")
        if not database_url:
            raise unittest.SkipTest("RAG_TEST_DATABASE_URL is required for integration tests")
        cls.database_url = database_url

    def setUp(self) -> None:
        self.connection = psycopg.connect(self.database_url)
        self.addCleanup(self.connection.close)
        self.connection.execute("TRUNCATE rag_documents CASCADE")

    def descriptor(self, sha256: str) -> DocumentDescriptor:
        return DocumentDescriptor(
            source_type="PDF",
            source_id="SAMSUNG/SM-A405FN/manual.pdf",
            relative_path="SAMSUNG/SM-A405FN/manual.pdf",
            sha256=sha256,
            title="Manual SM-A405FN",
            original_brand="Samsung",
            original_model="SM-A405FN",
            normalized_brand="SAMSUNG",
            normalized_model="SM-A405FN",
            document_type="SERVICE_MANUAL",
            authority="TECHNICAL_DOCUMENT",
        )

    def test_same_source_and_hash_returns_existing_document(self) -> None:
        repository = DocumentVersionRepository(self.connection)
        first = repository.create_or_get(self.descriptor("a" * 64))
        second = repository.create_or_get(self.descriptor("a" * 64))
        count = self.connection.execute("SELECT count(*) FROM rag_documents").fetchone()[0]

        self.assertEqual(first, second)
        self.assertEqual(count, 1)

    def test_prior_ready_version_retires_only_after_new_version_is_ready(self) -> None:
        repository = DocumentVersionRepository(self.connection)
        old_id = repository.create_or_get(self.descriptor("a" * 64))
        repository.mark_ready(old_id)
        new_id = repository.create_or_get(self.descriptor("b" * 64))

        before = self.connection.execute(
            "SELECT retired_at IS NULL FROM rag_documents WHERE id = %s", (old_id,)
        ).fetchone()[0]
        repository.mark_ready(new_id)
        after = self.connection.execute(
            "SELECT retired_at IS NOT NULL FROM rag_documents WHERE id = %s", (old_id,)
        ).fetchone()[0]

        self.assertTrue(before)
        self.assertTrue(after)


if __name__ == "__main__":
    unittest.main()
