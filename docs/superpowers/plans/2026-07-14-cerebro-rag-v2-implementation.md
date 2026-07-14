# Cerebro RAG V2 Implementation Plan

> **Execution mode:** Use `superpowers:executing-plans` task-by-task in an isolated `codex/` worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar Cerebro por un chat técnico unificado para administradores y técnicos, respaldado por un RAG aislado que reconstruye reparaciones históricas e indexa la biblioteca PDF con citas navegables.

**Architecture:** La base principal de MACCELL permanece canónica y el worker accede a ella con permisos de solo lectura. Un PostgreSQL independiente con pgvector almacena documentos, páginas, chunks, jobs, feedback y embeddings BGE-M3 de 1.024 dimensiones. La aplicación consulta el RAG mediante un cliente tipado, aplica filtros obligatorios de marca/modelo y sirve chat y documentos únicamente a `ADMIN` y `TECHNICIAN`.

**Tech Stack:** Next.js 15, React 19, TypeScript estricto, PostgreSQL 15 + pgvector, `pg`, Vercel AI SDK, Groq/OpenRouter, Python 3.12, sentence-transformers BGE-M3, pypdf, Poppler, Tesseract, pytest, Node test runner, Docker/Dokploy MCP.

---

## File map

### Aplicación MACCELL

- Create: `src/lib/cerebro-v2/types.ts` - contratos compartidos del RAG.
- Create: `src/lib/cerebro-v2/access.ts` - autorización `ADMIN`/`TECHNICIAN`.
- Create: `src/lib/cerebro-v2/normalization.ts` - marca, modelo y códigos técnicos.
- Create: `src/lib/cerebro-v2/rag-db.ts` - pool PostgreSQL RAG independiente.
- Create: `src/lib/cerebro-v2/retrieval.ts` - búsqueda híbrida con filtros duros.
- Create: `src/lib/cerebro-v2/prompt.ts` - prompt técnico y serialización de evidencia.
- Create: `src/lib/cerebro-v2/provider.ts` - Groq principal y OpenRouter fallback.
- Create: `src/lib/cerebro-v2/documents.ts` - cliente interno para archivos del worker.
- Create: `src/app/api/cerebro-v2/chat/route.ts` - streaming autenticado.
- Create: `src/app/api/cerebro-v2/documents/[documentId]/route.ts` - proxy PDF autenticado.
- Create: `src/app/api/cerebro-v2/feedback/route.ts` - valoración de fuentes.
- Create: `src/components/cerebro-v2/cerebro-v2-layout.tsx` - contenedor del chat.
- Create: `src/components/cerebro-v2/cerebro-v2-chat.tsx` - mensajes y streaming.
- Create: `src/components/cerebro-v2/cerebro-v2-composer.tsx` - texto y adjuntos.
- Create: `src/components/cerebro-v2/cerebro-source-list.tsx` - citas.
- Create: `src/components/cerebro-v2/cerebro-pdf-viewer.tsx` - visor con página.
- Modify: `src/app/admin/cerebro/page.tsx` - montar V2 mediante feature flag.
- Modify: `src/app/technician/cerebro/page.tsx` - montar V2 mediante feature flag.
- Modify: `src/components/layout/nav-config.ts` - retirar acceso de vendedor.
- Modify: `src/middleware.ts` - reforzar acceso de Cerebro por rol.
- Modify: `package.json` y `package-lock.json` - scripts de evaluación/piloto.

### Worker

