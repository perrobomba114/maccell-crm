from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cerebro_rag.indexer import build_document_chunks, resolve_library_document, vector_literal
from cerebro_rag.pdf_extract import ExtractedPage, ExtractionMethod


class IndexerHelpersTest(unittest.TestCase):
    def test_formats_pgvector_without_scientific_metadata(self) -> None:
        self.assertEqual(vector_literal((0.5, -0.25)), "[0.5,-0.25]")

    def test_resolves_documents_only_inside_library(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            document = root / "Samsung" / "manual.pdf"
            document.parent.mkdir()
            document.write_bytes(b"pdf")
            self.assertEqual(resolve_library_document(root, "Samsung/manual.pdf"), document.resolve())
            with self.assertRaises(ValueError):
                resolve_library_document(root, "../outside.pdf")

    def test_creates_retrievable_placeholders_for_visual_only_document(self) -> None:
        pages = (
            ExtractedPage(1, "", ExtractionMethod.OCR, Path("page-0001.png")),
            ExtractedPage(2, "", ExtractionMethod.OCR, Path("page-0002.png")),
        )

        chunks = build_document_chunks("doc-visual", pages)

        self.assertEqual([chunk.page_number for chunk in chunks], [1, 2])
        self.assertTrue(all(0 < chunk.token_count for chunk in chunks))
        self.assertTrue(all(len(chunk.content) < 80 for chunk in chunks))

    def test_does_not_add_visual_placeholders_when_document_has_text(self) -> None:
        pages = (
            ExtractedPage(1, "PMIC power sequence troubleshooting", ExtractionMethod.NATIVE, None),
            ExtractedPage(2, "", ExtractionMethod.OCR, Path("page-0002.png")),
        )

        chunks = build_document_chunks("doc-text", pages)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].page_number, 1)


if __name__ == "__main__":
    unittest.main()
