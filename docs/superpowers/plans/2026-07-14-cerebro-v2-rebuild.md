# Cerebro V2 Complete Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el Cerebro heredado por un asistente técnico V2 funcional, con chats nuevos persistidos en la base RAG, fuentes auditables, páginas PDF dentro del chat, visión vigente y sincronización continua de reparaciones.

**Architecture:** Next.js expondrá rutas autenticadas V2 y una UI nueva bajo `src/components/cerebro-v2`. PostgreSQL RAG almacenará documentos, chats y fuentes sin reutilizar tablas del CRM; el worker Python seguirá generando embeddings y agregará migraciones, render de páginas y sincronización incremental. La respuesta transmitirá metadatos estructurados y persistirá el turno de forma idempotente.

**Tech Stack:** Next.js 15, React 19, TypeScript estricto, Vercel AI SDK 6, Groq/OpenRouter, PostgreSQL/pgvector, Python 3.12/FastAPI, Tailwind CSS, Vitest-compatible Node tests y pytest.

---

### Task 1: Fijar los contratos V2 con pruebas fallidas

**Files:**
- Create: `src/__tests__/cerebro-v2-chat-contract.test.ts`
- Create: `src/__tests__/cerebro-v2-chat-repository.test.ts`
- Create: `src/__tests__/cerebro-v2-pdf-page.test.ts`
- Modify: `src/lib/cerebro-v2/types.ts`

- [ ] **Step 1: Escribir la prueba del dispositivo y error visible**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseCerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";