- Create: `services/cerebro-rag-worker/pyproject.toml` - dependencias Python.
- Create: `services/cerebro-rag-worker/Dockerfile` - runtime CPU con Poppler/OCR.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/config.py` - configuración validada.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/db.py` - conexiones principal/RAG.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/schema.sql` - esquema e índices.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/models.py` - DTOs.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/normalize.py` - alias.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/authority.py` - resultado real.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/repairs.py` - extracción histórica.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/pdf_inventory.py` - inventario SHA-256.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/pdf_extract.py` - texto/OCR/render.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/chunking.py` - fragmentación.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/embeddings.py` - BGE-M3.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/jobs.py` - lease/reintentos.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/server.py` - health/document streaming interno.
- Create: `services/cerebro-rag-worker/src/cerebro_rag/cli.py` - `init`, `pilot`, `index-pdfs`, `index-repairs`.
- Create: `services/cerebro-rag-worker/tests/` - tests unitarios/integración.
- Create: `infra/cerebro-rag/docker-compose.yml` - worker con biblioteca read-only.
- Create: `scripts/evaluate-cerebro-rag.ts` - métricas del conjunto dorado.
- Create: `docs/cerebro-rag-runbook.md` - operación y rollback MCP.

---

### Task 1: Baseline, secret inventory and production backups

**Files:**
- Modify: none

- [ ] **Step 1: Capture the local baseline**

Run:

```bash
npm test
npx tsc --noEmit
git diff --check
```

Expected: tests pass; TypeScript result is recorded exactly; diff check passes.

- [ ] **Step 2: Inventory credentials exposed by prior Dokploy detail calls**

Create a confidential rotation checklist without copying secret values. PostgreSQL, Groq and repository tokens are rotated through Dokploy MCP immediately before the pilot deployment. AFIP certificate/private key rotation is a separately approved operational change because it can interrupt invoicing; do not rotate it automatically.

Expected: no secret value is written to the repository, terminal transcript or runbook.

- [ ] **Step 3: Create a manual production backup through MCP**

Use Dokploy backup tools for PostgreSQL `cZ6DmTbyOXf3CZGKWa_9b`. If no destination exists, create a filesystem backup under the existing persistent backup policy and verify the resulting file through MCP.

Expected: a dated backup is listed and has non-zero size.

- [ ] **Step 4: Record read-only infrastructure IDs**

Document only non-secret IDs in `docs/cerebro-rag-runbook.md`:

```markdown
## Dokploy resources

- Project: `Zfo4YNibjFdb3eqmD1enP`
- Environment: `ct2CisxOIkYdaQcSguWyh`
- MACCELL application: `Jy-KdfLzVGln7_RK0R44Y`
- Main PostgreSQL: `cZ6DmTbyOXf3CZGKWa_9b`
```

- [ ] **Step 5: Commit the runbook baseline**

```bash
git add docs/cerebro-rag-runbook.md
git commit -m "docs(cerebro): agregar runbook de rag v2"
```

---

### Task 2: Core contracts, authorization and normalization

**Files:**
- Create: `src/lib/cerebro-v2/types.ts`
- Create: `src/lib/cerebro-v2/access.ts`
- Create: `src/lib/cerebro-v2/normalization.ts`
- Test: `src/__tests__/cerebro-v2-access.test.ts`
- Test: `src/__tests__/cerebro-v2-normalization.test.ts`

- [ ] **Step 1: Write failing role tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { canUseCerebroV2 } from "../lib/cerebro-v2/access";

test("allows only admin and technician", () => {
  assert.equal(canUseCerebroV2("ADMIN"), true);
  assert.equal(canUseCerebroV2("TECHNICIAN"), true);
  assert.equal(canUseCerebroV2("VENDOR"), false);
  assert.equal(canUseCerebroV2(undefined), false);
});
```

- [ ] **Step 2: Write failing normalization tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBrand, normalizeModel } from "../lib/cerebro-v2/normalization";

test("normalizes known brands without cross-brand aliases", () => {
  assert.equal(normalizeBrand("smsung"), "SAMSUNG");
  assert.equal(normalizeBrand("iphone"), "APPLE");
  assert.equal(normalizeBrand("Motorola "), "MOTOROLA");
});

test("normalizes Samsung and Apple model aliases", () => {
  assert.equal(normalizeModel("SAMSUNG", "A405FN"), "SM-A405FN");
  assert.equal(normalizeModel("APPLE", "11PM"), "IPHONE 11 PRO MAX");
});
```

- [ ] **Step 3: Run tests and verify failure**

```bash
npm test -- --test-name-pattern="allows only|normalizes"
```

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement strict contracts and pure helpers**

```ts
// src/lib/cerebro-v2/types.ts
export const CEREBRO_SOURCE_TYPES = ["REPAIR", "WIKI", "PDF", "CHAT_ATTACHMENT"] as const;
export type CerebroSourceType = (typeof CEREBRO_SOURCE_TYPES)[number];

export const CEREBRO_AUTHORITIES = [
  "CONFIRMED_SUCCESS",
  "TECHNICAL_DOCUMENT",
  "INCOMPLETE",
  "FAILED",
  "UNVERIFIED_ATTACHMENT",
] as const;
export type CerebroAuthority = (typeof CEREBRO_AUTHORITIES)[number];

