-- Page-level provenance makes stale indexes detectable after an asset changes.
ALTER TABLE schematics.pages
  ADD COLUMN source text NOT NULL DEFAULT 'text',
  ADD COLUMN asset_sha256 char(64);

UPDATE schematics.pages AS page
SET asset_sha256 = asset.sha256
FROM schematics.assets AS asset
WHERE asset.id = page.asset_id AND page.asset_sha256 IS NULL;

ALTER TABLE schematics.pages
  ALTER COLUMN asset_sha256 SET NOT NULL,
  ADD CONSTRAINT schematic_page_source_check CHECK (source IN ('text', 'ocr'));
