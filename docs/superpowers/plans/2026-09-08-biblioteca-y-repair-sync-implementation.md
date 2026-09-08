# Biblioteca canónica y repair-sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear documentación, worker RAG y producción con la estructura canónica de la biblioteca sin volver a saturar el CRM ni ocultar errores de sincronización.

**Architecture:** Mantener `/mnt/data2` como único volumen físico y usar identidad por `assetId + SHA-256`. El árbol y el catálogo se mantienen como capas derivadas; la migración física se ejecuta sólo desde staging y manifiestos. `repair-sync` debe conservar la lectura técnica aunque una limpieza opcional de documentos activos carezca de privilegios.

**Tech Stack:** Next.js 15, TypeScript, Python 3, PostgreSQL/pgvector, Docker Compose, Dokploy, Vitest/Node test runner y pytest.

**Spec:** `docs/superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md`

## Global Constraints

- La biblioteca física existente es `/mnt/data2`; no crear otro almacenamiento.
- Nunca usar `rsync --delete`, borrar el catálogo, borrar vectores ni sobrescribir archivos.
- Los duplicados se determinan por SHA-256 + tamaño; el nombre no es identidad.
- `Catalog.json` se genera atómicamente y no se edita manualmente.
- PDF y PCBE sólo se vinculan con identidad técnica verificada; un `image.pdf` no es un esquemático.
- El árbol inicial debe ser compacto y paginar activos; no cargar 21.561 archivos para abrir la página.
- El RAG V2 usa `rag_documents`, `rag_pages`, `rag_chunks` y embeddings de 1.024 dimensiones.
- El worker de reparaciones sólo lee la base principal; las degradaciones opcionales no deben detener el ciclo.
- Toda ruta privada conserva autenticación y no se agregan secretos, credenciales ni PII a logs o documentación.

---

### Task 1: Unificar la documentación operativa

**Files:**
- Modify: `docs/schematics-ingestion-runbook.md`
- Modify: `docs/schematics-architecture.md`
- Modify: `docs/cerebro-rag-runbook.md`
- Modify: `README.md`
- Test: revisión automatizada con `rg` y `git diff --check`

**Interfaces:**
- Consumes: la estructura aprobada en `docs/superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md`.
- Produces: una única terminología operativa para `/mnt/data2/pdf`, `/mnt/data2/pcbe`, `Pcbe/Catalog.json` y RAG V2.

- [ ] **Step 1: Write the failing consistency check**

Ejecutar la búsqueda que debe quedar sin coincidencias conflictivas:

```bash
rg -n '/mnt/data2/[^\`\n]*/<modelo>|schematics\\.chunks|/Pdf/<|/Pcbe/<' \
  docs README.md
```

Expected: encuentra las rutas antiguas del runbook y la referencia a `schematics.chunks`.

- [ ] **Step 2: Replace conflicting contracts**

Actualizar el runbook para que la ubicación final sea:

```text
/mnt/data2/Pcbe/Catalog.json
/mnt/data2/pdf/<MARCA>/<MODELO COMERCIAL>/
/mnt/data2/pcbe/<MARCA>/<MODELO COMERCIAL>/
```

Mantener `/app/upload/schematics/sources` sólo como montaje de compatibilidad durante la transición y explicar que `relativePath` se resuelve contra ese mount. Reemplazar la tabla de embeddings por `rag_documents`, `rag_pages`, `rag_chunks` y el worker RAG V2. En arquitectura y runbook agregar el enlace a la especificación canónica.

- [ ] **Step 3: Verify the documentation contract**

```bash
! rg -n 'schematics\\.chunks|/mnt/data2/[^\`\n]*/<modelo>/Pdf|/mnt/data2/[^\`\n]*/<modelo>/Pcbe' docs README.md
git diff --check
```

Expected: exit 0, sin contratos antiguos no justificados y sin errores de whitespace.

- [ ] **Step 4: Commit**

```bash
git add docs README.md
git commit -m "docs(schematics): align canonical library and rag v2 runbooks"
```

### Task 2: Hacer resiliente el `repair-sync` ante privilegios opcionales

**Files:**
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/repair_sync.py`
- Test: `services/cerebro-rag-worker/tests/test_repair_sync.py`

**Interfaces:**
- Consumes: `WorkerSettings`, conexiones PostgreSQL y `RepairIndexer` existentes.
- Produces: `sync_repairs_once()` que continúa indexando cuando sólo falla la limpieza opcional de reparaciones activas; los errores obligatorios continúan fallando con etapa identificable.

- [ ] **Step 1: Write the failing regression tests**

Agregar pruebas para el clasificador de etapas:

```python
def test_active_repair_retirement_permission_is_optional() -> None:
    assert _is_optional_permission_denied("retire_active_repairs", RuntimeError("permission denied"))

def test_source_read_permission_is_not_optional() -> None:
    assert not _is_optional_permission_denied("source_export", RuntimeError("permission denied"))
```

Expected before implementation: `ImportError` o assertion failure porque el helper no existe.

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
cd services/cerebro-rag-worker
PYTHONPATH=src python -m pytest tests/test_repair_sync.py -q
```

