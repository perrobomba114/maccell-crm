from __future__ import annotations

import unittest
from pathlib import Path

from cerebro_rag.device_alias_catalog import aliases_from_pdf_path


class DeviceAliasCatalogTest(unittest.TestCase):
    def test_extracts_commercial_and_technical_samsung_names_from_real_layout(self) -> None:
        aliases = aliases_from_pdf_path(
            Path(
                "SAMSUNG/Serie A/SM-A125M Samsung Galaxy A12/"
                "SM-A125M_ESQUEMATICO COMPLETO.pdf"
            )
        )
        pairs = {(alias.canonical_model, alias.alias) for alias in aliases}

        self.assertIn(("SM-A125M", "GALAXY A12"), pairs)
        self.assertIn(("SM-A125M", "A12"), pairs)

    def test_keeps_multiple_declared_variants_under_the_same_commercial_family(self) -> None:
        aliases = aliases_from_pdf_path(
            Path(
                "SAMSUNG/Serie Z/SM-F926W Samsung Galaxy Z Fold 3/"
                "SM-F926B_QCOM_ESQUEMATICO COMPLETO.pdf"
            )
        )
        pairs = {(alias.canonical_model, alias.alias) for alias in aliases}

        self.assertIn(("SM-F926W", "GALAXY Z FOLD 3"), pairs)
        self.assertIn(("SM-F926B", "GALAXY Z FOLD 3"), pairs)

    def test_links_motorola_xt_code_to_commercial_model_from_the_same_path(self) -> None:
        aliases = aliases_from_pdf_path(
            Path("Motorola /Motorola G20/Esquematico XT2128-2 (Moto G20).pdf")
        )
        pairs = {(alias.canonical_model, alias.alias) for alias in aliases}

        self.assertIn(("XT2128", "MOTO G20"), pairs)
        self.assertIn(("XT2128", "G20"), pairs)

    def test_does_not_link_a_misfiled_different_board_to_the_folder_model(self) -> None:
        aliases = aliases_from_pdf_path(
            Path(
                "SAMSUNG/Serie S/Samsung Galaxy S20 FE SM-G780F/Manual/"
                "SM-G980F Troubleshooting.pdf"
            )
        )
        pairs = {(alias.canonical_model, alias.alias) for alias in aliases}

        self.assertIn(("SM-G780F", "GALAXY S20 FE"), pairs)
        self.assertNotIn(("SM-G980F", "GALAXY S20 FE"), pairs)

    def test_extracts_real_samsung_a54_and_a10_folder_aliases(self) -> None:
        a54_aliases = aliases_from_pdf_path(
            Path("Samsung/Samsung A54 5G SM-A546B/Pdf/Sm-a546b_esquematico completo.pdf")
        )
        a54_pairs = {(alias.canonical_model, alias.alias) for alias in a54_aliases}
        self.assertIn(("SM-A546B", "A54 5G"), a54_pairs)
        self.assertIn(("SM-A546B", "GALAXY A54 5G"), a54_pairs)

        a10_aliases = aliases_from_pdf_path(
            Path("Samsung/Samsung A10 SM-A105M/Pdf/Sm-a105m esquematico completo.pdf")
        )
        a10_pairs = {(alias.canonical_model, alias.alias) for alias in a10_aliases}
        self.assertIn(("SM-A105M", "A10"), a10_pairs)

    def test_extracts_real_motorola_g22_and_lg_g4_aliases(self) -> None:
        g22_aliases = aliases_from_pdf_path(
            Path("Motorola/Moto g22/Pdf/Esquematico completo xt2231-x (moto g22).pdf")
        )
        g22_pairs = {(alias.canonical_model, alias.alias) for alias in g22_aliases}
        self.assertIn(("XT2231", "MOTO G22"), g22_pairs)
        self.assertIn(("XT2231", "G22"), g22_pairs)

        g4_aliases = aliases_from_pdf_path(
            Path("Lg/H815.h818 (g4).pdf")
        )
        g4_pairs = {(alias.canonical_model, alias.alias) for alias in g4_aliases}
        self.assertIn(("H815", "G4"), g4_pairs)
        self.assertIn(("H818", "G4"), g4_pairs)


if __name__ == "__main__":
    unittest.main()

