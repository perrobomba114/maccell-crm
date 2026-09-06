from __future__ import annotations

import unittest
from cerebro_rag.lexicon import translate_technical_term, expand_technical_lexicon


class TestLexicon(unittest.TestCase):
    def test_translate_technical_term(self):
        self.assertEqual(
            translate_technical_term("tail plug"),
            "flex de pin de carga / subplaca de carga",
        )
        self.assertEqual(
            translate_technical_term("insurance resistance"),
            "resistencia fusible / fusible de protección de paso",
        )
        self.assertEqual(
            translate_technical_term("flying wire"),
            "puente / micro-jumper con hilo de cobre esmaltado",
        )
        self.assertEqual(
            translate_technical_term("middle layer"),
            "capa intermedia (interposer) / arrastre de estaño en placa sándwich",
        )

    def test_expand_technical_lexicon(self):
        expanded = expand_technical_lexicon("iPhone 13 pro no carga con tail plug")
        self.assertIn("VBUS", expanded)
        self.assertIn("PUERTO DE CARGA", expanded)
        self.assertIn("SUBPLACA", expanded)

        bl_expanded = expand_technical_lexicon("pantalla sin backlight")
        self.assertIn("ANODO", bl_expanded)
        self.assertIn("CATODO", bl_expanded)
        self.assertIn("VLED", bl_expanded)


if __name__ == "__main__":
    unittest.main()