export type CerebroSource = {
  chunkId: string;
  documentId: string;
  sourceType: CerebroSourceType;
  authority: CerebroAuthority;
  brand: string;
  model: string;
  title: string;
  pageNumber: number | null;
  score: number;
};
```

```ts
// src/lib/cerebro-v2/access.ts
export function canUseCerebroV2(role: string | undefined): boolean {
  return role === "ADMIN" || role === "TECHNICIAN";
}
```

```ts
// src/lib/cerebro-v2/normalization.ts
const BRAND_ALIASES: Readonly<Record<string, string>> = {
  apple: "APPLE",
  iphone: "APPLE",
  samsung: "SAMSUNG",
  smsung: "SAMSUNG",
  motorola: "MOTOROLA",
  moto: "MOTOROLA",
  xiaomi: "XIAOMI",
  redmi: "XIAOMI",
  huawei: "HUAWEI",
  lg: "LG",
};

export function normalizeBrand(value: string): string {
  const key = value.trim().toLowerCase();
  return BRAND_ALIASES[key] ?? key.toUpperCase();
}

export function normalizeModel(brand: string, value: string): string {
  const clean = value.trim().toUpperCase().replace(/[_\s]+/g, " ");
  if (brand === "SAMSUNG" && /^A405FN$/.test(clean)) return "SM-A405FN";
  if (brand === "APPLE" && clean === "11PM") return "IPHONE 11 PRO MAX";
  return clean;
}
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --test-name-pattern="allows only|normalizes"
git add src/lib/cerebro-v2 src/__tests__/cerebro-v2-access.test.ts src/__tests__/cerebro-v2-normalization.test.ts
git commit -m "feat(cerebro): agregar contratos y normalizacion v2"
```

Expected: PASS.

---

### Task 3: Isolated RAG schema

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/schema.sql`
- Test: `services/cerebro-rag-worker/tests/test_schema.py`

- [ ] **Step 1: Write the schema integration assertion**

```py
def test_schema_has_fixed_vector_dimension(rag_connection):
    row = rag_connection.execute("""
      SELECT format_type(a.atttypid, a.atttypmod)
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'rag_chunks' AND a.attname = 'embedding'
    """).fetchone()
    assert row[0] == "vector(1024)"
```

- [ ] **Step 2: Create the complete additive schema**

Create `schema.sql` with:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE rag_source_type AS ENUM ('REPAIR','WIKI','PDF','CHAT_ATTACHMENT');
CREATE TYPE rag_authority AS ENUM ('CONFIRMED_SUCCESS','TECHNICAL_DOCUMENT','INCOMPLETE','FAILED','UNVERIFIED_ATTACHMENT');
CREATE TYPE rag_job_status AS ENUM ('PENDING','RUNNING','READY','PARTIAL','FAILED','RETRYING');

CREATE TABLE rag_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  dimensions integer NOT NULL CHECK (dimensions = 1024),
  chunking_version text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rag_one_active_model ON rag_model_versions (active) WHERE active;

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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, sha256)
);

CREATE TABLE rag_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  extracted_text text NOT NULL DEFAULT '',
  extraction_method text NOT NULL CHECK (extraction_method IN ('NATIVE','OCR','NONE')),
  rendered_path text,
  status rag_job_status NOT NULL DEFAULT 'PENDING',
  error_message text,
  UNIQUE(document_id, page_number)
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

CREATE INDEX rag_chunks_hnsw ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX rag_chunks_search ON rag_chunks USING gin (search_vector);
CREATE INDEX rag_chunks_components ON rag_chunks USING gin (component_codes);
CREATE INDEX rag_chunks_device ON rag_chunks (normalized_brand, normalized_model, authority);

CREATE TABLE rag_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  source_key text NOT NULL,
  status rag_job_status NOT NULL DEFAULT 'PENDING',
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_type, source_key)
);

CREATE TABLE rag_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  chunk_id uuid NOT NULL REFERENCES rag_chunks(id) ON DELETE CASCADE,
  helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: Run against an ephemeral pgvector container**

```bash
docker run --rm -d --name maccell-rag-test -e POSTGRES_PASSWORD=test -p 55432:5432 pgvector/pgvector:pg15
psql postgresql://postgres:test@localhost:55432/postgres -f services/cerebro-rag-worker/src/cerebro_rag/schema.sql
pytest services/cerebro-rag-worker/tests/test_schema.py -q
docker stop maccell-rag-test
```

