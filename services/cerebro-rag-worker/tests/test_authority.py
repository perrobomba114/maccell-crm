from __future__ import annotations

import unittest

from cerebro_rag.authority import Authority, classify_authority


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


if __name__ == "__main__":
    unittest.main()
