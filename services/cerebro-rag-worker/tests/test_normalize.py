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


if __name__ == "__main__":
    unittest.main()