- [ ] **Step 3: Implement the smallest safe fix**

Crear un helper con etapas explícitas y encapsular sólo el retiro opcional:

```python
def _is_optional_permission_denied(stage: str, error: BaseException) -> bool:
    return stage == "retire_active_repairs" and _is_permission_denied(error)
```

En `sync_repairs_once()`:

```python
try:
    _retire_active_repairs(source_connection, rag_connection)
except Exception as error:
    if not _is_optional_permission_denied("retire_active_repairs", error):
        raise
    rag_connection.rollback()
    print(
        "REPAIR_SYNC_DEGRADED reason=permission_denied optional=active_repair_retirement",
        flush=True,
    )
```

Mantener como obligatorios `_load_cursor`, `RepairIndexer.index_batch()` y la consulta base de reparaciones. Mejorar el error final para incluir sólo la etapa (`stage=...`) y SQLSTATE, sin SQL completo, rutas ni credenciales. No ocultar errores de lectura de `repairs` ni de escritura de `rag_*` necesarios para indexar.

- [ ] **Step 4: Run the focused tests and Python syntax check**

```bash
cd services/cerebro-rag-worker
PYTHONPATH=src python -m pytest tests/test_repair_sync.py -q
python -m compileall -q src
```

Expected: todas las pruebas pasan y `compileall` termina sin salida de error.

- [ ] **Step 5: Commit**

```bash
git add services/cerebro-rag-worker/src/cerebro_rag/repair_sync.py services/cerebro-rag-worker/tests/test_repair_sync.py
git commit -m "fix(cerebro): tolerate optional repair retirement permissions"
```

### Task 3: Verificación local completa y documentación de la causa

**Files:**
- Modify: `docs/cerebro-rag-runbook.md`
- Modify: `docs/schematics-architecture.md`
- Test: suite existente del repositorio y worker

**Interfaces:**
- Consumes: commits de Tasks 1 y 2.
- Produces: runbook que explica la diferencia entre permiso opcional de limpieza y permisos obligatorios de indexación.

- [ ] **Step 1: Add the operational incident rule**

Documentar que `repair-sync` puede informar `REPAIR_SYNC_DEGRADED` cuando no puede retirar documentos activos, pero debe seguir indexando reparaciones confirmadas. El estado `REPAIR_SYNC_FAILED` sólo corresponde a una etapa obligatoria.

- [ ] **Step 2: Run all local gates**

```bash
npm test
npx tsc --noEmit
git diff --check
cd services/cerebro-rag-worker && PYTHONPATH=src python -m pytest -q
```

Expected: Node tests sin fallos, TypeScript sin errores, diff limpio y pytest sin fallos.

- [ ] **Step 3: Run the production build**

```bash
cd /Users/David/Desktop/MACCELL
npm run build
```

Expected: build exitoso usando dependencias reproducibles. Si la descarga de fuentes externas vuelve a fallar por certificados, registrar el error como bloqueo de build y no declararlo exitoso.

- [ ] **Step 4: Commit runbook clarification**

```bash
git add docs/cerebro-rag-runbook.md docs/schematics-architecture.md
git commit -m "docs(cerebro): document repair sync permission degradation"
```

### Task 4: Publicación y verificación de producción

**Files:**
- No source files; deploy of the commits from Tasks 1–3.
- Evidence: deployment ID, served version, container state and logs.

**Interfaces:**
- Consumes: `main` con todos los commits verificados.
- Produces: `origin/main` y producción alineados, sin repetir el incidente de permisos sin diagnóstico.

- [ ] **Step 1: Review staged history and push**

```bash
git status --short --branch
git log --oneline -5
git push origin main
```

Expected: working tree clean and `origin/main` points to the reviewed commit.

- [ ] **Step 2: Monitor only the MACCELL Dokploy application**

Use the `dokploy_maccell` application deployment for project `MACCELL CRM`; verify the deployment title contains the published commit, status `done`, and no build error. Do not use the `dokploy_sin_rival` integration.

- [ ] **Step 3: Verify live HTTP and browser behavior**

Open `https://sistema.maccell.com.ar/technician/schematics` and verify:

```text
Biblioteca total = physical/catalog inventory count
PDF and Placas counters are distinct
tree starts collapsed
PDF image files are not presented as schematics
```

Use at least Samsung A03 Core, one iPhone, one Motorola/Xiaomi, one console and one laptop/PC entry.

- [ ] **Step 4: Verify RAG worker recovery**

Read the `repair-sync` container logs after the new deployment. Expected: `REPAIR_SYNC indexed=... skipped=...` or one bounded `REPAIR_SYNC_DEGRADED ...` followed by successful cycles; no repeating bare `REPAIR_SYNC_FAILED type=InsufficientPrivilege`.

- [ ] **Step 5: Report remaining physical migration separately**

Do not claim the physical tree was reorganized unless a fresh server manifest proves the canonical paths, duplicate classification, permissions, catalog reconciliation and RAG coverage. If server-side filesystem access is unavailable, report that exact remaining boundary instead of guessing.