Expected: schema applies and test passes.

- [ ] **Step 4: Commit**

```bash
git add services/cerebro-rag-worker/src/cerebro_rag/schema.sql services/cerebro-rag-worker/tests/test_schema.py
git commit -m "feat(cerebro): crear esquema rag aislado"
```

---

### Task 4: Worker foundation and resumable jobs

**Files:**
- Create: `services/cerebro-rag-worker/pyproject.toml`
- Create: `services/cerebro-rag-worker/Dockerfile`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/config.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/db.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/models.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/jobs.py`
- Test: `services/cerebro-rag-worker/tests/test_jobs.py`

- [ ] **Step 1: Write failing lease and retry tests**

Test that only one worker can lease a job, expired jobs return to `RETRYING`, attempt count increments and error messages are capped at 500 characters.

- [ ] **Step 2: Define worker dependencies**

```toml
[project]
name = "maccell-cerebro-rag-worker"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi==0.116.1",
  "uvicorn==0.35.0",
  "psycopg[binary,pool]==3.2.9",
  "pydantic-settings==2.10.1",
  "sentence-transformers==5.0.0",
  "pypdf==5.8.0",
  "pdf2image==1.17.0",
  "pytesseract==0.3.13",
]

[project.optional-dependencies]
test = ["pytest==8.4.1", "testcontainers[postgres]==4.10.0"]

[tool.pytest.ini_options]
pythonpath = ["src"]
```

- [ ] **Step 3: Implement validated configuration**

`config.py` must require `SOURCE_DATABASE_URL`, `RAG_DATABASE_URL`, `INTERNAL_API_SECRET`, `LIBRARY_ROOT=/library`, `PAGE_CACHE_ROOT=/page-cache`, `EMBEDDING_MODEL=BAAI/bge-m3`, `BATCH_SIZE=8`, and reject writable or missing library roots at startup.

- [ ] **Step 4: Implement transactional job leasing**

Use `SELECT ... FOR UPDATE SKIP LOCKED`, a five-minute lease, maximum three attempts, and `RETRYING` before terminal `FAILED`.

- [ ] **Step 5: Build the worker image**

Dockerfile must use `python:3.12-slim`, install `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-spa`, run as a non-root user, expose `8080`, and start `uvicorn cerebro_rag.server:app`.

- [ ] **Step 6: Run tests and commit**

```bash
cd services/cerebro-rag-worker
python -m pytest tests/test_jobs.py -q
docker build -t maccell-rag-worker:test .
git add services/cerebro-rag-worker
git commit -m "feat(cerebro): agregar worker rag reanudable"
```

Expected: tests pass and image builds.

---

### Task 5: Historical repair reconstruction

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/normalize.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/authority.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/repairs.py`
- Test: `services/cerebro-rag-worker/tests/test_authority.py`
- Test: `services/cerebro-rag-worker/tests/test_repairs.py`

- [ ] **Step 1: Write failing authority tests**

Cover: status `Finalizado OK`, delivery after an OK transition, `No Reparado`, paused/waiting confirmation, missing diagnosis, removal of prices/phone/email, and Samsung/Apple alias isolation.

- [ ] **Step 2: Implement authority as a pure function**

```py
from enum import StrEnum

class Authority(StrEnum):
    CONFIRMED_SUCCESS = "CONFIRMED_SUCCESS"
    INCOMPLETE = "INCOMPLETE"
    FAILED = "FAILED"

def classify_authority(status_name: str, prior_status_names: list[str], diagnosis: str) -> Authority:
    normalized = status_name.strip().lower()
    prior = {value.strip().lower() for value in prior_status_names}
    if normalized == "finalizado ok" or "finalizado ok" in prior:
        return Authority.CONFIRMED_SUCCESS
    if normalized == "no reparado":
        return Authority.FAILED
    return Authority.INCOMPLETE
```

- [ ] **Step 3: Implement one set-based read-only query**

Fetch repairs with nested observations, parts and ordered status history without N+1. Select only technical primitive fields. Do not select customer, price, cost, email or phone columns.

- [ ] **Step 4: Build canonical content**

Serialize `DISPOSITIVO`, `PROBLEMA`, `DIAGNOSTICO`, `SOLUCION`, `REPUESTOS`, `ESTADO` and `EVIDENCIA`. Strip price-like currency expressions and PII before hashing.

- [ ] **Step 5: Verify production sample read-only**

