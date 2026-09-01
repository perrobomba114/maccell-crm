# PEDIDO.md to SQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every comic request currently stored in `PEDIDO.md` on the MACCELL server into durable, queryable SQLite request records with current status, then remove the Markdown files only after a recoverable archive and verification.

**Architecture:** A versioned importer will parse request documents into `comic_requests`, `comic_request_items`, and `comic_request_sources`. The importer will preserve source paths, hashes, raw lines, and parse warnings; current status belongs to each request item so the downloader can update it without reparsing Markdown. The original Markdown files will be moved into a dated archive under `reports` after SQL verification, never deleted irreversibly.

**Tech Stack:** Python 3, SQLite 3, POSIX filesystem, SSH to `maccell@100.127.204.5`.

**Spec:** Current user request: import all server `PEDIDO.md` data into SQL, add current status, and remove the Markdown request files after migration.

## Global Constraints

- Do not overwrite or delete existing comic/catalog data.
- Preserve every source document with SHA-256 and recoverable archive path before removing its original location.
- Parse only explicit request sections; do not treat every `#` in prose or URLs as an issue.
- Keep regular-series, event-main, and tie-in classification distinct.
- A request item must remain queryable even when no direct download URL exists.
- Validate SQLite integrity, source count, item count, archive count, and rollback availability before reporting completion.

---

### Task 1: Inspect and freeze the current request corpus

**Files:**
- Read: `/mnt/COMICS/**/PEDIDO.md`
- Read: `/mnt/COMICS/catalog/marvel_library.sqlite`
- Create: `/mnt/COMICS/reports/pedido-md-migration-20260827T<UTC>.json`

**Interfaces:**
- Consumes: all Markdown request files and the existing SQLite schema.
- Produces: a manifest containing exact source paths, SHA-256 hashes, file count, and parser section counts.

- [ ] **Step 1: Inventory the files without modifying them**

```bash
find /mnt/COMICS -type f -iname '*PEDIDO.md' -print | sort
```

- [ ] **Step 2: Hash each source file and record its byte size**

```bash
find /mnt/COMICS -type f -iname '*PEDIDO.md' -print0 | xargs -0 sha256sum
```

- [ ] **Step 3: Verify the target database before migration**

```python
import sqlite3
db = sqlite3.connect("file:/mnt/COMICS/catalog/marvel_library.sqlite?mode=ro", uri=True)
assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
```

- [ ] **Step 4: Save the immutable manifest before any SQL or filesystem change.**

### Task 2: Add normalized request tables and indexes

**Files:**
- Create: `/mnt/COMICS/catalog/tools/pedido_schema.sql`
- Modify: `/mnt/COMICS/catalog/marvel_library.sqlite`

**Interfaces:**
- Consumes: the existing catalog schema.
- Produces: idempotent tables `comic_requests`, `comic_request_items`, and `comic_request_sources`.

- [ ] **Step 1: Create the schema in one transaction**

```sql
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
```

- [ ] **Step 2: Rerun the schema and prove idempotence.** Running it twice must not change row counts or fail.

### Task 3: Parse and import all request content

**Files:**
- Create: `/mnt/COMICS/catalog/tools/import_pedidos.py`
- Create: `/mnt/COMICS/catalog/reports/pedido-import-<UTC>.json`

**Interfaces:**
- Consumes: Markdown files, directory taxonomy, and the schema from Task 2.
- Produces: one request row per Markdown file, one item row per explicit requested issue/range, source URL rows, and warning rows in the report.

- [ ] **Step 1: Parse document metadata**

Extract the H1 title, `Estado`, directory universe, chronology key, event name, and canonical destination. Map `*.900 - Series regulares` to `regular`; map `01 - Evento principal` to `evento principal`; map `02 - Tie-ins` or a `Tie-ins` section to `tie-in`.

- [ ] **Step 2: Parse only request-bearing sections**

Accept issue lines from `Faltantes confirmados`, `Serie principal`, and `Tie-ins`. Stop at the next Markdown heading. Ignore historical notes, `Fuentes`, `Evidencia local`, and already-incorporated prose.

- [ ] **Step 3: Normalize issue labels without losing original text**

For `Fantastic Four (1961) #7`, store series `Fantastic Four`, year `1961`, issue label `7`, and retain the complete source line. For `#115-118`, store `issue_start=115`, `issue_end=118`, and `issue_label=115-118`. Do not use the filename prefix such as `0320` as the issue number.

