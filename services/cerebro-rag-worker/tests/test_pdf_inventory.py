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

    def test_parses_iphone13_repair_cases(self) -> None:
        charging = parse_pdf_identity(
            Path("pdf/iPhone(VIP)/iPhone13Pro/Repair Case/IPhone 13 Pro not charging fault.pdf")
        )
        self.assertEqual(charging.brand, "APPLE")
        self.assertEqual(charging.model, "IPHONE 13 PRO")
        self.assertEqual(charging.document_type, "REPAIR_CASE")

        screen = parse_pdf_identity(
            Path("pdf/iPhone(VIP)/iPhone13ProMAX/Repair Case/IPhone 13 ProMax screen failure.pdf")
        )
        self.assertEqual(screen.brand, "APPLE")
        self.assertEqual(screen.model, "IPHONE 13 PRO MAX")
        self.assertEqual(screen.document_type, "REPAIR_CASE")

    def test_parses_samsung_sources_path(self) -> None:
        schematic = parse_pdf_identity(
            Path("Samsung A06 SM-A065F/Pdf/SM-A065F_MTK_Common_Service_Schematic_240801.pdf")
        )
        self.assertEqual(schematic.brand, "SAMSUNG")
        self.assertEqual(schematic.model, "SM-A065F")
        self.assertEqual(schematic.document_type, "SCHEMATIC")

    def test_parses_samsung_sm_a037m_backlight_path(self) -> None:
        backlight = parse_pdf_identity(
            Path("Samsung/Samsung A03s SM-A037M/Pdf/Sm-a037 lineas de backlight.pdf")
        )
        self.assertEqual(backlight.brand, "SAMSUNG")
        self.assertEqual(backlight.model, "SM-A037")
        self.assertEqual(backlight.document_type, "SCHEMATIC")

        troubleshooting = parse_pdf_identity(
            Path("Samsung/Samsung A03s SM-A037M/Pdf/Sm-a037m_troubleshooting.pdf")
        )
        self.assertEqual(troubleshooting.brand, "SAMSUNG")
        self.assertEqual(troubleshooting.model, "SM-A037M")
        self.assertEqual(troubleshooting.document_type, "SERVICE_MANUAL")

    def test_parses_iphone17_promax_path(self) -> None:
        image = parse_pdf_identity(
            Path("Iphone/Iphone 17 pro max/Pdf/Iphone17promax image.pdf")
        )
        self.assertEqual(image.brand, "APPLE")
        self.assertEqual(image.model, "IPHONE 17 PRO MAX")
        self.assertEqual(image.document_type, "TECHNICAL_DOCUMENT")

    def test_parses_moto_g13_without_xt_in_filename(self) -> None:
        identity = parse_pdf_identity(
            Path("Motorola/Moto g13/Pdf/Manual de servicio.pdf")
        )
        self.assertEqual(identity.brand, "MOTOROLA")
        self.assertEqual(identity.model, "MOTO G13")

    def test_parses_huawei_honor_10_lite(self) -> None:
        identity = parse_pdf_identity(
            Path("Huawei/Honor 10 lite/Pdf/Honor 10 lite schematic.pdf")
        )
        self.assertEqual(identity.brand, "HUAWEI")
        self.assertEqual(identity.model, "HONOR 10 LITE")

    def test_parses_lg_k40s_and_chassis_codes(self) -> None:
        k40 = parse_pdf_identity(
            Path("Lg/K40s/Pdf/K40s schematics.pdf")
        )
        self.assertEqual(k40.brand, "LG")
        self.assertEqual(k40.model, "LG K40S")

        g4 = parse_pdf_identity(
            Path("Lg/H815.h818 (g4).pdf")
        )
        self.assertEqual(g4.brand, "LG")
        self.assertEqual(g4.model, "LG G4")


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


def test_console_brands_under_pdf_root_and_document_subfolders():
    from pathlib import Path
    from cerebro_rag.pdf_inventory import parse_pdf_identity
    for path, brand, model in [
        ('pdf/Nintendo/SWITCH2/Schematic and boardview/schematic.pdf', 'NINTENDO', 'SWITCH2'),
        ('pdf/SONY/PS5/schematic.pdf', 'SONY', 'PS5'),
        ('pdf/XBOX/Xbox Series S/Repair Case/case.pdf', 'XBOX', 'XBOX SERIES S'),
    ]:
        result = parse_pdf_identity(Path(path))
        assert result.brand == brand
        assert result.model == model


def test_inventory_excludes_staging_backups_and_directories_with_pdf_suffix(tmp_path):
    from cerebro_rag.pdf_inventory import published_pdf_paths
    for name in ['pdf/Nintendo/Switch/valid.pdf', '.incoming-scraping/test.pdf', 'Backups/old.pdf']:
        p = tmp_path / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b'%PDF-1.7')
    (tmp_path / 'folder.pdf').mkdir()
    assert [p.relative_to(tmp_path).as_posix() for p in published_pdf_paths(tmp_path)] == ['pdf/Nintendo/Switch/valid.pdf']
