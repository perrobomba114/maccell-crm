from __future__ import annotations

import unittest

from cerebro_rag.pdf_extract import ExtractionMethod, choose_extraction_method


class PdfExtractionTest(unittest.TestCase):
    def test_uses_native_text_above_threshold(self) -> None:
        self.assertEqual(choose_extraction_method("A" * 41), ExtractionMethod.NATIVE)

    def test_uses_ocr_at_or_below_threshold(self) -> None:
        self.assertEqual(choose_extraction_method("A" * 40), ExtractionMethod.OCR)
        self.assertEqual(choose_extraction_method(""), ExtractionMethod.OCR)


if __name__ == "__main__":
    unittest.main()
