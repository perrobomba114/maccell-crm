-- Dedicated namespace: managed by this migration, independent of Prisma's public models.
CREATE SCHEMA IF NOT EXISTS schematics;
CREATE TABLE schematics.assets (
  id text PRIMARY KEY,
  relative_path text NOT NULL UNIQUE,
  sha256 char(64) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pcbe', 'pdf')),
  model_key text NOT NULL,
  metadata jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX schematic_assets_model_idx ON schematics.assets(model_key, kind);
CREATE TABLE schematics.pages (
  asset_id text NOT NULL REFERENCES schematics.assets(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  content text NOT NULL,
  PRIMARY KEY (asset_id, page_number)
);
