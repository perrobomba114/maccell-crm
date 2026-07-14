from __future__ import annotations

import unittest

from cerebro_rag.chunking import chunk_page, embedding_projection, extract_component_codes


class PageChunkingTest(unittest.TestCase):
    def test_chunks_at_700_tokens_with_100_token_overlap(self) -> None:
        text = " ".join(f"word-{index}" for index in range(900))
        chunks = chunk_page(document_id="doc-1", page_number=7, text=text)

        self.assertEqual(len(chunks), 2)
        self.assertTrue(all(chunk.page_number == 7 for chunk in chunks))
        self.assertTrue(all(chunk.document_id == "doc-1" for chunk in chunks))
        self.assertLessEqual(max(chunk.token_count for chunk in chunks), 700)
        first_words = chunks[0].content.split()
        second_words = chunks[1].content.split()
        self.assertEqual(first_words[-100:], second_words[:100])

    def test_extracts_unique_component_codes(self) -> None:
        self.assertEqual(
            extract_component_codes("Medir U5002, R5017, TP4003 y luego U5002."),
            ("R5017", "TP4003", "U5002"),
        )

    def test_embedding_projection_is_bounded_and_preserves_diagnostic_terms(self) -> None:
        content = " ".join(f"word-{index}" for index in range(900))

        projection = embedding_projection(
            context="APPLE IPHONE 8 SCHEMATIC PAGE 7",
            content=content,
            component_codes=("C1234", "U5002"),
        )

        words = projection.split()
        self.assertLessEqual(len(words), 448)
        self.assertIn("APPLE", words)
        self.assertIn("C1234", words)
        self.assertIn("U5002", words)
        self.assertIn("word-0", words)
        self.assertIn("word-899", words)


if __name__ == "__main__":
    unittest.main()
