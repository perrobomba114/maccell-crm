#!/usr/bin/env python3
"""Import active PEDIDO.md files into the server comic catalog SQLite database.

The importer keeps historical/report copies as documents, but does not turn
them into active requests. It is intentionally conservative: only explicit
issue sections are converted into request items.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


STATUS_RE = re.compile(r"^\*\*Estado:\*\*\s*(.+?)\s*$", re.MULTILINE | re.IGNORECASE)
H1_RE = re.compile(r"^#\s+PEDIDO\s*-\s*(.+?)\s*$", re.MULTILINE | re.IGNORECASE)
HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
URL_RE = re.compile(r"https?://[^\s)]+")
ISSUE_RE = re.compile(r"#\s*(\d+)(?:\s*-\s*#?\s*(\d+))?")
SERIES_RE = re.compile(r"^(.+?)\s*\((\d{4})(?:,[^)]*)?\)\s*#")
BUCKET_RE = re.compile(r"^(\d{4}\.\d{3})\s*-\s*(.+)$")

REQUEST_STATUS = {
    "NO CONSEGUIDO": "NO CONSEGUIDO",
    "PARCIAL": "PARCIAL",
    "CONSEGUIDO": "CONSEGUIDO",
    "COMPLETO": "CONSEGUIDO",
    "CORRUPTO": "CORRUPTO",
    "IDENTIFICAR": "IDENTIFICAR",
}


SCHEMA = """
CREATE TABLE IF NOT EXISTS comic_request_documents (
  document_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  source_sha256 TEXT NOT NULL,
  document_kind TEXT NOT NULL CHECK (document_kind IN ('active','historical_report')),
  request_id TEXT,
  raw_markdown TEXT NOT NULL,
  archived_path TEXT,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comic_requests (
  request_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  source_sha256 TEXT NOT NULL,
  title TEXT NOT NULL,
  request_status TEXT NOT NULL CHECK (request_status IN ('NO CONSEGUIDO','PARCIAL','CONSEGUIDO','CORRUPTO','IDENTIFICAR','DESCONOCIDO')),
  universe TEXT,
  chronology_key TEXT,
  event_name TEXT,
  canonical_destination TEXT,
  raw_markdown TEXT NOT NULL,
  archived_path TEXT,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comic_request_items (
  item_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES comic_requests(request_id) ON DELETE CASCADE,
  series_title TEXT NOT NULL,
  series_year INTEGER,
  volume TEXT,
  issue_label TEXT NOT NULL,
  issue_start TEXT,
  issue_end TEXT,
  event_name TEXT,
  content_role TEXT NOT NULL CHECK (content_role IN ('regular','evento principal','tie-in','especial','desconocido')),
  current_status TEXT NOT NULL CHECK (current_status IN ('faltante','conseguido','parcial','corrupto','identificar','descarga_pendiente','no_aplica')),
  canonical_destination TEXT,
  source_section TEXT NOT NULL,
  source_line TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(request_id, series_title, issue_label, content_role)
);

CREATE TABLE IF NOT EXISTS comic_request_sources (
  source_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES comic_requests(request_id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('oficial','evidencia','referencia','desconocida')),
  created_at TEXT NOT NULL,
  UNIQUE(request_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_request_items_status ON comic_request_items(current_status);
CREATE INDEX IF NOT EXISTS idx_request_items_lookup ON comic_request_items(series_title, series_year, issue_start, issue_end);
CREATE INDEX IF NOT EXISTS idx_request_items_role ON comic_request_items(content_role);
CREATE INDEX IF NOT EXISTS idx_requests_status ON comic_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_request_documents_kind ON comic_request_documents(document_kind);
"""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize(value: str) -> str:
    return " ".join(value.casefold().split())


def document_kind(path: Path, root: Path) -> str:
    relative = path.relative_to(root).as_posix()
    if relative.startswith("reports/") or relative.startswith("99 - PEDIDO/REPORTES/"):
        return "historical_report"
    return "active"


def parse_request_status(markdown: str) -> str:
    match = STATUS_RE.search(markdown)
    value = normalize(match.group(1)).upper() if match else "DESCONOCIDO"
    for key, mapped in REQUEST_STATUS.items():
        if value.startswith(key):
            return mapped
    return "DESCONOCIDO"


def parse_title(markdown: str, fallback: str) -> str:
    match = H1_RE.search(markdown)
    return match.group(1).strip() if match else fallback


def taxonomy(root: Path, path: Path) -> dict[str, str | None]:
    parts = path.relative_to(root).parts
    universe = parts[0] if parts else None
    chronology_key = None
    bucket_name = None
    for part in parts[:-1]:
        match = BUCKET_RE.match(part)
        if match:
            chronology_key = match.group(1)
            bucket_name = match.group(2).strip()
            break
    is_regular = bool(bucket_name and "series regulares" in normalize(bucket_name))
    event_name = None if is_regular else bucket_name
    destination = path.parent.relative_to(root).as_posix()
    return {
        "universe": universe,
        "chronology_key": chronology_key,
        "event_name": event_name,
        "canonical_destination": destination,
    }


def section_blocks(markdown: str) -> list[tuple[str, list[str]]]:
    headings = list(HEADING_RE.finditer(markdown))
    blocks = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        name = normalize(heading.group(1))
        body = markdown[heading.end():end]
        blocks.append((name, body.splitlines()))
    return blocks


def role_for(section: str, event_name: str | None) -> str:
    if "tie-in" in section:
        return "tie-in"
    if event_name:
        return "evento principal"
    if "serie principal" in section or "faltantes confirmados" in section:
        return "regular"
    return "desconocido"


def item_status(section: str, request_status: str) -> str:
    if "faltantes confirmados" in section:
        return "faltante"
    if request_status == "CORRUPTO":
        return "corrupto"
    if request_status == "IDENTIFICAR":
        return "identificar"
    if request_status == "PARCIAL":
        return "parcial"
    if request_status == "CONSEGUIDO":
        return "conseguido"
    return "descarga_pendiente"


def clean_series(value: str) -> str:
    value = re.sub(r"[\*_`]", "", value).strip(" .,:;-\")('")
    value = re.sub(r"^(?:serie principal|faltantes confirmados|tie-ins)\s*:\s*", "", value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip()


def parse_line_items(text: str, fallback_year: int | None) -> list[tuple[str, int | None, str, str | None]]:
    """Parse one explicit scope line into (series, year, issue, end)."""
    text = re.sub(r"[\*_`]", "", text).strip().rstrip(".")
    if any(marker in normalize(text) for marker in ("determinar con marvel", "requieren auditoria", "la carpeta contiene", "todos constan", "son los mini-cruces")):
        return []
    results = []
    chunks = [chunk.strip() for chunk in re.split(r";\s*", text) if chunk.strip()]
    for chunk in chunks:
        first = ISSUE_RE.search(chunk)
        if not first:
            continue
        prefix = chunk[:first.start()]
        match = SERIES_RE.match(chunk)
        if match:
            series = clean_series(match.group(1))
            year = int(match.group(2))
        else:
            series = clean_series(prefix)
            year = fallback_year
        if not series or series.casefold() in {"ninguno", "preludio", "cruces"}:
            continue
        occurrences = list(ISSUE_RE.finditer(chunk, first.start()))
        for occurrence in occurrences:
            results.append((series, year, occurrence.group(1), occurrence.group(2)))
    return results


def parse_items(markdown: str, request_id: str, tax: dict[str, str | None], request_status: str) -> tuple[list[dict], list[str]]:
    items = []
    warnings = []
    for section, lines in section_blocks(markdown):
        if not any(key in section for key in ("faltantes confirmados", "serie principal", "tie-ins")):
            continue
        role = role_for(section, tax["event_name"])
        current = item_status(section, request_status)
        for line in lines:
            stripped = line.strip()
            if not stripped.startswith("-"):
                continue
            text = re.sub(r"^-\s*", "", stripped).strip()
            if not text or normalize(text).startswith("ninguno"):
                continue
            fallback_year = int(tax["chronology_key"][:4]) if tax["chronology_key"] else None
            parsed = parse_line_items(text, fallback_year)
            if not parsed:
                warnings.append(f"{section}: {text}")
                continue
            for series_title, series_year, start, end in parsed:
                label = f"{start}-{end}" if end else start
                identity = f"{request_id}|{series_title}|{label}|{role}"
                item_id = hashlib.sha256(identity.encode("utf-8")).hexdigest()
                items.append({
                    "item_id": item_id,
                    "request_id": request_id,
                    "series_title": series_title,
                    "series_year": series_year,
                    "volume": None,
                    "issue_label": label,
                    "issue_start": start,
                    "issue_end": end,
                    "event_name": tax["event_name"],
                    "content_role": role,
                    "current_status": current,
                    "canonical_destination": tax["canonical_destination"],
                    "source_section": section,
                    "source_line": text,
                    "notes": None,
                })
    return items, warnings


def source_kind(url: str) -> str:
    lower = url.casefold()
    if "marvel.com" in lower or "comics.org" in lower:
        return "oficial"
    if "evidencia" in lower or "proof" in lower:
        return "evidencia"
    return "referencia"


def collect(root: Path) -> tuple[list[dict], list[dict], list[str]]:
    documents = []
    requests = []
    warnings = []
    now = datetime.now(timezone.utc).isoformat()
    for path in sorted(root.rglob("*PEDIDO.md")):
        if not path.is_file():
            continue
        raw = path.read_bytes()
        markdown = raw.decode("utf-8", errors="replace")
        digest = sha256_bytes(raw)
        relative = path.relative_to(root).as_posix()
        kind = document_kind(path, root)
        document_id = hashlib.sha256(relative.encode("utf-8")).hexdigest()
        request_id = hashlib.sha256(digest.encode("ascii")).hexdigest() if kind == "active" else None
        documents.append({
            "document_id": document_id,
            "source_path": relative,
            "source_sha256": digest,
            "document_kind": kind,
            "request_id": request_id,
            "raw_markdown": markdown,
            "imported_at": now,
            "updated_at": now,
        })
        if kind != "active":
            continue
        tax = taxonomy(root, path)
        status = parse_request_status(markdown)
        title = parse_title(markdown, path.parent.name)
        items, item_warnings = parse_items(markdown, request_id, tax, status)
        warnings.extend([f"{relative}: {warning}" for warning in item_warnings])
        requests.append({
            "request_id": request_id,
            "source_path": relative,
            "source_sha256": digest,
            "title": title,
            "request_status": status,
            "universe": tax["universe"],
            "chronology_key": tax["chronology_key"],
            "event_name": tax["event_name"],
            "canonical_destination": tax["canonical_destination"],
            "raw_markdown": markdown,
            "items": items,
            "sources": sorted(set(URL_RE.findall(markdown))),
            "imported_at": now,
            "updated_at": now,
        })
    return documents, requests, warnings


def apply(root: Path, db_path: Path, archive_dir: Path, documents: list[dict], requests: list[dict]) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    db = sqlite3.connect(db_path)
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(SCHEMA)
    db.execute("BEGIN")
    try:
        for document in documents:
            db.execute("""INSERT INTO comic_request_documents
              (document_id,source_path,source_sha256,document_kind,request_id,raw_markdown,imported_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?)
              ON CONFLICT(source_path) DO UPDATE SET source_sha256=excluded.source_sha256,
              document_kind=excluded.document_kind,request_id=excluded.request_id,
              raw_markdown=excluded.raw_markdown,updated_at=excluded.updated_at""",
              (document["document_id"], document["source_path"], document["source_sha256"], document["document_kind"],
               document["request_id"], document["raw_markdown"], document["imported_at"], document["updated_at"]))
        for request in requests:
            db.execute("""INSERT INTO comic_requests
              (request_id,source_path,source_sha256,title,request_status,universe,chronology_key,event_name,
               canonical_destination,raw_markdown,imported_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(request_id) DO UPDATE SET source_path=excluded.source_path,
              source_sha256=excluded.source_sha256,title=excluded.title,request_status=excluded.request_status,
              universe=excluded.universe,chronology_key=excluded.chronology_key,event_name=excluded.event_name,
              canonical_destination=excluded.canonical_destination,raw_markdown=excluded.raw_markdown,updated_at=excluded.updated_at""",
              (request["request_id"], request["source_path"], request["source_sha256"], request["title"], request["request_status"],
               request["universe"], request["chronology_key"], request["event_name"], request["canonical_destination"],
               request["raw_markdown"], request["imported_at"], request["updated_at"]))
            for item in request["items"]:
                db.execute("""INSERT INTO comic_request_items
                  (item_id,request_id,series_title,series_year,volume,issue_label,issue_start,issue_end,event_name,
                   content_role,current_status,canonical_destination,source_section,source_line,notes,created_at,updated_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                  ON CONFLICT(item_id) DO UPDATE SET current_status=excluded.current_status,
                  canonical_destination=excluded.canonical_destination,source_line=excluded.source_line,updated_at=excluded.updated_at""",
                  (item["item_id"], item["request_id"], item["series_title"], item["series_year"], item["volume"],
                   item["issue_label"], item["issue_start"], item["issue_end"], item["event_name"], item["content_role"],
                   item["current_status"], item["canonical_destination"], item["source_section"], item["source_line"],
                   item["notes"], now, now))
            for url in request["sources"]:
                source_id = hashlib.sha256(f"{request['request_id']}|{url}".encode("utf-8")).hexdigest()
                db.execute("""INSERT INTO comic_request_sources
                  (source_id,request_id,source_url,source_kind,created_at)
                  VALUES (?,?,?,?,?) ON CONFLICT(source_id) DO NOTHING""",
                  (source_id, request["request_id"], url, source_kind(url), now))
        db.commit()
    except Exception:
        db.rollback()
        db.close()
        raise

    archive_dir.mkdir(parents=True, exist_ok=False)
    archive_manifest = []
    try:
        for document in documents:
            source = root / document["source_path"]
            destination = archive_dir / document["source_path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            if not source.exists():
                raise FileNotFoundError(source)
            before_hash = sha256_bytes(source.read_bytes())
            if before_hash != document["source_sha256"]:
                raise ValueError(f"hash changed before archive: {source}")
            shutil.move(str(source), str(destination))
            after_hash = sha256_bytes(destination.read_bytes())
            if after_hash != before_hash:
                raise ValueError(f"hash changed during archive: {destination}")
            archive_manifest.append({
                "source_path": document["source_path"],
                "archived_path": str(destination),
                "sha256": after_hash,
                "size": destination.stat().st_size,
            })
    except Exception:
        raise

    db = sqlite3.connect(db_path)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("BEGIN")
    try:
        for entry in archive_manifest:
            db.execute("UPDATE comic_request_documents SET archived_path=?,updated_at=? WHERE source_path=?",
                       (entry["archived_path"], now, entry["source_path"]))
            db.execute("UPDATE comic_requests SET archived_path=?,updated_at=? WHERE source_path=?",
                       (entry["archived_path"], now, entry["source_path"]))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    manifest_path = archive_dir / "ARCHIVE-MANIFEST.json"
    manifest_path.write_text(json.dumps({"created_utc": now, "files": archive_manifest}, indent=2, ensure_ascii=False) + "\n")
    return {"archived": len(archive_manifest), "archive_dir": str(archive_dir)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--archive-dir", type=Path)
    args = parser.parse_args()
    documents, requests, warnings = collect(args.root)
    items = [item for request in requests for item in request["items"]]
    report = {
        "root": str(args.root),
        "db": str(args.db),
        "documents": len(documents),
        "active_requests": len(requests),
        "historical_documents": sum(d["document_kind"] == "historical_report" for d in documents),
        "request_items": len(items),
        "sources": sum(len(request["sources"]) for request in requests),
        "request_status": {},
        "item_status": {},
        "roles": {},
        "warnings": warnings,
    }
    for request in requests:
        report["request_status"][request["request_status"]] = report["request_status"].get(request["request_status"], 0) + 1
        for item in request["items"]:
            report["item_status"][item["current_status"]] = report["item_status"].get(item["current_status"], 0) + 1
            report["roles"][item["content_role"]] = report["roles"].get(item["content_role"], 0) + 1
    if args.apply:
        if args.archive_dir is None:
            parser.error("--archive-dir is required with --apply")
        report["apply"] = apply(args.root, args.db, args.archive_dir, documents, requests)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
