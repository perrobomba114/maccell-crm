import hashlib
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from hermes_comics_reconcile import (  # noqa: E402
    apply_reconciliation,
    build_reconciliation,
    build_reconciliation_from_inventory,
    collect_buffer_inventory,
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class ReconciliationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.db_path = self.base / "catalog.sqlite"
        self.comics_root = self.base / "COMICS"
        self.buffer_root = self.base / "buffer"
        self.comics_root.mkdir()
        self.buffer_root.mkdir()
        self._create_schema()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _create_schema(self) -> None:
        with sqlite3.connect(self.db_path) as db:
            db.executescript(
                """
                CREATE TABLE comic_request_items (
                    item_id TEXT PRIMARY KEY,
                    series_title TEXT NOT NULL,
                    series_year INTEGER,
                    volume TEXT,
                    issue_label TEXT NOT NULL,
                    issue_start TEXT,
                    issue_end TEXT,
                    current_status TEXT NOT NULL,
                    canonical_destination TEXT,
                    workflow_status TEXT NOT NULL,
                    last_error TEXT,
                    last_transition_at TEXT,
                    updated_at TEXT NOT NULL,
                    download_attempts INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE files (
                    record_id TEXT PRIMARY KEY,
                    universe TEXT NOT NULL,
                    official_series_title TEXT NOT NULL,
                    series_start_year INTEGER,
                    volume TEXT NOT NULL,
                    issue_number TEXT NOT NULL,
                    variant TEXT NOT NULL,
                    publication_date TEXT NOT NULL,
                    edition_language TEXT NOT NULL,
                    file_format TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    sha256 TEXT NOT NULL,
                    canonical_path TEXT NOT NULL UNIQUE,
                    verification_status TEXT NOT NULL,
                    official_source_url TEXT NOT NULL,
                    recovery_origin TEXT NOT NULL,
                    download_status TEXT NOT NULL,
                    location_status TEXT NOT NULL,
                    metadata_status TEXT NOT NULL,
                    last_verified_at TEXT
                );
                """
            )

    def _insert_request(self, item_id: str = "request-100", issue: str = "100") -> None:
        with sqlite3.connect(self.db_path) as db:
            db.execute(
                """
                INSERT INTO comic_request_items (
                    item_id, series_title, series_year, volume, issue_label,
                    issue_start, issue_end, current_status, canonical_destination,
                    workflow_status, updated_at
                ) VALUES (?, 'Fantastic Four', 1961, NULL, ?, ?, NULL,
                          'faltante', '01 - TIERRA-616/1961.900 - Series regulares/1961 - Fantastic Four (1961-1996)',
                          'needs_download', '2026-08-28T00:00:00+00:00')
                """,
                (item_id, issue, issue),
            )

    def _insert_file(
        self,
        content: bytes,
        *,
        path: str = (
            "01 - TIERRA-616\\1970.900 - Series regulares\\"
            "1970 - Fantastic Four (1961-1996)\\Vol. 01\\"
            "Fantastic Four Vol.1\\01000 - Fantastic Four Vol.1 #100.cbr"
        ),
        complete_metadata: bool = False,
    ) -> str:
        physical = self.comics_root / Path(path.replace("\\", "/"))
        physical.parent.mkdir(parents=True, exist_ok=True)
        physical.write_bytes(content)
        sha = digest(content)
        verified = "VERIFIED" if complete_metadata else "UNVERIFIED"
        with sqlite3.connect(self.db_path) as db:
            db.execute(
                """
                INSERT INTO files VALUES (
                    ?, '01 - TIERRA-616', ?, ?, ?, ?, 'standard', ?, 'es',
                    'cbr', ?, ?, ?, ?, ?, 'telegram', 'downloaded', 'located', ?, NULL
                )
                """,
                (
                    sha,
                    "Fantastic Four" if complete_metadata else "UNVERIFIED",
                    1961 if complete_metadata else None,
                    "1" if complete_metadata else "UNVERIFIED",
                    "100" if complete_metadata else "UNVERIFIED",
                    "1970-01-01" if complete_metadata else "UNVERIFIED",
                    len(content),
                    sha,
                    path,
                    verified,
                    "https://example.invalid/100" if complete_metadata else "UNVERIFIED",
                    "complete" if complete_metadata else "needs_metadata",
                ),
            )
        return sha

    def _write_buffer(self, content: bytes, suffix: str = "") -> Path:
        path = self.buffer_root / f"Fantastic Four Vol. 1 #100{suffix} [CRG] @Comicverso.cbr"
        path.write_bytes(content)
        return path

    def test_exact_buffer_catalog_and_physical_match_becomes_located(self) -> None:
        """Catches a regression that leaves a physically satisfied request downloadable."""
        content = b"Rar!exact-issue-100"
        self._insert_request()
        sha = self._insert_file(content)
        self._write_buffer(content)

        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        self.assertEqual(manifest["transitions"], [{
            "request_id": "request-100",
            "from_status": "needs_download",
            "to_status": "located",
            "file_record_id": sha,
            "sha256": sha,
            "canonical_path": (
                "01 - TIERRA-616\\1970.900 - Series regulares\\"
                "1970 - Fantastic Four (1961-1996)\\Vol. 01\\"
                "Fantastic Four Vol.1\\01000 - Fantastic Four Vol.1 #100.cbr"
            ),
            "reason": "exact_buffer_hash_catalog_physical_match_metadata_incomplete",
        }])

    def test_complete_metadata_allows_complete_transition(self) -> None:
        """Catches a regression that ignores verified editorial metadata."""
        content = b"Rar!complete-issue-100"
        self._insert_request()
        self._insert_file(content, complete_metadata=True)
        self._write_buffer(content)

        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        self.assertEqual(manifest["transitions"][0]["to_status"], "complete")

    def test_precomputed_buffer_inventory_supports_remote_physical_verification(self) -> None:
        """Catches requiring the Telegram buffer on the COMICS filesystem host."""
        content = b"Rar!remote-inventory"
        self._insert_request()
        sha = self._insert_file(content)
        inventory = [{
            "name": "Fantastic Four Vol. 1 #100 [CRG] @Comicverso.cbr",
            "size": len(content),
            "sha256": sha,
            "valid_signature": True,
        }]

        manifest = build_reconciliation_from_inventory(
            self.db_path, self.comics_root, inventory
        )

        self.assertEqual(manifest["transitions"][0]["to_status"], "located")

    def test_inventory_keeps_unparsed_and_invalid_media_visible(self) -> None:
        """Catches silently dropping multipart or corrupt media from the audit."""
        good = self.buffer_root / "Fantastic Four Vol. 1 #100.cbr"
        multipart = self.buffer_root / "4 fantasticos.part01.rar"
        invalid = self.buffer_root / "Unknown Comic.cbz"
        good.write_bytes(b"Rar!good")
        multipart.write_bytes(b"Rar!part")
        invalid.write_bytes(b"not-a-zip")

        inventory = collect_buffer_inventory(self.buffer_root)

        by_name = {row["name"]: row for row in inventory}
        self.assertEqual(len(inventory), 3)
        self.assertEqual(by_name[good.name]["series_key"], "fantastic four")
        self.assertIsNone(by_name[multipart.name]["issue_key"])
        self.assertFalse(by_name[invalid.name]["valid_signature"])

    def test_different_hash_candidates_are_not_transitioned(self) -> None:
        """Catches a regression that chooses one of two conflicting archives."""
        self._insert_request()
        self._insert_file(b"Rar!catalog-a")
        self._write_buffer(b"Rar!catalog-a")
        other = self._write_buffer(b"Rar!buffer-b", " alternate")
        self.assertTrue(other.exists())

        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        self.assertEqual(manifest["transitions"], [])
        self.assertEqual(manifest["blocked"][0]["reason"], "ambiguous_buffer_hashes")

    def test_missing_physical_catalog_file_is_not_transitioned(self) -> None:
        """Catches a regression that trusts SQLite without physical evidence."""
        content = b"Rar!missing-physical"
        self._insert_request()
        self._insert_file(content)
        self._write_buffer(content)
        for path in self.comics_root.rglob("*.cbr"):
            path.unlink()

        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        self.assertEqual(manifest["transitions"], [])
        self.assertEqual(manifest["blocked"][0]["reason"], "catalog_file_missing")

    def test_same_title_and_issue_from_different_series_year_is_blocked(self) -> None:
        """Catches linking Daredevil (1964) #26 to Daredevil (2015) #26."""
        content = b"Rar!wrong-series-year"
        with sqlite3.connect(self.db_path) as db:
            db.execute(
                """
                INSERT INTO comic_request_items (
                    item_id, series_title, series_year, volume, issue_label,
                    issue_start, issue_end, current_status, canonical_destination,
                    workflow_status, updated_at
                ) VALUES ('dd-1964-26', 'Daredevil', 1964, NULL, '26', '26', NULL,
                          'faltante', '01 - TIERRA-616/1964 - Daredevil',
                          'needs_download', '2026-08-28T00:00:00+00:00')
                """
            )
        self._insert_file(
            content,
            path=(
                "90 - MATERIAL NO CRONOLOGICO\\01 - EDICIONES EN ESPAÑOL\\"
                "Ediciones de España\\Daredevil (2015-2018) Vol. 5\\"
                "0026 - Daredevil (2015) #026.cbr"
            ),
        )
        (self.buffer_root / "Daredevil Vol. 5 #26 [TheLAX] @Comicverso.cbr").write_bytes(content)

        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        self.assertEqual(manifest["transitions"], [])
        self.assertEqual(manifest["blocked"][0]["reason"], "series_year_mismatch")

    def test_apply_rejects_changed_database_fingerprint(self) -> None:
        """Catches applying a stale manifest to a changed production database."""
        content = b"Rar!fingerprint"
        self._insert_request()
        self._insert_file(content)
        self._write_buffer(content)
        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)
        with sqlite3.connect(self.db_path) as db:
            db.execute(
                "UPDATE comic_request_items SET download_attempts = 9 WHERE item_id = 'request-100'"
            )

        with self.assertRaisesRegex(RuntimeError, "database fingerprint changed"):
            apply_reconciliation(self.db_path, manifest)

    def test_apply_updates_only_manifested_request(self) -> None:
        """Catches broad SQL updates that mutate requests outside the manifest."""
        content = b"Rar!apply-one"
        self._insert_request()
        self._insert_request("request-101", "101")
        self._insert_file(content)
        self._write_buffer(content)
        manifest = build_reconciliation(self.db_path, self.comics_root, self.buffer_root)

        result = apply_reconciliation(self.db_path, manifest)

        with sqlite3.connect(self.db_path) as db:
            statuses = dict(db.execute("SELECT item_id, workflow_status FROM comic_request_items"))
        self.assertEqual(result["applied"], 1)
        self.assertEqual(statuses["request-100"], "located")
        self.assertEqual(statuses["request-101"], "needs_download")


if __name__ == "__main__":
    unittest.main()
