# Hermes Comics Reconciliation Design

## Objective

Make the four current MARVEL comic skills operationally authoritative by reconciling Hermes sessions, `marvel_library.sqlite`, the Telegram buffer, remote staging, and the physical library without deleting or overwriting media.

## Confirmed starting state

- Canonical database: `/mnt/COMICS/catalog/marvel_library.sqlite`.
- Physical root: `/mnt/COMICS`.
- Telegram buffer: `/opt/data/telegram-downloads` inside the Hermes container.
- Remote staging: `/mnt/COMICS/99 - PEDIDO/FALTANTES/telegram-worker`.
- The latest running Hermes session advertised retired comic skills and did not advertise `comic-project-source-of-truth`.
- SQLite passes `integrity_check`; all 7,234 `files` rows resolve to physical files.
- The request queue contains false `needs_download` entries: the first 12 worker candidates already exist in the buffer and canonical library with the same SHA-256.
- The buffer contains 402 archives: 375 match catalog hashes and 27 do not.
- Comic crons are paused and must remain paused until the final controlled test.

## Authority and reconciliation rules

Evidence authority, highest to lowest:

1. Exact SHA-256 plus a readable physical file under `/mnt/COMICS`.
2. A `files` row whose `canonical_path`, size, and SHA-256 match that file.
3. A request identity linked unambiguously to the catalog file.
4. Editorial metadata fields.
5. Filenames and historical reports, which are hints only.

An exact hash proves file identity but does not by itself prove complete editorial metadata. Therefore a satisfied request becomes `located` when the physical file and catalog row are proven, and becomes `complete` only when required metadata is complete. Ambiguous identity becomes `needs_review`; it is never guessed.

## Components

### Reconciliation tool

A focused Python tool runs inside Hermes and opens a read-only snapshot for analysis. It produces a JSON manifest containing every proposed request transition, its evidence, and its reason. Application mode requires the manifest, checks that the database fingerprint has not changed, creates a SQLite backup, and applies transitions in one transaction.

Automatic transitions are deliberately narrow:

- `needs_download` to `located` only when request identity resolves to exactly one `files` row and the corresponding physical file passes path, size, and SHA checks.
- `needs_download` to `complete` only when the same proof exists and all required metadata are verified.
- No automatic transition based only on a filename or buffer match.

### Buffer inventory

Every buffer file is recorded with name, size, SHA-256, archive signature, catalog match count, and disposition:

- `catalog_duplicate`: exact catalog hash; retained until the final audit.
- `new_candidate`: no catalog hash; copied to staging and verified, without removing the buffer source.
- `buffer_duplicate`: repeated hash within the buffer; retained and reported.
- `needs_review`: invalid signature, multipart ambiguity, collision, or uncertain identity.

### Staging

The staging directory is created explicitly. New candidates are copied using a temporary filename, verified by size and SHA-256, then atomically renamed. Existing names are never overwritten. A different hash at the same destination produces `needs_review`.

### Hermes runtime

The gateway/session skill cache is refreshed only after current skill files are verified. The new session must advertise all four current skills and none of the retired comic skills before any cron can be enabled.

### Legacy cleanup

Legacy artifacts are inventoried first. Only AppleDouble sidecars and artifacts proven unreferenced by active configuration may be moved to a dated quarantine. Historical scripts, reports, backups, and media are not permanently deleted during this repair.

## Failure handling and rollback

- Before SQL mutation, create a timestamped SQLite backup and record its SHA-256.
- SQL changes use `BEGIN IMMEDIATE`; any exception rolls back the entire batch.
- Staging uses copy, verify, atomic rename. Original buffer files remain untouched.
- Every run writes a dated machine-readable manifest and a human-readable summary under `/mnt/COMICS/reports`.
- A changed database fingerprint invalidates a previously generated apply manifest.

## Acceptance criteria

1. SQLite integrity and foreign-key checks pass after changes.
2. All `files` paths still resolve and intervened files match size and SHA-256.
3. No request is automatically marked complete without complete metadata.
4. The first worker candidates no longer include requests already satisfied by exact physical/catalog evidence.
5. All 402 buffer files have a manifest disposition; the 27 unmatched files are safely staged or explicitly blocked.
6. A fresh Hermes session exposes only the four current comic skills.
7. Crons remain paused until a dry-run and one bounded live cycle produce no duplicate download or unsafe movement.
