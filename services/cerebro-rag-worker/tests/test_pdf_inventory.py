from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cerebro_rag.pdf_inventory import iter_pdf_inventory, parse_pdf_identity, sha256_file


class PdfInventoryTest(unittest.TestCase):
    def test_parses_samsung_manual_path(self) -> None:
        identity = parse_pdf_identity(
            Path("SAMSUNG/Serie A/SM-A405FN/SM-A405FN_Manual de Servicio.pdf")
        )
        self.assertEqual(identity.brand, "SAMSUNG")
        self.assertEqual(identity.model, "SM-A405FN")
        self.assertEqual(identity.document_type, "SERVICE_MANUAL")

    def test_prefers_exact_filename_variant_over_parent_family_model(self) -> None:
        identity = parse_pdf_identity(
            Path(
                "SAMSUNG/Serie A/Nuevos/Samsung Galaxy A40 SM-A405F/Manual de servicio/"
                "SM-A405FN_Manual de Servicio.pdf"
            )
        )
        self.assertEqual(identity.model, "SM-A405FN")

    def test_prefers_filename_board_variant_when_folder_uses_another_market_code(self) -> None:
        identity = parse_pdf_identity(
            Path(
                "SAMSUNG/Serie Z/SM-F926W Samsung Galaxy Z Fold 3/"
                "SM-F926B_QCOM_ESQUEMATICO COMPLETO.pdf"
            )
        )
        self.assertEqual(identity.model, "SM-F926B")

    def test_parses_legacy_gt_samsung_codes(self) -> None:
        identity = parse_pdf_identity(
            Path("SAMSUNG/Serie S/Samsung Galaxy S4 GT-I9500/GT-I9500 Schematic.pdf")
        )
        self.assertEqual(identity.model, "GT-I9500")

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

    def test_inventory_shards_are_complete_and_do_not_overlap(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index in range(7):
                (root / f"model-{index}.pdf").write_bytes(f"pdf-{index}".encode())

            shards = [
                list(iter_pdf_inventory(root, shard_index=index, shard_count=3))
                for index in range(3)
            ]
            paths = [[entry.relative_path for entry in shard] for shard in shards]

            self.assertEqual(sum(map(len, paths)), 7)
            self.assertEqual(len(set().union(*(set(path) for path in paths))), 7)

    def test_inventory_accepts_pdf_extensions_case_insensitively(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "manual.PDF").write_bytes(b"uppercase-pdf")
            (root / "schematic.PdF").write_bytes(b"mixed-case-pdf")

            paths = {entry.relative_path.name for entry in iter_pdf_inventory(root)}

            self.assertEqual(paths, {"manual.PDF", "schematic.PdF"})


if __name__ == "__main__":
    unittest.main()
