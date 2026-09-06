from __future__ import annotations

import unittest

from cerebro_rag.normalize import model_aliases, normalize_model


class DeviceIdentityTest(unittest.TestCase):
    def test_sm_a125m_and_galaxy_a12_share_only_declared_aliases(self) -> None:
        self.assertEqual(normalize_model("Samsung", "SM-A125M"), "SM-A125M")
        self.assertEqual(normalize_model("Samsung", "Galaxy A12"), "SM-A125M")
        self.assertEqual(model_aliases("SAMSUNG", "SM-A125M"), ("SM-A125M", "GALAXY A12", "A12"))

    def test_does_not_infer_unregistered_variant(self) -> None:
        self.assertEqual(normalize_model("Samsung", "SM-A125F"), "SM-A125F")
        self.assertEqual(model_aliases("SAMSUNG", "SM-A125F"), ("SM-A125F",))

    def test_motorola_g22_and_g13(self) -> None:
        self.assertEqual(normalize_model("MOTOROLA", "g22"), "MOTO G22")
        self.assertEqual(normalize_model("MOTOROLA", "XT2231"), "MOTO G22")
        aliases = model_aliases("MOTOROLA", "g22")
        self.assertIn("MOTO G22", aliases)
        self.assertIn("G22", aliases)
        self.assertIn("XT2231", aliases)

        self.assertEqual(normalize_model("MOTOROLA", "g13"), "MOTO G13")
        g13_aliases = model_aliases("MOTOROLA", "g13")
        self.assertIn("MOTO G13", g13_aliases)
        self.assertIn("G13", g13_aliases)
        self.assertIn("XT2335", g13_aliases)

    def test_samsung_a10_a22_a54(self) -> None:
        a10_aliases = model_aliases("SAMSUNG", "A10")
        self.assertIn("A10", a10_aliases)
        self.assertIn("GALAXY A10", a10_aliases)
        self.assertIn("SM-A105", a10_aliases)
        self.assertIn("SM-A105M", a10_aliases)

        a22_aliases = model_aliases("SAMSUNG", "A22")
        self.assertIn("A22", a22_aliases)
        self.assertIn("GALAXY A22", a22_aliases)
        self.assertIn("SM-A225M", a22_aliases)
        self.assertIn("SM-A226B", a22_aliases)

        a54_aliases = model_aliases("SAMSUNG", "A54")
        self.assertIn("A54", a54_aliases)
        self.assertIn("GALAXY A54", a54_aliases)
        self.assertIn("SM-A546B", a54_aliases)


if __name__ == "__main__":
    unittest.main()

