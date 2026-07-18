# Cerebro Evidence Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cerebro a local, evidence-first diagnostic agent that reads schematics, searches external technical sources when RAG evidence is insufficient, and learns from audited successful repair closures.

**Architecture:** The existing RAG remains canonical for manuals and confirmed repairs. A local OpenAI-compatible Qwen endpoint becomes the primary diagnostic provider. Visual extraction, external web evidence, guided measurements, closure learning records, and LoRA dataset export are separate bounded services; only audited closures can become training records or high-authority repair evidence.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma/PostgreSQL, isolated pgvector RAG worker (Python), llama.cpp OpenAI-compatible API, Qwen3.6, VLM endpoint, Google Custom Search/YouTube Data API with DuckDuckGo fallback, Node test runner and pytest.

---

## File structure

- `src/lib/cerebro-v2/local-provider.ts`: creates an authenticated local OpenAI-compatible model and exposes health-safe configuration.
- `src/lib/cerebro-v2/evidence-contract.ts`: source authority, web/vision evidence DTOs, bounded JSON parsing, and prompt serialization.
- `src/lib/cerebro-v2/web-research.ts`: Google-first, YouTube transcript-aware, DDG-fallback research with source metadata and strict budgets.
- `src/lib/cerebro-v2/vision-analysis.ts`: asks a VLM for visible schematic facts and caches the result through the worker.
- `src/lib/cerebro-v2/closure-learning.ts`: validates/sanitizes the structured technical closure and decides eligibility for RAG/training.
- `src/lib/cerebro-v2/training-export.ts`: emits versioned, redacted SFT examples only from audited records.
- `src/app/api/cerebro-v2/chat/route.ts`: routes local inference, evidence gathering, citations, and controlled fallback.
- `src/app/api/cerebro-v2/closure/route.ts`: authenticated creation/review of a closure-learning record.
- `src/app/api/cerebro-v2/training/export/route.ts`: admin-only dataset export.
- `src/actions/repairs/tech-status.ts` and finish UI modules: persist the closure record when status transitions to Finalizado OK.
- `services/cerebro-rag-worker/src/cerebro_rag/*`: RAG schema, worker APIs, repair serialization, vision cache and training export support.
- `infra/cerebro-rag*/`: environment variables and internal service topology; no public GPU endpoint is introduced.
- `src/__tests__/cerebro-v2-*.test.ts` and worker pytest files: regression coverage for all authority and grounding rules.

### Task 1: Add typed learning records and a safe repair-close contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/cerebro-v2/closure-learning.ts`
- Create: `src/lib/cerebro-v2/closure-contract.ts`
- Create: `src/app/api/cerebro-v2/closure/route.ts`
- Test: `src/__tests__/cerebro-v2-closure-learning.test.ts`

- [ ] **Step 1: Write failing closure eligibility tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildClosureLearningRecord } from "@/lib/cerebro-v2/closure-learning";

const complete = {
  symptom: "Enciende pero no da imagen",
  rootCause: "Conector FPC de display abierto",
  confirmingEvidence: "Continuidad abierta entre pin 12 del FPC y R1201",
  intervention: "Se rehizo la pista entre FPC y R1201",
  verification: "Imagen estable con módulo probado",
  affectedReferences: ["J1200", "R1201"],
};