Run the worker in `--dry-run --limit 50`. Expected: zero writes to the main database, 50 normalized documents, no customer fields, and authority distribution printed only as aggregate counts.

- [ ] **Step 6: Run tests and commit**

```bash
python -m pytest services/cerebro-rag-worker/tests/test_authority.py services/cerebro-rag-worker/tests/test_repairs.py -q
git add services/cerebro-rag-worker/src/cerebro_rag services/cerebro-rag-worker/tests
git commit -m "feat(cerebro): reconstruir historico tecnico"
```

---

### Task 6: PDF inventory, extraction and multimodal pages

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/pdf_inventory.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/pdf_extract.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/chunking.py`
- Test: `services/cerebro-rag-worker/tests/test_pdf_inventory.py`
- Test: `services/cerebro-rag-worker/tests/test_pdf_extract.py`
- Test: `services/cerebro-rag-worker/tests/test_chunking.py`

- [ ] **Step 1: Add fixture copies of metadata, not proprietary PDFs**

Tests use generated minimal PDF fixtures and path strings matching:

```text
SAMSUNG/Serie A/SM-A405FN/SM-A405FN_Manual de Servicio.pdf
Motorola /Moto Z/Moto Z4/Esquematico completo XT1980 (Moto Z4).pdf
iPhone/iPhone 11 Pro Max/iPhone 11 Pro Max.pdf
```

- [ ] **Step 2: Write failing parser and chunk tests**

Assert canonical brand/model/type, SHA-256 deduplication, native extraction above 40 characters, OCR fallback at or below 40 characters, page retention, 700-token chunks with 100-token overlap, and component extraction such as `U5002`, `R5017`, `TP4003`.

- [ ] **Step 3: Implement inventory**

Use `Path.rglob("*.pdf")`, reject symlinks escaping `/library`, hash in 1 MiB blocks, and upsert inventory without opening unchanged files.

- [ ] **Step 4: Implement extraction**

Use pypdf first. Render every indexed page at 144 DPI. Invoke Tesseract `eng+spa` only for low-text pages. Store cache paths by document hash and page number.

- [ ] **Step 5: Implement semantic page chunking**

Preserve page boundary and repeated component codes. Never mix two documents or pages in one chunk. Add section labels from headings and technical keyword groups.

- [ ] **Step 6: Verify the two SM-A405FN samples**

Expected:

- Schematic: 9 pages, at least 8 native-text pages.
- Manual: 46 pages, at least 45 native-text pages.
- Every chunk cites document and page.
- No OCR on pages with useful native text.

- [ ] **Step 7: Run tests and commit**

```bash
python -m pytest services/cerebro-rag-worker/tests/test_pdf_inventory.py services/cerebro-rag-worker/tests/test_pdf_extract.py services/cerebro-rag-worker/tests/test_chunking.py -q
git add services/cerebro-rag-worker
git commit -m "feat(cerebro): indexar pdf por pagina y seccion"
```

---

### Task 7: BGE-M3 embeddings and idempotent writes

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/embeddings.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/cli.py`
- Test: `services/cerebro-rag-worker/tests/test_embeddings.py`
- Test: `services/cerebro-rag-worker/tests/test_idempotency.py`

- [ ] **Step 1: Write failing dimension and idempotency tests**

Assert 1.024 dimensions, normalized vectors, batch size at most 8, one document per source/hash and no duplicate chunks after two identical runs.

- [ ] **Step 2: Implement a process singleton**

Load `BAAI/bge-m3` once, set CPU thread limits, normalize embeddings and expose `embed_passages()` plus `embed_query()`.

- [ ] **Step 3: Implement transactional replacement**

For changed SHA only: insert new document/pages/chunks in one transaction, mark ready, then retire previous document version. A failure must rollback the new version and leave the prior ready version searchable.

- [ ] **Step 4: Run tests and commit**

```bash
python -m pytest services/cerebro-rag-worker/tests/test_embeddings.py services/cerebro-rag-worker/tests/test_idempotency.py -q
git add services/cerebro-rag-worker
git commit -m "feat(cerebro): generar embeddings bge m3"
```

---

### Task 8: Hybrid retrieval with hard brand isolation

**Files:**
- Create: `src/lib/cerebro-v2/rag-db.ts`
- Create: `src/lib/cerebro-v2/retrieval.ts`
- Test: `src/__tests__/cerebro-v2-retrieval.test.ts`

