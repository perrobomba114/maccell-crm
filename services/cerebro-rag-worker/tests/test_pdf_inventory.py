from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cerebro_rag.pdf_inventory import parse_pdf_identity, sha256_file


class PdfInventoryTest(unittest.TestCase):
    def test_parses_samsung_manual_path(self) -> None:
        identity = parse_pdf_identity(
            Path("SAMSUNG/Serie A/SM-A405FN/SM-A405FN_Manual de Servicio.pdf")
        )
        self.assertEqual(identity.brand, "SAMSUNG")
        self.assertEqual(identity.model, "SM-A405FN")
        self.assertEqual(identity.document_type, "SERVICE_MANUAL")

    def test_parses_motorola_schematic_path(self) -> None:
        identity = parse_pdf_identity(
            Path("Motorola /Moto Z/Moto Z4/Esquematico completo XT1980 (Moto Z4).pdf")
        )
        self.assertEqual(identity.brand, "MOTOROLA")
        self.assertEqual(identity.model, "XT1980")
        self.assertEqual(identity.document_type, "SCHEMATIC")

    def test_parses_iphone_model_as_apple(self) -> None:
        identity = parse_pdf_identity(Path("iPhone/iPhone 11 Pro Max/iPhone 11 Pro Max.pdf"))
        self.assertEqual(identity.brand, "APPLE")
        self.assertEqual(identity.model, "IPHONE 11 PRO MAX")

    def test_hash_is_stable_for_identical_content(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "one.pdf"
            second = Path(directory) / "two.pdf"
            first.write_bytes(b"same-pdf-content")
            second.write_bytes(b"same-pdf-content")
            self.assertEqual(sha256_file(first), sha256_file(second))


if __name__ == "__main__":
    unittest.main()
