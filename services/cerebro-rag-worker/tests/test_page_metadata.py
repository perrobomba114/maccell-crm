from __future__ import annotations

import unittest

from cerebro_rag.page_metadata import technical_page_metadata


class PageMetadataTest(unittest.TestCase):
    def test_extracts_section_subsystems_nets_and_components(self) -> None:
        metadata = technical_page_metadata(
            "POWER AND CHARGING\nPP_VDD_MAIN connects U3300 to C3301 and USB VBUS"
        )
        self.assertEqual(metadata["section"], "POWER AND CHARGING")
        self.assertIn("POWER", metadata["subsystems"])
        self.assertIn("CHARGING", metadata["subsystems"])
        self.assertIn("PP_VDD_MAIN", metadata["nets"])
        self.assertIn("U3300", metadata["components"])

    def test_marks_garbled_short_text_as_low_quality(self) -> None:
        metadata = technical_page_metadata("x @@ ## ?")
        self.assertEqual(metadata["extraction_quality"], "LOW")


if __name__ == "__main__":
    unittest.main()
