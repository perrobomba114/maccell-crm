from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cerebro_rag.indexer import resolve_library_document, vector_literal


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


if __name__ == "__main__":
    unittest.main()