- [ ] **Step 1: Write failing isolation tests with a fake query adapter**

Fixtures contain Samsung and Apple chunks with identical symptoms. Assert a Samsung query returns zero Apple chunks, failed evidence ranks after confirmed/documental evidence, exact model ranks before family and component-code hits survive weak semantic similarity.

- [ ] **Step 2: Implement a global PostgreSQL pool**

Use `pg.Pool` cached on `globalThis`, require `RAG_DATABASE_URL`, cap pool size at 10, set statement timeout to 1.5 seconds, and never fall back to `DATABASE_URL`.

- [ ] **Step 3: Implement parameterized hybrid SQL**

Filter `normalized_brand = $brand` before ranking. Exact model candidates, declared family candidates, full-text candidates and vector candidates are fused after max-score normalization. Authority weights are explicit and failed evidence cannot occupy the first result.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --test-name-pattern="cerebro v2 retrieval"
git add src/lib/cerebro-v2 src/__tests__/cerebro-v2-retrieval.test.ts
git commit -m "feat(cerebro): agregar busqueda hibrida aislada"
```

---

### Task 9: Provider fallback and direct technical prompt

**Files:**
- Create: `src/lib/cerebro-v2/provider.ts`
- Create: `src/lib/cerebro-v2/prompt.ts`
- Test: `src/__tests__/cerebro-v2-provider.test.ts`
- Test: `src/__tests__/cerebro-v2-prompt.test.ts`

- [ ] **Step 1: Write failing fallback tests**

Verify Groq key rotation, `maxRetries: 0`, OpenRouter only after all Groq candidates fail, and no secret fragments in error messages.

- [ ] **Step 2: Write failing prompt tests**

Assert explicit source delimiters, no prices, mandatory same-brand instruction, failed-case labels, direct answer sections and source IDs preserved outside user-controlled text.

- [ ] **Step 3: Implement provider adapter**

Return a Vercel AI SDK model plus provider metadata. Do not implement streaming fallback after bytes were already emitted; select a provider before response streaming using a bounded probe.

- [ ] **Step 4: Implement prompt builder**

Input is typed evidence, not arbitrary concatenated SQL rows. Cap each source and total context. Use sections: Diagnóstico probable, Evidencia MACCELL, Evidencia documental, Mediciones, Intervención sugerida and Fuentes.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --test-name-pattern="cerebro v2 provider|cerebro v2 prompt"
git add src/lib/cerebro-v2 src/__tests__/cerebro-v2-provider.test.ts src/__tests__/cerebro-v2-prompt.test.ts
git commit -m "feat(cerebro): agregar prompt directo y fallback"
```

---

### Task 10: Authenticated APIs and document streaming

**Files:**
- Create: `src/app/api/cerebro-v2/chat/route.ts`
- Create: `src/app/api/cerebro-v2/documents/[documentId]/route.ts`
- Create: `src/app/api/cerebro-v2/feedback/route.ts`
- Create: `src/lib/cerebro-v2/documents.ts`
- Test: `src/__tests__/cerebro-v2-api-auth.test.ts`
- Test: `src/__tests__/cerebro-v2-document-path.test.ts`

- [ ] **Step 1: Write route guard tests**

Assert `401` without session, `403` for vendor, success path for admin/technician, auth before body parsing, invalid document ID `400`, unauthorized source `404` and path traversal rejection.

- [ ] **Step 2: Implement chat route**

Validate request with Zod, detect device context, retrieve evidence, build prompt and stream. Return typed source metadata in the UI stream. Never expose provider key identifiers.

- [ ] **Step 3: Implement document proxy**

Resolve document by ID from RAG DB, call the worker internal endpoint using `RAG_INTERNAL_SECRET`, forward `Range`, `Content-Type`, `Content-Length`, `Content-Range` and `Accept-Ranges`, and never return a host path.

- [ ] **Step 4: Implement feedback route**

