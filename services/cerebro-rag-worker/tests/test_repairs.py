from __future__ import annotations

import unittest

from cerebro_rag.repair_indexer import repair_source_from_row
from cerebro_rag.repairs import (
    REPAIR_EXPORT_QUERY,
    REPAIR_SYNC_QUERY_WITHOUT_LEARNING,
    RepairSource,
    build_repair_content,
    has_useful_technical_content,
    is_verified_learning_record,
    sanitize_technical_text,
)


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
            learning_record=None,
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
            (1, "MAC-1", "Samsung", "A405FN", "No enciende", "PMIC", "", "Finalizado OK", ["Cambio"], ["U5002"], ["En proceso"], None)
        )
        self.assertEqual(source.repair_id, "1")
        self.assertEqual(source.observations, ("Cambio",))
        self.assertEqual(source.parts, ("U5002",))

    def test_removes_operational_events_from_technical_solution(self) -> None:
        source = RepairSource(
            repair_id="repair-2",
            ticket_number="MAC-2",
            brand="Apple",
            model="8",
            problem="No enciende",
            diagnosis="Falla de encendido",
            enriched_diagnosis="",
            observations=(
                "Reparación tomada por técnico",
                "Reparación cobrada en Venta #SALE-123",
                "Se reemplazó el flex de carga",
            ),
            parts=(),
            current_status="Finalizado OK",
            prior_statuses=(),
            learning_record=None,
        )

        content = build_repair_content(source)

        self.assertIn("DISPOSITIVO: APPLE IPHONE 8", content)
        self.assertIn("Se reemplazó el flex de carga", content)
        self.assertNotIn("tomada por técnico", content)
        self.assertNotIn("cobrada en Venta", content)

    def test_sync_query_only_exports_final_repair_statuses(self) -> None:
        self.assertIn('repair."statusId" IN (5, 6, 7, 10)', REPAIR_EXPORT_QUERY)

    def test_permission_fallback_keeps_repair_sync_without_learning_table(self) -> None:
        lowered = REPAIR_SYNC_QUERY_WITHOUT_LEARNING.lower()
        self.assertIn("null::jsonb as record", lowered)
        self.assertNotIn("repair_learning_records", lowered)
        self.assertIn("effective_updated_at", lowered)
        self.assertIn('repair."statusid" in (5, 6, 7, 10)', lowered)

    def test_skips_final_records_without_useful_technical_content(self) -> None:
        empty = RepairSource(
            repair_id="repair-empty",
            ticket_number="MAC-3",
            brand="Samsung",
            model="A12",
            problem="Revisar y presupuestar",
            diagnosis="",
            enriched_diagnosis="",
            observations=("Reparación cobrada en Venta #SALE-1",),
            parts=(),
            current_status="Finalizado OK",
            prior_statuses=(),
            learning_record=None,
        )
        self.assertFalse(has_useful_technical_content(empty))

    def test_rejects_administrative_notes_as_technical_content(self) -> None:
        administrative = RepairSource(
            repair_id="repair-admin",
            ticket_number="MAC-ADMIN",
            brand="Motorola",
            model="E7",
            problem="No enciende",
            diagnosis="No se dispone de repuestos necesarios para efectuar la reparación",
            enriched_diagnosis="",
            observations=("Cliente no autoriza la reparación", "No hay repuestos"),
            parts=(),
            current_status="Entregado",
            prior_statuses=("No Reparado",),
            learning_record=None,
        )
        self.assertFalse(has_useful_technical_content(administrative))

    def test_keeps_useful_observation_without_diagnosis(self) -> None:
        observation_only = RepairSource(
            repair_id="repair-observation",
            ticket_number="MAC-OBS",
            brand="Motorola",
            model="E7",
            problem="No enciende",
            diagnosis="",
            enriched_diagnosis="",
            observations=("Se reemplazó pin de carga y módulo; encendido verificado",),
            parts=("Pin de carga", "Módulo",),
            current_status="Finalizado OK",
            prior_statuses=("En proceso",),
            learning_record=None,
        )
        self.assertTrue(has_useful_technical_content(observation_only))
        self.assertIn("RESULTADO_ULTIMO_CICLO: REPAIRED", build_repair_content(observation_only))

    def test_structured_closure_is_serialized_as_evidence(self) -> None:
        source = RepairSource(
            repair_id="repair-structured",
            ticket_number="MAC-4",
            brand="Samsung",
            model="A405FN",
            problem="No da imagen",
            diagnosis="",
            enriched_diagnosis="",
            observations=(),
            parts=(),
            current_status="Finalizado OK",
            prior_statuses=(),
            learning_record={
                "symptom": "No da imagen luego de encender",
                "rootCause": "Filtro FL2201 abierto en la línea MIPI",
                "confirmingEvidence": "Continuidad abierta entre conector y FL2201",
                "intervention": "Se reemplazó FL2201",
                "verification": "Imagen estable y reinicios verificados",
                "affectedReferences": ["FL2201", "J2200"],
            },
        )

        content = build_repair_content(source)

        self.assertIn("CAUSA_CONFIRMADA: Filtro FL2201 abierto", content)
        self.assertIn("MEDICION_CONFIRMATORIA: Continuidad abierta", content)
        self.assertIn("REFERENCIAS_AFECTADAS: FL2201 | J2200", content)

    def test_stale_confirmed_learning_is_not_verified_without_golden_fields(self) -> None:
        self.assertFalse(is_verified_learning_record({
            "authority": "CONFIRMED_SUCCESS",
            "trainingEligible": True,
            "rootCause": "No determinada",
            "confirmingEvidence": "",
            "intervention": "Se revisó el equipo",
            "verification": "",
        }))

    def test_golden_learning_requires_review_and_complete_verification(self) -> None:
        self.assertTrue(is_verified_learning_record({
            "authority": "CONFIRMED_SUCCESS",
            "trainingEligible": True,
            "rootCause": "Filtro FL2201 abierto",
            "confirmingEvidence": "Sin continuidad a ambos lados de FL2201",
            "intervention": "Se reemplazó FL2201",
            "verification": "Imagen estable durante prueba funcional",
        }))

    def test_negated_closure_fields_are_not_golden_evidence(self) -> None:
        self.assertFalse(is_verified_learning_record({
            "authority": "CONFIRMED_SUCCESS",
            "trainingEligible": True,
            "rootCause": "Sin determinar",
            "confirmingEvidence": "No se realizó medición",
            "intervention": "Se revisó el equipo",
            "verification": "No se pudo verificar",
        }))


if __name__ == "__main__":
    unittest.main()
