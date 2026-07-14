from __future__ import annotations

import unittest

import cerebro_rag.page_metadata as page_metadata
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

    def test_structures_manufacturer_troubleshooting_flow(self) -> None:
        metadata = technical_page_metadata(
            """Confidential and proprietary
8. Level 3 Repair
8-4-1. Power On
Mobile phone does not power on.
Check the Battery Voltage. Is it more than 3.8V?
Check the voltage level at R3008 while pressing power key.
Check the signal of TRST_N = 1.8V
L5001 > 0.75V, L5004 > 1.35V, L5006 > 2.0V
Check the Clock OSC2000. Frequency is 26MHz
Replace the U5000 or the PBA if the voltage is abnormal.
"""
        )

        self.assertEqual(metadata["section"], "Power On")
        self.assertEqual(metadata["procedure_type"], "TROUBLESHOOTING")
        self.assertIn("POWER", metadata["subsystems"])
        self.assertIn("Check the Battery Voltage. Is it more than 3.8V?", metadata["actions"])
        self.assertIn("TRST_N = 1.8V", metadata["expected_values"])
        self.assertIn("Frequency is 26MHz", metadata["expected_values"])

    def test_embedding_context_contains_structured_repair_procedure(self) -> None:
        metadata = technical_page_metadata(
            "8-4-1. Power On\nCheck TRST_N = 1.8V\nFrequency is 26MHz"
        )
        context = metadata.get("embedding_context", "")

        self.assertIn("SECTION Power On", context)
        self.assertIn("PROCEDURE TROUBLESHOOTING", context)
        self.assertIn("TRST_N = 1.8V", context)

    def test_only_skips_documents_indexed_with_current_technical_schema(self) -> None:
        checker = getattr(page_metadata, "document_metadata_current", lambda *_: False)
        version = getattr(page_metadata, "INDEX_SCHEMA_VERSION", "missing")

        self.assertTrue(checker("READY", version))
        self.assertFalse(checker("READY", "page-text-v1"))
        self.assertFalse(checker("PENDING", version))


if __name__ == "__main__":
    unittest.main()
