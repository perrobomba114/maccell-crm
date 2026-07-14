from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cerebro_rag.page_renderer import resolve_cached_page


class PageRendererTest(unittest.TestCase):
    def test_accepts_an_existing_png_inside_cache(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "hash" / "page-0001.png"
            image.parent.mkdir()
            image.write_bytes(b"png")

            self.assertEqual(resolve_cached_page(root, image), image.resolve())

    def test_rejects_a_path_outside_cache(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "cache"
            root.mkdir()
            outside = Path(directory) / "page.png"
            outside.write_bytes(b"png")

            with self.assertRaises(ValueError):
                resolve_cached_page(root, outside)


if __name__ == "__main__":
    unittest.main()
