from __future__ import annotations

import unittest

from cerebro_rag.authority import Authority, RepairOutcome, classify_authority, latest_repair_outcome


class AuthorityTest(unittest.TestCase):
    def test_reviewed_structured_closure_is_confirmed_success(self) -> None:
        self.assertEqual(
            classify_authority("Finalizado OK", [], "reemplazo confirmado", "CONFIRMED_SUCCESS"),
            Authority.CONFIRMED_SUCCESS,
        )

    def test_status_alone_is_not_confirmed_success(self) -> None:
        self.assertEqual(
            classify_authority("Entregado", ["En proceso", "Finalizado OK"], "equipo probado", None),
            Authority.INCOMPLETE,
        )

    def test_no_reparado_is_failed(self) -> None:
        self.assertEqual(
            classify_authority("No Reparado", [], "placa sin solucion", None),
            Authority.FAILED,
        )

    def test_paused_or_missing_diagnosis_is_incomplete(self) -> None:
        self.assertEqual(classify_authority("Pausado", [], "espera repuesto", None), Authority.INCOMPLETE)
        self.assertEqual(classify_authority("Finalizado OK", [], "", None), Authority.INCOMPLETE)

    def test_delivery_after_no_repair_keeps_failed_technical_outcome(self) -> None:
        self.assertEqual(
            latest_repair_outcome("Entregado", ["En proceso", "No Reparado"]),
            RepairOutcome.UNREPAIRED,
        )

    def test_reopened_repair_uses_latest_successful_technical_cycle(self) -> None:
        self.assertEqual(
            latest_repair_outcome(
                "Entregado",
                ["No Reparado", "Pendiente", "En proceso", "Finalizado OK"],
            ),
            RepairOutcome.REPAIRED,
        )

    def test_reopening_without_a_new_technical_close_invalidates_old_success(self) -> None:
        self.assertEqual(
            latest_repair_outcome(
                "Entregado",
                ["Finalizado OK", "Pendiente", "En proceso"],
            ),
            RepairOutcome.UNKNOWN,
        )


if __name__ == "__main__":
    unittest.main()
