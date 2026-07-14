from __future__ import annotations

import unittest

from cerebro_rag.repair_indexer import repair_source_from_row
from cerebro_rag.repairs import REPAIR_EXPORT_QUERY, RepairSource, build_repair_content, sanitize_technical_text


class RepairReconstructionTest(unittest.TestCase):
    def test_sanitizer_removes_prices_email_and_argentine_phone(self) -> None:
        source = "Cambiar U5002 cuesta $ 35.000. Avisar a tecnico@example.com o +54 9 11 5555-1234"
        sanitized = sanitize_technical_text(source)

        self.assertIn("U5002", sanitized)
        self.assertNotIn("35.000", sanitized)
        self.assertNotIn("@", sanitized)
        self.assertNotIn("5555-1234", sanitized)

    def test_content_contains_only_canonical_technical_sections(self) -> None:
        source = RepairSource(
            repair_id="repair-1",
            ticket_number="MAC-1",
            brand="Samsung",
            model="A405FN",
            problem="No enciende",
            diagnosis="Consumo fijo en fuente",
            enriched_diagnosis="Medir U5002",
            observations=("Se reemplazo U5002",),
            parts=("IC PMIC",),
            current_status="Finalizado OK",
            prior_statuses=("En proceso",),
        )

        content = build_repair_content(source)

        self.assertIn("DISPOSITIVO: SAMSUNG SM-A405FN", content)
        self.assertIn("PROBLEMA: No enciende", content)
        self.assertIn("DIAGNOSTICO: Consumo fijo en fuente", content)
        self.assertIn("SOLUCION: Se reemplazo U5002", content)
        self.assertIn("REPUESTOS: IC PMIC", content)
        self.assertNotIn("CLIENTE", content)
        self.assertNotIn("PRECIO", content)

    def test_export_query_is_set_based_and_excludes_sensitive_columns(self) -> None:
        lowered = REPAIR_EXPORT_QUERY.lower()
        self.assertIn("jsonb_agg", lowered)
        self.assertIn("repair_status_history", lowered)
        self.assertNotIn("customer", lowered)
        self.assertNotIn("estimatedprice", lowered)
        self.assertNotIn("estimated_price", lowered)

    def test_maps_export_row_without_customer_or_financial_data(self) -> None:
        source = repair_source_from_row(
            (1, "MAC-1", "Samsung", "A405FN", "No enciende", "PMIC", "", "Finalizado OK", ["Cambio"], ["U5002"], ["En proceso"])
        )
        self.assertEqual(source.repair_id, "1")
        self.assertEqual(source.observations, ("Cambio",))
        self.assertEqual(source.parts, ("U5002",))


if __name__ == "__main__":
    unittest.main()
