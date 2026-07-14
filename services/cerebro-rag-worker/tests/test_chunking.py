from __future__ import annotations

import unittest

from cerebro_rag.chunking import chunk_page, extract_component_codes


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


if __name__ == "__main__":
    unittest.main()