test("rechaza una consulta sin modelo antes de persistir", () => {
  const result = parseCerebroChatRequest({ sessionId: crypto.randomUUID(), messages: [], deviceContext: { brand: "Samsung", model: "" } });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error, "Seleccioná marca y modelo antes de consultar");
});
```

- [ ] **Step 2: Ejecutar RED**

Run: `npm test -- src/__tests__/cerebro-v2-chat-contract.test.ts`
Expected: FAIL porque `chat-contract.ts` no existe.

- [ ] **Step 3: Crear contratos estrictos**

Crear `src/lib/cerebro-v2/chat-contract.ts` con Zod para `sessionId`, `messages`, `deviceContext`, máximo cinco imágenes `image/*` y mensajes de error en español. El parser debe devolver una unión discriminada `{ success: true; data } | { success: false; error }`.

- [ ] **Step 4: Ejecutar GREEN y commit**

Run: `npm test -- src/__tests__/cerebro-v2-chat-contract.test.ts`
Expected: PASS.

Commit: `test(cerebro): fijar contratos del chat v2`

### Task 2: Crear persistencia de chats exclusivamente V2

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/migrations.py`
- Create: `services/cerebro-rag-worker/tests/test_migrations.py`
- Create: `src/lib/cerebro-v2/chat-repository.ts`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/cli.py`
- Modify: `infra/cerebro-rag/docker-compose.yml`

- [ ] **Step 1: Escribir pruebas RED de migración y pertenencia**

La migración debe crear `rag_chat_sessions` y `rag_chat_messages`, índices por usuario/fecha y unicidad `(session_id, client_message_id)`. La prueba TypeScript usará un adaptador falso y verificará que toda consulta de lectura o borrado incluya `user_id`.

- [ ] **Step 2: Ejecutar RED**

Run: `PYTHONPATH=services/cerebro-rag-worker/src /tmp/maccell-rag-test/bin/python -m pytest services/cerebro-rag-worker/tests/test_migrations.py -q`
Expected: FAIL porque la migración no existe.

Run: `npm test -- src/__tests__/cerebro-v2-chat-repository.test.ts`
Expected: FAIL porque el repositorio no existe.

- [ ] **Step 3: Implementar migración idempotente**

`migrations.py` mantendrá `rag_schema_migrations(version text primary key, applied_at timestamptz)` y ejecutará una transacción por versión. El comando `cerebro-rag migrate` se ejecutará antes del worker, la ingesta y el sincronizador.

- [ ] **Step 4: Implementar repositorio acotado**

Exportar `listChatSessions`, `createChatSession`, `getChatSession`, `renameChatSession`, `deleteChatSession` y `appendChatMessage`. Todas recibirán `userId`; ninguna consultará Prisma ni `cerebro_conversations`.

- [ ] **Step 5: Ejecutar GREEN y commit**

Run: `npm test -- src/__tests__/cerebro-v2-chat-repository.test.ts`
Run: `PYTHONPATH=services/cerebro-rag-worker/src /tmp/maccell-rag-test/bin/python -m pytest services/cerebro-rag-worker/tests/test_migrations.py -q`
Expected: PASS.

Commit: `feat(cerebro): aislar persistencia de chats v2`

### Task 3: Exponer CRUD autenticado y salud sanitizada

**Files:**
- Create: `src/app/api/cerebro-v2/sessions/route.ts`
- Create: `src/app/api/cerebro-v2/sessions/[sessionId]/route.ts`
- Create: `src/app/api/cerebro-v2/health/route.ts`
- Create: `src/lib/cerebro-v2/health.ts`
- Create: `src/__tests__/cerebro-v2-health.test.ts`

- [ ] **Step 1: Escribir RED de estado degradado**

```ts
test("informa dependencia degradada sin revelar el error interno", async () => {
  const status = await checkCerebroHealth({ rag: async () => true, worker: async () => { throw new Error("secret host"); } });
  assert.equal(status.overall, "degraded");
  assert.deepEqual(status.worker, { ok: false, message: "Worker RAG no disponible" });
  assert.equal(JSON.stringify(status).includes("secret host"), false);
});
```

- [ ] **Step 2: Implementar rutas con auth antes del body**

Permitir solo `ADMIN` y `TECHNICIAN`; validar UUID, pertenencia del usuario y cuerpos Zod. `DELETE` debe borrar en cascada solamente la sesión V2 del usuario autenticado.

- [ ] **Step 3: Implementar health**

Probar `SELECT 1`, `/health`, modelo de texto configurado y modelo de visión configurado; devolver únicamente booleanos y mensajes sanitizados.

- [ ] **Step 4: Ejecutar tests y commit**

Run: `npm test -- src/__tests__/cerebro-v2-health.test.ts`
Expected: PASS.

Commit: `feat(cerebro): agregar sesiones y salud v2`

### Task 4: Renderizar páginas PDF de forma autenticada

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/page_renderer.py`
- Create: `services/cerebro-rag-worker/tests/test_page_renderer.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/server.py`
- Create: `src/app/api/cerebro-v2/documents/[documentId]/pages/[pageNumber]/route.ts`
- Modify: `src/lib/cerebro-v2/worker-client.ts`

- [ ] **Step 1: Escribir RED de path seguro y página válida**

La prueba verificará rechazo de página `0`, rechazo de `rendered_path` fuera de `PAGE_CACHE_ROOT` y devolución del PNG existente para una página indexada.

- [ ] **Step 2: Implementar renderer**

Resolver primero `rag_pages.rendered_path`; si falta, renderizar una sola página con `pdf2image`, guardarla bajo `PAGE_CACHE_ROOT/<sha256>/page-0001.png` y devolver `FileResponse(image/png)`.

- [ ] **Step 3: Implementar proxy Next**

Autenticar antes de leer parámetros remotos, limitar `pageNumber` a entero positivo y transmitir `Content-Type`, `ETag` y cache privada sin exponer paths internos.

- [ ] **Step 4: Ejecutar tests y commit**

Run: `PYTHONPATH=services/cerebro-rag-worker/src /tmp/maccell-rag-test/bin/python -m pytest services/cerebro-rag-worker/tests/test_page_renderer.py -q`
Expected: PASS.

Commit: `feat(cerebro): mostrar paginas pdf dentro del chat`

### Task 5: Reconstruir el endpoint de diagnóstico

**Files:**
- Modify: `src/app/api/cerebro-v2/chat/route.ts`
- Modify: `src/lib/cerebro-v2/prompt.ts`
- Modify: `src/lib/cerebro-v2/types.ts`
- Create: `src/lib/cerebro-v2/message-content.ts`
- Create: `src/lib/cerebro-v2/chat-service.ts`
- Modify: `src/lib/cerebro/models.ts`
- Create: `src/__tests__/cerebro-v2-message-content.test.ts`
- Modify: `src/__tests__/cerebro-v2-prompt.test.ts`

- [ ] **Step 1: Escribir RED para imágenes y fuentes públicas**

La prueba debe comprobar que una parte `file` `image/jpeg` se convierte a contenido de visión, que se rechazan PDF adjuntos y que las fuentes públicas no contienen `chunkId`, UUID ni contenido completo.

- [ ] **Step 2: Actualizar visión**

Usar `CEREBRO_VISION_MODEL` o `meta-llama/llama-4-scout-17b-16e-instruct`. Rechazar más de cinco imágenes y data URLs mayores a 4 MB antes de llamar a Groq.

- [ ] **Step 3: Actualizar prompt**

Versión `cerebro-tech-v2.1`: observaciones, evidencia, hipótesis, próxima medición y criterio de decisión. Prohibir porcentajes inventados, UUID, precios, mezcla de marcas y afirmaciones de página fuera del fragmento.

- [ ] **Step 4: Persistencia transaccional del turno**

Validar sesión y dispositivo antes de persistir. Guardar usuario solamente cuando el contrato sea válido; guardar asistente al terminar con `sources`, `promptVersion` y proveedor sanitizado. Usar `client_message_id` para idempotencia.

- [ ] **Step 5: Devolver metadata estructurada**

`toUIMessageStreamResponse` incluirá metadata con fuentes públicas: `documentId`, tipo `REPAIR|PDF`, título, autoridad, marca, modelo y página. No se incrustarán UUID de chunks en el texto.

- [ ] **Step 6: Ejecutar tests y commit**

Run: `npm test -- src/__tests__/cerebro-v2-message-content.test.ts src/__tests__/cerebro-v2-prompt.test.ts`
Expected: PASS.

Commit: `feat(cerebro): reconstruir diagnostico tecnico v2`

### Task 6: Reemplazar completamente la interfaz

**Files:**
- Create: `src/components/cerebro-v2/cerebro-v2-shell.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-header.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-history.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-chat.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-composer.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-message.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-sources.tsx`
- Create: `src/components/cerebro-v2/cerebro-v2-pdf-viewer.tsx`
- Create: `src/components/cerebro-v2/use-cerebro-v2-chat.ts`
- Modify: `src/app/admin/cerebro/page.tsx`
- Modify: `src/app/technician/cerebro/page.tsx`

- [ ] **Step 1: Crear pruebas RED de estado y transporte**

Extraer un reducer puro y probar: historial inicial vacío, selección obligatoria de modelo, error 400 mostrado literalmente, nuevo chat sin pérdida del anterior y apertura de cita PDF con página.

- [ ] **Step 2: Implementar shell industrial utilitario**

Un solo shell para ambos roles. Historial V2 a la izquierda, diagnóstico central y visor contextual a la derecha. En móvil, historial y visor serán sheets. No importar `KnowledgePanel`, `SchematicUploadPanel`, `TokenBar` ni acciones antiguas.

- [ ] **Step 3: Implementar transporte dinámico correcto**

Crear el chat por `sessionId` y enviar `deviceContext` en las opciones de cada `sendMessage`, no en el constructor estático. Deshabilitar enviar sin modelo y mostrar el mensaje JSON real del servidor.

- [ ] **Step 4: Implementar visor**

Mostrar la página como imagen, zoom 50–300 %, pan, anterior/siguiente, selector de página y cierre sin navegar fuera del chat.

- [ ] **Step 5: Ejecutar tests y commit**

Run: `npm test -- src/__tests__/cerebro-v2-ui-state.test.ts src/__tests__/cerebro-v2-transport.test.ts`
Expected: PASS.

Commit: `feat(cerebro): reemplazar ux heredada por shell tecnico v2`

### Task 7: Sincronizar reparaciones nuevas y modificadas

**Files:**
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/repairs.py`
- Create: `services/cerebro-rag-worker/src/cerebro_rag/repair_sync.py`
- Create: `services/cerebro-rag-worker/tests/test_repair_sync.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/cli.py`
- Modify: `infra/cerebro-rag/docker-compose.yml`

- [ ] **Step 1: Escribir RED del cursor `(updatedAt,id)`**

Probar que dos reparaciones con la misma fecha no se pierden, que un lote fallido no avanza el cursor y que una reparación modificada produce una versión nueva retirando la anterior.

- [ ] **Step 2: Implementar sincronizador**

Agregar `updatedAt` al export, consulta paginada por cursor, lotes de ocho y actualización de `rag_ingestion_jobs` después del commit. Ejecutar `cerebro-rag sync-repairs --interval 300` en un servicio Compose separado.

- [ ] **Step 3: Ejecutar tests y commit**

Run: `PYTHONPATH=services/cerebro-rag-worker/src /tmp/maccell-rag-test/bin/python -m pytest services/cerebro-rag-worker/tests/test_repair_sync.py -q`
Expected: PASS.

Commit: `feat(cerebro): sincronizar reparaciones incrementalmente`

### Task 8: Validación integral y despliegue en main

**Files:**
- Create: `src/__tests__/cerebro-v2-technician-golden.test.ts`
- Modify: `docs/cerebro-rag-runbook.md`
- Modify: `docs/superpowers/specs/2026-07-14-cerebro-v2-ux-sync-design.md`

- [ ] **Step 1: Agregar caso dorado SM-A405FN**

Validar estructura de prompt, modelo exacto primero, página documental, primera medición concreta y ausencia de UUID/precios. El test no fijará un diagnóstico médico-electrónico inventado; fijará el contrato de evidencia y seguridad.

- [ ] **Step 2: Ejecutar gate completo**

Run: `npm test`
Run: `PYTHONPATH=services/cerebro-rag-worker/src /tmp/maccell-rag-test/bin/python -m pytest services/cerebro-rag-worker/tests -q`
Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`
Expected: todos los tests, TypeScript, lint, diff y build pasan.

- [ ] **Step 3: Commit y push main**

Commit: `feat(cerebro): reconstruir asistente tecnico con rag v2`

Run: `git push origin main`

- [ ] **Step 4: Corregir Dokploy y desplegar**

Configurar la aplicación y el Compose RAG con `customGitBranch=main`. Desplegar primero Compose para aplicar migraciones y endpoints, comprobar `/health`, luego desplegar la aplicación.

- [ ] **Step 5: Aceptación en producción**

Comprobar autenticado: historial V2 vacío, nuevo chat, recuperación, consulta con modelo, respuesta streaming, cita PDF inline, zoom, error explícito, fuentes correctas y búsqueda SM-A405FN. Confirmar logs sin errores sanitizados.
