#!/usr/bin/env python3
"""Conservative request reconciliation for the Hermes MARVEL catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


MEDIA_EXTENSIONS = {".cbr", ".cbz", ".rar", ".zip", ".pdf"}
ARCHIVE_IDENTITY = re.compile(
    r"^(?P<title>.+?)\s+Vol\.?\s*(?P<volume>\d+)\s+#(?P<issue>\d+(?:\.\d+)?)"
    r"(?!\s*[-–]\s*\d)",
    re.IGNORECASE,
)
PATH_ISSUE = re.compile(r"#0*(?P<issue>\d+(?:\.\d+)?)\b", re.IGNORECASE)
PATH_SERIES_YEAR = re.compile(r"\((?P<year>19\d{2}|20\d{2})(?:-\d{4})?\)")
UNVERIFIED = {"", "unverified", "unknown", "none", "null", "n/a"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def _normalize_issue(value: object) -> str:
    text = str(value or "").strip().lstrip("#")
    if re.fullmatch(r"\d+", text):
        return str(int(text))
    if re.fullmatch(r"\d+\.\d+", text):
        return text.rstrip("0").rstrip(".")
    return text.lower()


def _archive_identity(path: Path) -> Optional[Tuple[str, str]]:
    match = ARCHIVE_IDENTITY.search(path.stem)
    if not match:
        return None
    return _normalize_text(match.group("title")), _normalize_issue(match.group("issue"))


def _valid_signature(path: Path) -> bool:
    with path.open("rb") as handle:
        signature = handle.read(8)
    extension = path.suffix.lower()
    if extension in {".cbr", ".rar"}:
        return signature.startswith(b"Rar!")
    if extension in {".cbz", ".zip"}:
        return signature.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"))
    if extension == ".pdf":
        return signature.startswith(b"%PDF-")
    return False


def _database_fingerprint(connection: sqlite3.Connection) -> str:
    digest = hashlib.sha256()
    for table, order_by in (("comic_request_items", "item_id"), ("files", "record_id")):
        columns = [row[1] for row in connection.execute(f"PRAGMA table_info({table})")]
        digest.update(table.encode())
        digest.update(json.dumps(columns, separators=(",", ":")).encode())
        for row in connection.execute(f"SELECT * FROM {table} ORDER BY {order_by}"):
            digest.update(json.dumps(list(row), ensure_ascii=False, separators=(",", ":")).encode())
    return digest.hexdigest()


def collect_buffer_inventory(buffer_root: Path) -> List[dict]:
    """Return evidence for every media file, including unparsed or invalid files."""
    inventory: List[dict] = []
    for path in sorted(buffer_root.iterdir(), key=lambda item: item.name.lower()):
        if not path.is_file() or path.suffix.lower() not in MEDIA_EXTENSIONS:
            continue
        identity = _archive_identity(path)
        row = {
            "path": str(path),
            "name": path.name,
            "size": path.stat().st_size,
            "sha256": _sha256(path),
            "valid_signature": _valid_signature(path),
            "series_key": identity[0] if identity else None,
            "issue_key": identity[1] if identity else None,
        }
        inventory.append(row)
    return inventory


def _buffer_index(buffer_root: Path) -> Dict[Tuple[str, str], List[dict]]:
    return _inventory_index(collect_buffer_inventory(buffer_root))


def _inventory_index(inventory: Iterable[dict]) -> Dict[Tuple[str, str], List[dict]]:
    index: Dict[Tuple[str, str], List[dict]] = {}
    for row in inventory:
        name = str(row.get("name", ""))
        identity = _archive_identity(Path(name))
        if identity is None:
            continue
        normalized = {
            "name": name,
            "size": int(row["size"]),
            "sha256": str(row["sha256"]),
            "valid_signature": bool(row["valid_signature"]),
        }
        index.setdefault(identity, []).append(normalized)
    return index


def _physical_path(comics_root: Path, canonical_path: str) -> Optional[Path]:
    relative = Path(canonical_path.replace("\\", "/"))
    candidate = (comics_root / relative).resolve()
    root = comics_root.resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


def _path_confirms_identity(canonical_path: str, series_title: str, issue: str) -> bool:
    normalized_path = _normalize_text(canonical_path)
    if _normalize_text(series_title) not in normalized_path:
        return False
    matches = [_normalize_issue(match.group("issue")) for match in PATH_ISSUE.finditer(canonical_path)]
    return issue in matches


def _series_year_result(request: sqlite3.Row, file_row: sqlite3.Row) -> str:
    requested = request["series_year"]
    if requested is None:
        return "match"
    evidence = {int(match.group("year")) for match in PATH_SERIES_YEAR.finditer(file_row["canonical_path"])}
    catalog_year = file_row["series_start_year"]
    if catalog_year is not None and _normalize_text(catalog_year) not in UNVERIFIED:
        evidence.add(int(catalog_year))
    if not evidence:
        return "unverified"
    return "match" if int(requested) in evidence else "mismatch"


def _metadata_complete(row: sqlite3.Row) -> bool:
    required = (
        "universe",
        "official_series_title",
        "series_start_year",
        "volume",
        "issue_number",
        "publication_date",
        "edition_language",
        "verification_status",
        "official_source_url",
        "canonical_path",
    )
    if row["metadata_status"] != "complete" or row["location_status"] != "located":
        return False
    return all(_normalize_text(row[name]) not in UNVERIFIED for name in required)


def _blocked(request: sqlite3.Row, reason: str, **evidence: object) -> dict:
    result = {"request_id": request["item_id"], "reason": reason}
    result.update(evidence)
    return result


def _build_reconciliation(
    db_path: Path,
    comics_root: Path,
    buffer: Dict[Tuple[str, str], List[dict]],
) -> dict:
    db_path = Path(db_path)
    comics_root = Path(comics_root)
    transitions: List[dict] = []
    blocked: List[dict] = []

    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as connection:
        connection.row_factory = sqlite3.Row
        fingerprint = _database_fingerprint(connection)
        requests = connection.execute(
            """
            SELECT * FROM comic_request_items
            WHERE workflow_status = 'needs_download'
              AND current_status IN ('faltante','descarga_pendiente','parcial','identificar')
            ORDER BY item_id
            """
        ).fetchall()
        for request in requests:
            if request["issue_end"]:
                blocked.append(_blocked(request, "issue_range_requires_review"))
                continue
            issue = _normalize_issue(request["issue_start"] or request["issue_label"])
            key = (_normalize_text(request["series_title"]), issue)
            candidates = buffer.get(key, [])
            if not candidates:
                continue
            hashes = {candidate["sha256"] for candidate in candidates if candidate["valid_signature"]}
            if not hashes:
                blocked.append(_blocked(request, "invalid_buffer_signature"))
                continue
            if len(hashes) != 1:
                blocked.append(_blocked(request, "ambiguous_buffer_hashes", hashes=sorted(hashes)))
                continue
            sha = next(iter(hashes))
            file_rows = connection.execute("SELECT * FROM files WHERE sha256 = ?", (sha,)).fetchall()
            if not file_rows:
                blocked.append(_blocked(request, "buffer_hash_not_in_catalog", sha256=sha))
                continue
            if len(file_rows) != 1:
                blocked.append(_blocked(request, "ambiguous_catalog_hash", sha256=sha))
                continue
            file_row = file_rows[0]
            if not _path_confirms_identity(file_row["canonical_path"], request["series_title"], issue):
                blocked.append(_blocked(request, "catalog_path_identity_mismatch", sha256=sha))
                continue
            year_result = _series_year_result(request, file_row)
            if year_result != "match":
                blocked.append(_blocked(
                    request,
                    "series_year_mismatch" if year_result == "mismatch" else "series_year_unverified",
                    sha256=sha,
                ))
                continue
            physical = _physical_path(comics_root, file_row["canonical_path"])
            if physical is None:
                blocked.append(_blocked(request, "catalog_path_outside_root", sha256=sha))
                continue
            if not physical.is_file():
                blocked.append(_blocked(request, "catalog_file_missing", sha256=sha))
                continue
            if physical.stat().st_size != file_row["file_size"]:
                blocked.append(_blocked(request, "catalog_file_size_mismatch", sha256=sha))
                continue
            if _sha256(physical) != sha:
                blocked.append(_blocked(request, "catalog_file_hash_mismatch", sha256=sha))
                continue
            complete = _metadata_complete(file_row)
            transitions.append({
                "request_id": request["item_id"],
                "from_status": request["workflow_status"],
                "to_status": "complete" if complete else "located",
                "file_record_id": file_row["record_id"],
                "sha256": sha,
                "canonical_path": file_row["canonical_path"],
                "reason": (
                    "exact_buffer_hash_catalog_physical_match_metadata_complete"
                    if complete
                    else "exact_buffer_hash_catalog_physical_match_metadata_incomplete"
                ),
            })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database": str(db_path),
        "database_fingerprint": fingerprint,
        "transitions": transitions,
        "blocked": blocked,
        "summary": {
            "transition_count": len(transitions),
            "blocked_count": len(blocked),
            "buffer_identity_count": len(buffer),
        },
    }


def build_reconciliation(db_path: Path, comics_root: Path, buffer_root: Path) -> dict:
    """Build a manifest by reading a local Telegram buffer."""
    return _build_reconciliation(
        Path(db_path), Path(comics_root), _buffer_index(Path(buffer_root))
    )


def build_reconciliation_from_inventory(
    db_path: Path, comics_root: Path, inventory: Iterable[dict]
) -> dict:
    """Build a manifest from buffer evidence collected on another host."""
    return _build_reconciliation(
        Path(db_path), Path(comics_root), _inventory_index(inventory)
    )


def apply_reconciliation(db_path: Path, manifest: dict) -> dict:
    """Apply exactly the transitions in a current manifest in one transaction."""
    db_path = Path(db_path)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        if _database_fingerprint(connection) != manifest["database_fingerprint"]:
            raise RuntimeError("database fingerprint changed since manifest generation")
        connection.execute("BEGIN IMMEDIATE")
        applied = 0
        try:
            for transition in manifest["transitions"]:
                cursor = connection.execute(
                    """
                    UPDATE comic_request_items
                    SET workflow_status = ?, last_error = NULL,
                        last_transition_at = ?, updated_at = ?
                    WHERE item_id = ? AND workflow_status = ?
                    """,
                    (
                        transition["to_status"],
                        datetime.now(timezone.utc).isoformat(),
                        datetime.now(timezone.utc).isoformat(),
                        transition["request_id"],
                        transition["from_status"],
                    ),
                )
                if cursor.rowcount != 1:
                    raise RuntimeError(f"request state changed: {transition['request_id']}")
                applied += 1
            connection.commit()
        except Exception:
            connection.rollback()
            raise
    return {"applied": applied, "requested": len(manifest["transitions"])}


def _main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--comics-root", type=Path, required=True)
    source = parser.add_mutually_exclusive_group(required=False)
    source.add_argument("--buffer-root", type=Path)
    source.add_argument("--buffer-inventory", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.apply:
        manifest = json.loads(args.manifest.read_text())
        result = apply_reconciliation(args.db, manifest)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    if args.buffer_inventory:
        inventory = json.loads(args.buffer_inventory.read_text())
        manifest = build_reconciliation_from_inventory(args.db, args.comics_root, inventory)
    elif args.buffer_root:
        manifest = build_reconciliation(args.db, args.comics_root, args.buffer_root)
    else:
        parser.error("dry-run requires --buffer-root or --buffer-inventory")
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(manifest["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
