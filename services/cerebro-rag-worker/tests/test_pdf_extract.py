from __future__ import annotations

import unittest

import cerebro_rag.pdf_extract as pdf_extract
from cerebro_rag.pdf_extract import (
    ExtractionMethod,
    choose_extraction_method,
    sanitize_extracted_text,
)


class PdfExtractionTest(unittest.TestCase):
    def test_uses_native_text_above_threshold(self) -> None:
        self.assertEqual(choose_extraction_method("A" * 41), ExtractionMethod.NATIVE)

    def test_uses_ocr_at_or_below_threshold(self) -> None:
        self.assertEqual(choose_extraction_method("A" * 40), ExtractionMethod.OCR)
        self.assertEqual(choose_extraction_method(""), ExtractionMethod.OCR)

    def test_only_renders_pages_that_require_ocr_during_ingestion(self) -> None:
        should_render = getattr(pdf_extract, "render_during_ingestion", lambda _: True)

        self.assertFalse(should_render(ExtractionMethod.NATIVE))
        self.assertTrue(should_render(ExtractionMethod.OCR))

    def test_removes_postgres_incompatible_null_bytes(self) -> None:
        self.assertEqual(
            sanitize_extracted_text("PP_VDD_MAIN\x00 PMIC\x00\n"),
            "PP_VDD_MAIN PMIC\n",
        )


if __name__ == "__main__":
    unittest.main()
