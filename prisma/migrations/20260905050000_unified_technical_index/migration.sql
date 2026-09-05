CREATE TABLE IF NOT EXISTS schematics.technical_indexes (
  asset_id text PRIMARY KEY REFERENCES schematics.assets(id) ON DELETE CASCADE,
  asset_sha256 text NOT NULL,
  index_version integer NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS schematics.index_jobs (
  asset_id text PRIMARY KEY REFERENCES schematics.assets(id) ON DELETE CASCADE,
  asset_sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','indexed','failed')),
  error text,
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS technical_index_jobs_status ON schematics.index_jobs(status,updated_at);

ALTER TABLE schematics.technical_indexes ADD COLUMN IF NOT EXISTS file_mtime_ms double precision;
ALTER TABLE schematics.technical_indexes ADD COLUMN IF NOT EXISTS file_size bigint;