Insert only current user ID, chunk ID and boolean helpful. Reject chunk IDs not present in the cited response payload.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --test-name-pattern="cerebro v2 api|document path"
git add src/app/api/cerebro-v2 src/lib/cerebro-v2 src/__tests__
git commit -m "feat(cerebro): agregar apis rag autenticadas"
```

---

### Task 11: Unified chat and PDF viewer

**Files:**
- Create: `src/components/cerebro-v2/cerebro-v2-layout.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-chat.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-composer.tsx`
- Create: `src/components/cerebro-v2/cerebro-source-list.tsx`
- Create: `src/components/cerebro-v2/cerebro-pdf-viewer.tsx`
- Modify: `src/app/admin/cerebro/page.tsx`
- Modify: `src/app/technician/cerebro/page.tsx`
- Modify: `src/components/layout/nav-config.ts`
- Modify: `src/middleware.ts`
- Test: `src/__tests__/cerebro-v2-navigation.test.ts`

- [ ] **Step 1: Write failing navigation/role tests**

Assert vendor navigation has no Cerebro, admin and technician routes use V2 under the feature flag, and vendor direct navigation is redirected/forbidden.

- [ ] **Step 2: Build components below 300 lines**

Use one reducer for chat state. Composer accepts text, images and PDF with size/type validation. Source list opens repairs or the internal PDF viewer at `?page=N`. No `CustomEvent`, `setInterval` or conditional hooks.

- [ ] **Step 3: Keep rollback flag server-side**

Use `CEREBRO_V2_ENABLED === "true"` in server pages. Admin/technician receive V2 when enabled; otherwise existing `CerebroLayout` remains available during stabilization.

- [ ] **Step 4: Run tests and local browser verification**

```bash
npm test -- --test-name-pattern="cerebro v2 navigation"
npm run dev
```

Verify admin, technician, vendor denial, streaming, attachment preview, citations, viewer page jump and mobile layout.

- [ ] **Step 5: Commit**

```bash
git add src/components/cerebro-v2 src/app/admin/cerebro src/app/technician/cerebro src/components/layout/nav-config.ts src/middleware.ts src/__tests__/cerebro-v2-navigation.test.ts
git commit -m "feat(cerebro): reemplazar interfaz por chat unificado"
```

---

### Task 12: Golden-set evaluation and pilot commands

**Files:**
- Create: `scripts/evaluate-cerebro-rag.ts`
- Create: `docs/cerebro-rag-golden-set.json`
- Modify: `package.json`
- Test: `src/__tests__/cerebro-v2-evaluation.test.ts`

- [ ] **Step 1: Define the JSON schema and metric tests**

Each case includes query, normalized brand/model, expected source IDs/pages and forbidden brands. Metrics calculate Recall@10, MRR@10, citation validity and contamination.

- [ ] **Step 2: Add 100 real, redacted cases**

Use production-derived technical terms without customer data. Include at least 15 Samsung, 15 Motorola, 15 Apple, 15 Xiaomi, 10 Huawei, 10 LG and 20 cross-brand adversarial/component-code cases.

- [ ] **Step 3: Add scripts**

```json
{
  "rag:evaluate": "tsx scripts/evaluate-cerebro-rag.ts",
  "rag:pilot": "docker compose -f infra/cerebro-rag/docker-compose.yml run --rm worker pilot"
}
```

- [ ] **Step 4: Enforce gates**

Exit non-zero unless Recall@10 >= 0.90, MRR@10 >= 0.75, citation validity = 1, cross-brand contamination = 0 and p95 retrieval < 2 seconds.

- [ ] **Step 5: Run and commit**

```bash
npm test -- --test-name-pattern="cerebro v2 evaluation"
npm run rag:evaluate
git add scripts/evaluate-cerebro-rag.ts docs/cerebro-rag-golden-set.json package.json package-lock.json src/__tests__/cerebro-v2-evaluation.test.ts
git commit -m "test(cerebro): agregar evaluacion dorada rag"
```

---

### Task 13: Dokploy MCP pilot infrastructure

**Files:**
- Create: `infra/cerebro-rag/docker-compose.yml`
- Modify: `docs/cerebro-rag-runbook.md`

- [ ] **Step 1: Create the dedicated PostgreSQL through MCP**

Call `postgres.create` in environment `ct2CisxOIkYdaQcSguWyh` with image `pgvector/pgvector:pg15`, generated unique user/password, name `maccell-rag-db`, database `maccell_rag`. Set CPU limit 4, memory limit 16 GiB, restart on failure and mount `/var/lib/maccell/rag-postgres` at `/var/lib/postgresql/data` through MCP.

Expected: health green; `CREATE EXTENSION vector` succeeds; vector version is returned without exposing credentials.

- [ ] **Step 2: Create the worker compose through MCP**

Use `compose.create`, configure the repository source and `infra/cerebro-rag/docker-compose.yml`, mount `/mnt/data2:/library:ro` and `/var/lib/maccell/rag-pages:/page-cache`, set CPU limit 8 and memory limit 24 GiB, then deploy.

- [ ] **Step 3: Create the source read-only role**

Run one reviewed SQL script against the main DB:

```sql
BEGIN;
CREATE ROLE rag_reader LOGIN PASSWORD :'generated_password';
GRANT CONNECT ON DATABASE maccell TO rag_reader;
GRANT USAGE ON SCHEMA public TO rag_reader;
GRANT SELECT ON repairs, repair_statuses, repair_status_history,
  repair_observations, repair_parts, spare_parts, repair_knowledge
  TO rag_reader;