- [ ] **Step 4: Derive initial item status from explicit evidence**

Use `faltante` for items under `Faltantes confirmados`, `descarga_pendiente` for requested items with no local match, `corrupto` only when the document explicitly identifies corruption, and `identificar` only when explicitly stated. Never infer `conseguido` solely from a historical note.

- [ ] **Step 5: Import in a transaction with deterministic IDs**

Use SHA-256 plus section/line identity for IDs. On rerun, update the same request/item instead of duplicating it. Abort and roll back if a source cannot be parsed or a uniqueness conflict is ambiguous.

- [ ] **Step 6: Produce parser statistics**

Report source files, request rows, item rows, source URLs, status counts, role counts, and warnings. The importer must exit nonzero if any source file was skipped.

### Task 4: Reconcile against the existing catalog before archive

**Files:**
- Modify: `/mnt/COMICS/catalog/tools/import_pedidos.py`
- Create: `/mnt/COMICS/catalog/reports/pedido-reconcile-<UTC>.json`

**Interfaces:**
- Consumes: imported request items and existing `files`, `editorial_facts`, and `editorial_issues_global` rows.
- Produces: safe status transitions and a report of matched/unmatched/ambiguous items.

- [ ] **Step 1: Match by normalized series/year/volume/issue**, preferring exact catalog records and canonical paths.
- [ ] **Step 2: Match ranges conservatively.** A file covering `#8-9` may satisfy both issues only if the catalog explicitly records the range; otherwise mark `parcial` or `identificar`.
- [ ] **Step 3: Never mark an item `conseguido` for a corrupt or unverified file.** Preserve `corrupto`, `identificar`, or `descarga_pendiente`.
- [ ] **Step 4: Verify all existing foreign keys and SQLite integrity after reconciliation.**

### Task 5: Archive and remove the Markdown files recoverably

**Files:**
- Create: `/mnt/COMICS/reports/pedidos-md-archive-<UTC>/`
- Create: `/mnt/COMICS/reports/pedidos-md-archive-<UTC>/ARCHIVE-MANIFEST.json`
- Modify: `/mnt/COMICS/catalog/marvel_library.sqlite`

**Interfaces:**
- Consumes: the verified import and reconciliation reports.
- Produces: archived originals, SQL `archived_path` values, and no remaining `PEDIDO.md` files in active catalog directories.

- [ ] **Step 1: Refuse archive if source count, imported count, or hash verification differs.**
- [ ] **Step 2: Move each source to the dated archive while preserving its relative path.**
- [ ] **Step 3: Update `comic_requests.archived_path` in SQLite and commit only after every move succeeds.**
- [ ] **Step 4: Verify the archive count and hashes against the pre-migration manifest.**
- [ ] **Step 5: Verify no active `PEDIDO.md` remains under `/mnt/COMICS`, excluding the archive itself.**
- [ ] **Step 6: Keep the archive indefinitely until a later explicit cleanup request.**

### Task 6: Validate the downloader-facing query contract

**Files:**
- Create: `/mnt/COMICS/catalog/tools/pending_requests.sql`
- Create: `/mnt/COMICS/catalog/reports/pedido-final-validation-<UTC>.json`

**Interfaces:**
- Consumes: normalized request tables and catalog tables.
- Produces: deterministic pending batches for Hermes.

- [ ] **Step 1: Add the pending query**

```sql
SELECT item_id, series_title, series_year, volume, issue_label,
       event_name, content_role, universe, canonical_destination,
       current_status
FROM comic_request_items
WHERE current_status IN ('faltante','descarga_pendiente','parcial','identificar')
ORDER BY series_year, series_title, issue_start, item_id;
```

- [ ] **Step 2: Validate counts against the import report.**
- [ ] **Step 3: Run SQLite integrity and foreign-key checks.**
- [ ] **Step 4: Document that Hermes should consume this query and update `current_status` after verified download/move.**

## Completion Gate

The migration is complete only when all source hashes match the archive, every `PEDIDO.md` has a corresponding SQL request row, every explicit requested issue has an SQL item row or a recorded parser warning, SQLite integrity passes, and the pending query returns deterministic data. The original files remain recoverable in the dated archive.
