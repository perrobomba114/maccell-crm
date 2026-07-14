CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE rag_source_type AS ENUM (
    'REPAIR',
    'WIKI',
    'PDF',
    'CHAT_ATTACHMENT'
);

CREATE TYPE rag_authority AS ENUM (
    'CONFIRMED_SUCCESS',
    'TECHNICAL_DOCUMENT',
    'INCOMPLETE',
    'FAILED',
    'UNVERIFIED_ATTACHMENT'
);

CREATE TYPE rag_job_status AS ENUM (
    'PENDING',
    'RUNNING',
    'READY',
    'PARTIAL',
    'FAILED',
    'RETRYING'
);

CREATE TABLE rag_model_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name text NOT NULL,
    dimensions integer NOT NULL CHECK (dimensions = 1024),
    chunking_version text NOT NULL,
    active boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rag_one_active_model
    ON rag_model_versions (active)
    WHERE active;

CREATE TABLE rag_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type rag_source_type NOT NULL,
    source_id text NOT NULL,
    relative_path text,
    sha256 char(64) NOT NULL,
    title text NOT NULL,
    original_brand text NOT NULL,
    original_model text NOT NULL,
    normalized_brand text NOT NULL,
    normalized_model text NOT NULL,
    model_family text,
    document_type text NOT NULL,
    authority rag_authority NOT NULL,
    status rag_job_status NOT NULL DEFAULT 'PENDING',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    retired_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id, sha256)
);

CREATE INDEX rag_documents_source
    ON rag_documents (source_type, source_id, retired_at);

CREATE TABLE rag_device_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_brand text NOT NULL,
    canonical_model text NOT NULL,
    normalized_alias text NOT NULL,
    source_path text NOT NULL,
    confidence real NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (normalized_brand, canonical_model, normalized_alias)
);

CREATE INDEX rag_device_aliases_lookup
    ON rag_device_aliases (normalized_brand, normalized_alias, canonical_model);

CREATE TABLE rag_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    page_number integer NOT NULL CHECK (page_number > 0),
    extracted_text text NOT NULL DEFAULT '',
    extraction_method text NOT NULL CHECK (extraction_method IN ('NATIVE', 'OCR', 'NONE')),
    rendered_path text,
    status rag_job_status NOT NULL DEFAULT 'PENDING',
    error_message varchar(500),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    vision_summary text,
    vision_cached_at timestamptz,
    UNIQUE (document_id, page_number)
);

CREATE TABLE rag_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    page_id uuid REFERENCES rag_pages(id) ON DELETE CASCADE,
    section text,
    symptom text,
    component_codes text[] NOT NULL DEFAULT '{}',
    content text NOT NULL,
    token_count integer NOT NULL CHECK (token_count > 0),
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    embedding vector(1024) NOT NULL,
    model_version_id uuid NOT NULL REFERENCES rag_model_versions(id),
    authority rag_authority NOT NULL,
    normalized_brand text NOT NULL,
    normalized_model text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX rag_chunks_hnsw
    ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX rag_chunks_search
    ON rag_chunks USING gin (search_vector);
CREATE INDEX rag_chunks_components
    ON rag_chunks USING gin (component_codes);
CREATE INDEX rag_chunks_device
    ON rag_chunks (normalized_brand, normalized_model, authority);

CREATE TABLE rag_ingestion_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    source_key text NOT NULL,
    status rag_job_status NOT NULL DEFAULT 'PENDING',
    cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
    attempts integer NOT NULL DEFAULT 0,
    lease_until timestamptz,
    error_message varchar(500),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (job_type, source_key)
);

CREATE INDEX rag_ingestion_jobs_queue
    ON rag_ingestion_jobs (status, lease_until, created_at);

CREATE TABLE rag_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    response_id uuid NOT NULL,
    chunk_id uuid NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
    helpful boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, response_id, chunk_id)
);