COMMIT;
```

Before executing, verify every table against `prisma/schema.prisma` and `to_regclass`; abort if any mapped name differs. Verify writes fail for `rag_reader` and reads succeed.

- [ ] **Step 4: Initialize schema and run SM-A405FN pilot**

Run worker commands through Dokploy compose exec/command support:

```bash
python -m cerebro_rag.cli init
python -m cerebro_rag.cli pilot --model SM-A405FN --repair-limit 50
```

Expected: 2 PDF, 55 pages, chunks with 1.024-dimensional vectors, 50 repair documents, no failed jobs and source DB write test denied.

- [ ] **Step 5: Inspect MCP logs and commit infrastructure config**

No secret, prompt, PII or full diagnosis may appear in logs.

```bash
git add infra/cerebro-rag/docker-compose.yml docs/cerebro-rag-runbook.md
git commit -m "chore(deploy): agregar infraestructura cerebro rag"
```

---

### Task 14: Full indexing, shadow mode and cutover

**Files:**
- Modify: `docs/cerebro-rag-runbook.md`

- [ ] **Step 1: Index all PDFs resumably**

Trigger `index-pdfs` through MCP. Monitor aggregate jobs only. Stop automatically if failure rate exceeds 5%, filesystem free space drops below 100 GiB, or worker load threatens MACCELL.

- [ ] **Step 2: Index all historical repairs**

Trigger `index-repairs`. Verify eligible source coverage, authority distribution, PII scan and zero source writes.

- [ ] **Step 3: Run the full golden set**

Do not continue unless every gate in Task 12 passes.

- [ ] **Step 4: Deploy application with V2 disabled**

Use MCP to save `RAG_DATABASE_URL`, `RAG_WORKER_INTERNAL_URL`, `RAG_INTERNAL_SECRET`, `CEREBRO_V2_ENABLED=false` and provider secrets. Deploy and verify existing Cerebro plus health routes.

- [ ] **Step 5: Shadow retrieval**

For seven days, execute V2 retrieval without changing user-visible answers. Store only metrics and source IDs, not prompts. Review contamination, latency and failure rate daily.

- [ ] **Step 6: Enable administrators**

Use a role rollout flag or admin-only gate for 48 hours. Verify PDF citations and feedback.

- [ ] **Step 7: Enable technicians**

Set `CEREBRO_V2_ENABLED=true` through MCP and redeploy. Confirm vendor receives `403`.

- [ ] **Step 8: Document rollback drill**

Set flag false, redeploy through MCP, verify old Cerebro works, then restore true. Record timestamps and result in runbook.

- [ ] **Step 9: Final production safety verification**

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
npm test
git diff --check
```

Expected: all gates pass; unresolved errors are listed explicitly.

- [ ] **Step 10: Commit operational results**

```bash
git add docs/cerebro-rag-runbook.md
git commit -m "docs(cerebro): registrar activacion rag v2"
```

---

### Task 15: Stabilization and retirement decision

**Files:**
- Modify: `docs/cerebro-rag-runbook.md`

- [ ] **Step 1: Observe 14 days of production metrics**

Track p50/p95 retrieval, provider failures, no-evidence responses, citation opens, helpful feedback, failed jobs and cross-brand guard rejections.

- [ ] **Step 2: Re-run golden set after model/index changes**

No model or chunking change may become active without a new model version and full gate pass.

- [ ] **Step 3: Decide retirement separately**

Only after explicit user approval, remove old navigation/code and later archive old vector tables. Never delete repairs, Wiki or source PDF.

- [ ] **Step 4: Commit stabilization report**

```bash
git add docs/cerebro-rag-runbook.md
git commit -m "docs(cerebro): cerrar estabilizacion rag v2"
```