test("promotes only a complete Finalizado OK closure", () => {
  assert.equal(buildClosureLearningRecord("Finalizado OK", complete).authority, "CONFIRMED_SUCCESS");
  assert.equal(buildClosureLearningRecord("Finalizado OK", { ...complete, verification: "" }).authority, "INCOMPLETE");
  assert.equal(buildClosureLearningRecord("No reparado", complete).authority, "FAILED");
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `npm test -- --test-name-pattern="promotes only a complete"`

Expected: FAIL because `closure-learning` does not exist.

- [ ] **Step 3: Add the Prisma model and strict payload validation**

Add `RepairLearningRecord` related one-to-one to `Repair`, with immutable technician snapshot, `status`, structured fields, citations JSON, `reviewedBy`, `reviewedAt`, and `trainingEligible`. Use a Zod payload with minimum technical text lengths, a maximum of 12 component references, and redaction of phone/email/price patterns before persistence.

```ts
export const closureLearningSchema = z.object({
  symptom: z.string().trim().min(8).max(1_500),
  rootCause: z.string().trim().min(8).max(2_000),
  confirmingEvidence: z.string().trim().min(8).max(3_000),
  intervention: z.string().trim().min(8).max(3_000),
  verification: z.string().trim().min(8).max(2_000),
  affectedReferences: z.array(z.string().trim().min(2).max(32)).max(12).default([]),
  schematicPages: z.array(z.object({ documentId: z.string().uuid(), pageNumber: z.number().int().positive() })).max(8).default([]),
  externalSources: z.array(z.object({ url: z.string().url(), title: z.string().max(300) })).max(5).default([]),
});
```

- [ ] **Step 4: Implement authority derivation and authenticated API route**

`buildClosureLearningRecord` returns `CONFIRMED_SUCCESS` only for `Finalizado OK` plus every required field. The route authenticates first, verifies the repair is assigned to the technician or requester is admin, and upserts the record. It must never accept `repairId`, status, authority, or reviewer identity from an untrusted client without server-side verification.

- [ ] **Step 5: Run focused tests and Prisma generation**

Run: `npx prisma generate && npm test -- --test-name-pattern="closure|promotes only"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/cerebro-v2/closure-learning.ts src/lib/cerebro-v2/closure-contract.ts src/app/api/cerebro-v2/closure/route.ts src/__tests__/cerebro-v2-closure-learning.test.ts
git commit -m "feat(cerebro): registrar cierres tecnicos auditables"
```

### Task 2: Capture the closure in the Finalizado OK workflow

**Files:**
- Modify: `src/actions/repairs/tech-status.ts`
- Modify: `src/components/repairs/finish-modal.tsx`
- Create: `src/components/repairs/repair-learning-closure-fields.tsx`
- Test: `src/__tests__/cerebro-v2-closure-transition.test.ts`

- [ ] **Step 1: Write failing transition tests**

```ts
test("does not mark a repair as training eligible without a complete technical closure", () => {
  assert.equal(shouldRequireLearningClosure(REPAIR_STATUS.OK), true);
  assert.equal(shouldRequireLearningClosure(REPAIR_STATUS.NO_REPAIR), false);
});
```

- [ ] **Step 2: Add an isolated closure-fields component**

Render the required five technical fields only when the selected status is `REPAIR_STATUS.OK`. Keep draft values in the finish modal state, submit them as `closureLearning` JSON, and show field-level validation errors returned by the server. Do not add state updates during render.

- [ ] **Step 3: Update the server action atomically**

Replace hard-coded final status arrays in the touched flow with shared repair status constants. In one `db.$transaction`, update the repair/status history and upsert the learning record when the transition is OK. If closure validation fails, return a field error before mutating the repair.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --test-name-pattern="training eligible|closure transition"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/actions/repairs/tech-status.ts src/components/repairs/finish-modal.tsx src/components/repairs/repair-learning-closure-fields.tsx src/__tests__/cerebro-v2-closure-transition.test.ts
git commit -m "feat(repairs): capturar aprendizaje al finalizar ok"
```

### Task 3: Serialize only approved closures into the RAG

**Files:**
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/repairs.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/repair_indexer.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/repair_sync.py`
- Test: `services/cerebro-rag-worker/tests/test_repairs.py`
- Test: `services/cerebro-rag-worker/tests/test_repair_sync.py`

- [ ] **Step 1: Write failing worker tests**

```py
def test_complete_reviewed_closure_is_serialized_as_confirmed_solution() -> None:
    source = make_source(status="Finalizado OK", closure=complete_reviewed_closure())
    content = build_repair_content(source)
    assert "CAUSA_CONFIRMADA: Conector FPC" in content
    assert "VERIFICACION_FINAL: Imagen estable" in content
    assert classify_authority(source.current_status, [], source.diagnosis, source.closure) is Authority.CONFIRMED_SUCCESS

def test_unreviewed_closure_never_becomes_training_quality_evidence() -> None:
    source = make_source(status="Finalizado OK", closure=complete_unreviewed_closure())
    assert classify_authority(source.current_status, [], source.diagnosis, source.closure) is Authority.INCOMPLETE
```

- [ ] **Step 2: Extend the read-only repair export query**

Join the learning-record table and export only primitive structured columns, review timestamp, reviewer identifier and source citations. Keep the main database source connection read-only.

- [ ] **Step 3: Make authority explicit and preserve failed counterexamples**

`CONFIRMED_SUCCESS` requires Finalizado OK, a complete reviewed closure and useful technical content. `FAILED` remains available but is never serialized as a solution. The content sections must be `HECHOS_MEDIDOS`, `CAUSA_CONFIRMADA`, `INTERVENCION`, `VERIFICACION_FINAL`, `REFERENCIAS_AFECTADAS` and `FUENTES`.

- [ ] **Step 4: Run worker tests**

Run: `cd services/cerebro-rag-worker && pytest tests/test_repairs.py tests/test_repair_sync.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/cerebro-rag-worker/src/cerebro_rag/repairs.py services/cerebro-rag-worker/src/cerebro_rag/repair_indexer.py services/cerebro-rag-worker/src/cerebro_rag/repair_sync.py services/cerebro-rag-worker/tests/test_repairs.py services/cerebro-rag-worker/tests/test_repair_sync.py
git commit -m "feat(cerebro): indexar cierres tecnicos confirmados"
```

### Task 4: Add local Qwen provider with safe fallback ordering

**Files:**
- Create: `src/lib/cerebro-v2/local-provider.ts`
- Modify: `src/lib/cerebro/models.ts`
- Modify: `src/app/api/cerebro-v2/chat/route.ts`
- Modify: `scripts/cerebro-v2-evaluate.ts`
- Test: `src/__tests__/cerebro-v2-local-provider.test.ts`

- [ ] **Step 1: Write provider selection tests**

```ts
test("uses the configured local endpoint before Groq", () => {
  assert.deepEqual(providerOrder({ localBaseUrl: "http://10.0.0.2:8000/v1", groqKeys: ["key"] }), ["local", "groq"]);
});

test("does not expose a local endpoint without an allowlisted private URL", () => {
  assert.throws(() => parseLocalModelConfig({ baseUrl: "https://public.example.com/v1" }));
});
```

- [ ] **Step 2: Implement a bounded local OpenAI-compatible provider**

Use `@ai-sdk/openai-compatible` or an equivalent AI SDK provider. Read `CEREBRO_LOCAL_AI_BASE_URL`, `CEREBRO_LOCAL_AI_MODEL`, and optional `CEREBRO_LOCAL_AI_KEY`; validate HTTPS or private-network HTTP, set a 60-second timeout, and do not log URL query strings or secrets. The selected provider metadata records `local:qwen` without leaking topology to clients.

- [ ] **Step 3: Route text requests local-first and retain fallbacks**

Use the local model for diagnosis requests. Vision requests remain on a vision-capable provider until Task 5 selects a VLM. Groq/OpenRouter retain `maxRetries: 0` and run only after a local failure.

- [ ] **Step 4: Make evaluation provider-selectable**

Add `CEREBRO_EVAL_PROVIDER=local|fallback` and route evaluation through the same provider factory. The script output records model/provider version, latency and grounded-answer violations.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --test-name-pattern="local endpoint|configured local|provider"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cerebro-v2/local-provider.ts src/lib/cerebro/models.ts src/app/api/cerebro-v2/chat/route.ts scripts/cerebro-v2-evaluate.ts src/__tests__/cerebro-v2-local-provider.test.ts
git commit -m "feat(cerebro): priorizar modelo local qwen"
```

### Task 5: Analyze cited schematic pages through a dedicated VLM

**Files:**
- Create: `src/lib/cerebro-v2/vision-analysis.ts`
- Modify: `src/lib/cerebro-v2/worker-client.ts`
- Modify: `src/app/api/cerebro-v2/chat/route.ts`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/schema.sql`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/server.py`
- Test: `src/__tests__/cerebro-v2-vision-analysis.test.ts`
- Test: `services/cerebro-rag-worker/tests/test_vision_cache.py`

- [ ] **Step 1: Write parsing and cache tests**

```ts
test("rejects a VLM claim that is not a visible schematic fact", () => {
  assert.deepEqual(parseVisibleSchematicFacts('{"nets":["PP_VCC_MAIN"],"diagnosis":"replace PMIC"}'), {
    nets: ["PP_VCC_MAIN"], components: [], pins: [], testPoints: [], visibleText: [], branches: [],
  });
});
```

- [ ] **Step 2: Define strict visual output**

The VLM output is parsed into `nets`, `components`, `pins`, `testPoints`, `visibleText`, and `branches`; it has no diagnosis, probability, voltage, repair action or source authority fields. Invalid JSON or unknown keys become an empty visual summary, not an exception to the chat.

- [ ] **Step 3: Add authenticated worker cache endpoints**

Implement `GET/PUT` internal endpoints for a page visual summary. Store model ID, prompt version, summary JSON and cache timestamp in `rag_pages.metadata`; invalidate only when page content/model version changes.

- [ ] **Step 4: Request at most two visual pages and inject facts as evidence**

The chat route loads only cited PDF pages that satisfy `shouldLoadVisualEvidence`, consults cache first, calls the VLM with a fixed extraction prompt on cache miss, then appends the JSON as `VISUAL_EVIDENCE` to the main Qwen prompt.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --test-name-pattern="visible schematic|vision" && cd services/cerebro-rag-worker && pytest tests/test_vision_cache.py -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cerebro-v2/vision-analysis.ts src/lib/cerebro-v2/worker-client.ts src/app/api/cerebro-v2/chat/route.ts services/cerebro-rag-worker/src/cerebro_rag/schema.sql services/cerebro-rag-worker/src/cerebro_rag/server.py src/__tests__/cerebro-v2-vision-analysis.test.ts services/cerebro-rag-worker/tests/test_vision_cache.py
git commit -m "feat(cerebro): extraer evidencia visual de schematicos"
```

### Task 6: Add Google/YouTube research as external, cited evidence

**Files:**
- Create: `src/lib/cerebro-v2/web-research.ts`
- Modify: `src/lib/cerebro-web-search.ts`
- Modify: `src/lib/cerebro-v2/evidence-contract.ts`
- Modify: `src/app/api/cerebro-v2/chat/route.ts`
- Test: `src/__tests__/cerebro-v2-web-research.test.ts`

- [ ] **Step 1: Write source authority tests**

```ts
test("external web results cannot be serialized as confirmed repair evidence", () => {
  const source = normalizeWebSource({ url: "https://youtube.com/watch?v=x", title: "Fix", excerpt: "...", kind: "youtube" });
  assert.equal(source.authority, "EXTERNAL_UNVERIFIED");
  assert.match(renderEvidence(source), /FUENTE EXTERNA/);
});

test("research runs only when exact RAG evidence is insufficient", () => {
  assert.equal(shouldResearchExternally({ exactEvidenceCount: 0, explicitRequest: false }), true);
  assert.equal(shouldResearchExternally({ exactEvidenceCount: 3, explicitRequest: false }), false);
});
```

- [ ] **Step 2: Implement Google-first research with DDG fallback**

Use `GOOGLE_CUSTOM_SEARCH_API_KEY` and `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` when both exist. Otherwise call the existing DDG utility. Return at most five de-duplicated results and fetch at most three pages with timeouts and a 3,000-character extract cap.

- [ ] **Step 3: Add YouTube metadata/transcript retrieval**

Use `YOUTUBE_DATA_API_KEY` to resolve candidate video metadata. Fetch only captions/transcript text exposed through a configured transcript adapter; when unavailable, preserve URL/title and mark transcript unavailable. Never scrape account-gated or private content.

- [ ] **Step 4: Inject source-labelled evidence conditionally**

The chat route calls research only after exact RAG retrieval is insufficient or the technician explicitly requests web lookup. Add external evidence after local manuals and confirmed cases, and require the prompt to label it as a hypothesis source.

- [ ] **Step 5: Remove legacy debug logging when touching the existing search module**

Replace `[DEBUG]` logs with privacy-safe `console.warn` only for real failures; never log the full repair query, user inputs, URLs with tokens or extracted page body.

- [ ] **Step 6: Run focused tests and commit**

```bash
npm test -- --test-name-pattern="external web|research runs|web research"
git add src/lib/cerebro-v2/web-research.ts src/lib/cerebro-web-search.ts src/lib/cerebro-v2/evidence-contract.ts src/app/api/cerebro-v2/chat/route.ts src/__tests__/cerebro-v2-web-research.test.ts
git commit -m "feat(cerebro): investigar fuentes tecnicas externas"
```

### Task 7: Export audited training examples and LoRA manifests

**Files:**
- Create: `src/lib/cerebro-v2/training-export.ts`
- Create: `src/app/api/cerebro-v2/training/export/route.ts`
- Create: `docs/cerebro-lora-runbook.md`
- Test: `src/__tests__/cerebro-v2-training-export.test.ts`

- [ ] **Step 1: Write redaction and eligibility tests**

```ts
test("exports only reviewed complete closures and removes customer data", () => {
  const rows = exportTrainingExamples([reviewedCompleteRow, incompleteRow]);
  assert.equal(rows.length, 1);
  assert.doesNotMatch(JSON.stringify(rows[0]), /@|\+54|ARS|\$/);
});
```

- [ ] **Step 2: Implement versioned JSONL export**

Export only reviewed, complete `CONFIRMED_SUCCESS` records as `{messages, metadata}` JSONL. Metadata includes base model `Qwen3.6-27B`, dataset version, device identity and source IDs; it excludes customer, ticket, employee and price data.

- [ ] **Step 3: Restrict export to admin and make it audit-safe**

The route authenticates and requires `ADMIN`, streams a bounded JSONL response, and logs only a dataset version/count. No training adapter is created by a web request.

- [ ] **Step 4: Write the LoRA runbook**

Document an offline QLoRA command flow using the original Transformers-format base weights, gradient checkpointing, held-out evaluation, adapter conversion for llama.cpp, shadow deployment, manual promotion and rollback. Require a minimum of 300 newly audited examples and a frozen golden set before training.

- [ ] **Step 5: Run focused tests and commit**

```bash
npm test -- --test-name-pattern="exports only reviewed|training export"
git add src/lib/cerebro-v2/training-export.ts src/app/api/cerebro-v2/training/export/route.ts docs/cerebro-lora-runbook.md src/__tests__/cerebro-v2-training-export.test.ts
git commit -m "feat(cerebro): exportar dataset lora auditado"
```

### Task 8: Extend evaluation, prompt rules, and regression coverage

**Files:**
- Modify: `src/lib/cerebro-v2/prompt.ts`
- Modify: `scripts/cerebro-v2-evaluate.ts`
- Create: `src/__tests__/cerebro-v2-evidence-contract.test.ts`
- Modify: `src/__tests__/cerebro-v2-prompt.test.ts`

- [ ] **Step 1: Write failing grounding tests**

```ts
test("requires source labels for external evidence and forbids it as confirmed history", () => {
  const prompt = buildCerebroSystemPrompt("SAMSUNG", "SM-A125M", [], undefined, [externalSource]);
  assert.match(prompt, /FUENTE EXTERNA NO CONFIRMADA/);
  assert.match(prompt, /nunca.*caso MACCELL confirmado/i);
});
```

- [ ] **Step 2: Update the system prompt**

Add explicit hierarchy: manufacturer documentation, confirmed audited MACCELL closure, visual facts, external web, then no unsupported general knowledge. Require a single next measurement and a decision branch. Preserve the existing no-price, exact-brand and no-unsupported-numeric guards.

- [ ] **Step 3: Extend evaluator output**

For every golden case, report provider/model, latency, citations, source type, unsupported numeric suppression, cross-brand violations, number of requested measurements and whether the final answer labels external evidence correctly.

- [ ] **Step 4: Run full Cerebro test subset and commit**

```bash
npm test -- --test-name-pattern="cerebro-v2|grounding|evidence"
git add src/lib/cerebro-v2/prompt.ts scripts/cerebro-v2-evaluate.ts src/__tests__/cerebro-v2-evidence-contract.test.ts src/__tests__/cerebro-v2-prompt.test.ts
git commit -m "test(cerebro): evaluar evidencia y proveedor local"
```

### Task 9: Deploy configuration and production verification

**Files:**
- Modify: `.env.example` or documented environment template if present
- Modify: `infra/cerebro-rag/docker-compose.yml`
- Modify: `infra/cerebro-rag-gpu/docker-compose.yml`
- Modify: `docs/cerebro-rag-runbook.md`
- Modify: `docs/cerebro-lora-runbook.md`

- [ ] **Step 1: Add non-secret configuration names**

Document `CEREBRO_LOCAL_AI_BASE_URL`, `CEREBRO_LOCAL_AI_MODEL`, `CEREBRO_LOCAL_AI_KEY`, `CEREBRO_VISION_BASE_URL`, `CEREBRO_VISION_MODEL`, `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`, and `YOUTUBE_DATA_API_KEY`. Do not commit values.

- [ ] **Step 2: Add isolated VLM service topology**

Provide a compose profile that keeps the existing llama.cpp text server unchanged and exposes the VLM only on the internal Docker network. Configure a healthcheck and GPU assignment. The first deployment must use a tested VLM model and explicit VRAM budget; do not bind an unauthenticated VLM port publicly.

- [ ] **Step 3: Perform pre-deployment validation**

Run:

```bash
npx prisma generate
npx tsc --noEmit
npm test
git diff --check
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Expected: record each result exactly; do not claim production-ready if a command fails.

- [ ] **Step 4: Execute a controlled pilot**

Use one known Samsung and one known iPhone repair. Confirm that each answer cites only its identity-scoped sources, that a schematic page returns visual facts only, that a web fallback is visibly labelled, and that a complete Finalizado OK closure reaches `CONFIRMED_SUCCESS` after worker sync.

- [ ] **Step 5: Commit configuration and runbook updates**

```bash
git add infra/cerebro-rag infra/cerebro-rag-gpu docs/cerebro-rag-runbook.md docs/cerebro-lora-runbook.md .env.example
git commit -m "chore(cerebro): documentar despliegue local y lora"
```

## Plan self-review

- Spec coverage: Tasks 1-3 implement trusted learning from Finalizado OK; Tasks 4-5 implement local diagnostic and visual roles; Task 6 implements Google/YouTube external evidence; Tasks 7-8 implement LoRA preparation and evaluation; Task 9 covers secure deployment and pilot validation.
- Scope: the VLM model download, Google API credentials, YouTube transcript provider credentials, and physical GPU deployment require operator-supplied environment values but the application contracts and guarded fallback paths are implemented without them.
- Safety: all mutable routes authenticate, all training promotion remains manual, and no raw web content or chat reply is treated as confirmed evidence.
