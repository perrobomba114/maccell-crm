-- Additive repair notebook tables. They do not change repair status or financial data.
CREATE TABLE schematics.repair_consultations (
  id text PRIMARY KEY,
  repair_id text NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES schematics.assets(id),
  author_id text NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_consultations_actor_asset_key UNIQUE (repair_id, asset_id, author_id)
);

CREATE INDEX repair_consultations_repair_idx
  ON schematics.repair_consultations(repair_id, created_at DESC);

CREATE TABLE schematics.repair_entries (
  id text PRIMARY KEY,
  repair_id text NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES schematics.assets(id),
  pdf_asset_id text REFERENCES schematics.assets(id),
  component varchar(120),
  pad varchar(120),
  kind text NOT NULL CHECK (kind IN ('note', 'measurement')),
  evidence text NOT NULL CHECK (evidence IN ('measured', 'documented')),
  unit varchar(30),
  value double precision CHECK (value IS NULL OR value NOT IN ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)),
  note varchar(2000),
  page_number integer CHECK (page_number IS NULL OR page_number > 0),
  document_url varchar(1000),
  author_id text NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_entry_payload_check CHECK (
    (kind = 'note' AND note IS NOT NULL) OR
    (kind = 'measurement' AND value IS NOT NULL AND unit IS NOT NULL)
  ),
  CONSTRAINT documented_entry_source_check CHECK (
    evidence <> 'documented' OR (pdf_asset_id IS NOT NULL AND page_number IS NOT NULL)
  )
);

CREATE INDEX repair_entries_repair_idx
  ON schematics.repair_entries(repair_id, created_at DESC);
CREATE INDEX repair_entries_asset_idx
  ON schematics.repair_entries(asset_id, component, pad);
