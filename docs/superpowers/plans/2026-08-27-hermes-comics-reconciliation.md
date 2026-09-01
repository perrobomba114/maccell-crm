# Hermes Comics Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the Hermes MARVEL request queue, catalog, Telegram buffer, staging, and active skill cache without deleting or overwriting comic media.

**Architecture:** A small Python reconciler generates an evidence manifest in dry-run mode and applies only unambiguous SQL transitions transactionally. A separate buffer inventory/staging path copies and verifies unmatched archives while retaining originals; Hermes skills are reloaded only after data state is safe.

**Tech Stack:** Python 3 standard library, SQLite, SHA-256, POSIX filesystem, Docker, Hermes CLI, SSH.

**Spec:** `docs/superpowers/specs/2026-08-27-hermes-comics-reconciliation-design.md`

## Global Constraints

- Do not delete or overwrite comic media.
- Do not mark a request complete from physical existence alone.
- Exact SHA-256, physical existence, canonical path, and identity must agree before an automatic transition.
- Keep comic crons paused until the bounded final test.
- Back up SQLite before mutation and use one transaction per applied manifest.
- Do not expose credentials or tokens in logs or reports.

---

### Task 1: Freeze and snapshot current state

**Files:**
- Create: `/mnt/COMICS/reports/hermes-comics-repair-<timestamp>/preflight.json`
- Create: `/mnt/COMICS/catalog/backups/marvel_library-before-reconcile-<timestamp>.sqlite`

**Interfaces:**
- Consumes: current Docker container, SQLite database, worker state, cron configuration.
- Produces: immutable preflight evidence and a verified SQLite backup.

- [ ] Verify both comic crons are paused.
- [ ] Run SQLite integrity and foreign-key checks.
- [ ] Create a SQLite-consistent backup with the SQLite backup API.
- [ ] Record SHA-256 and size for source and backup.
- [ ] Record current request/file status counts, buffer counts, and running-session skill evidence.

### Task 2: Implement request reconciliation with tests

**Files:**
- Create: `/opt/data/scripts/comic_request_reconcile.py`
- Create: `/opt/data/tests/test_comic_request_reconcile.py`

**Interfaces:**
- Produces: `build_reconciliation(db_path, comics_root) -> dict` and `apply_reconciliation(db_path, manifest) -> dict`.
- Manifest items contain `request_id`, `from_status`, `to_status`, `file_record_id`, `sha256`, `canonical_path`, and `reason`.

- [ ] Write fixtures for unique exact identity, ambiguous identity, incomplete metadata, missing physical file, and changed database fingerprint.
- [ ] Run tests and confirm they fail before implementation.
- [ ] Implement path normalization, metadata completeness, physical hash verification, and conservative identity matching.
- [ ] Implement transaction and fingerprint guard for apply mode.
- [ ] Run unit tests and compile checks.
- [ ] Run against production in dry-run mode and store the manifest in the repair report directory.
- [ ] Manually inspect a sample including the original first 12 worker candidates.

### Task 3: Apply safe SQL transitions

**Files:**
- Modify: `/mnt/COMICS/catalog/marvel_library.sqlite`
- Create: `/mnt/COMICS/reports/hermes-comics-repair-<timestamp>/reconciliation-applied.json`

**Interfaces:**
- Consumes: reviewed dry-run manifest from Task 2.
- Produces: reconciled request statuses with per-item evidence.

- [ ] Verify production database fingerprint still matches the dry-run manifest.
- [ ] Apply all accepted transitions in one transaction.
- [ ] Re-run integrity, foreign-key, status-count, and first-candidate checks.
- [ ] Compare changed rows exactly against the accepted manifest.

### Task 4: Inventory and stage the Telegram buffer

**Files:**
- Create: `/opt/data/scripts/comic_buffer_inventory.py`
- Create: `/opt/data/tests/test_comic_buffer_inventory.py`
- Create: `/mnt/COMICS/reports/hermes-comics-repair-<timestamp>/buffer-manifest.json`
- Create directory: `/mnt/COMICS/99 - PEDIDO/FALTANTES/telegram-worker`

**Interfaces:**
- Produces: one manifest row per buffer file with `sha256`, `size`, `signature`, `catalog_matches`, and `disposition`.

- [ ] Test ZIP/RAR/PDF signatures, duplicate hashes, destination collisions, and atomic copy behavior.
- [ ] Inventory all buffer files and require a disposition count equal to the physical file count.
- [ ] Create staging without replacing existing content.
- [ ] Copy unmatched single-file candidates through temporary names and verify size/SHA before rename.
- [ ] Keep multipart sets and ambiguous files in `needs_review` unless all parts are present and validated.
- [ ] Retain every original buffer file during this repair.

### Task 5: Refresh Hermes skills and quarantine safe residue

**Files:**
- Create: `/opt/data/quarantine/comic-legacy-<timestamp>/manifest.txt`

**Interfaces:**
- Consumes: current four skill directories and active Hermes gateway configuration.
- Produces: a fresh session exposing only the four current comic skills.

- [ ] Verify current skill files and checksums.
- [ ] Move AppleDouble `._*` sidecars and proven-unreferenced legacy artifacts to dated quarantine.
- [ ] Reload the skill cache or restart only the Hermes gateway container if reload is insufficient.
- [ ] Start/inspect a fresh session and assert the four current names are present and retired comic skill names are absent.

### Task 6: End-to-end verification and bounded live cycle

**Files:**
- Create: `/mnt/COMICS/reports/hermes-comics-repair-<timestamp>/final-audit.json`
- Create: `/mnt/COMICS/reports/hermes-comics-repair-<timestamp>/final-summary.md`

**Interfaces:**
- Consumes: reconciled SQL, staged buffer, refreshed Hermes runtime.
- Produces: final evidence and a go/no-go decision for cron reactivation.

- [ ] Run SQLite integrity, foreign-key, path, size, and intervened-file SHA checks.
- [ ] Confirm no already-satisfied request appears in the worker candidate batch.
- [ ] Run the worker once in dry-run mode.
- [ ] If dry-run is clean, run one bounded live cycle with a maximum of one item and no destructive placement.
- [ ] Verify resulting SQL state, manifest, staging file, and absence of duplicate download.
- [ ] Keep crons paused unless every acceptance criterion passes; otherwise report the exact blocker.
