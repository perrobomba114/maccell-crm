# Qwen Groq Priority Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usar `qwen/qwen3.6-27b` de Groq como primera opción de texto y visión, con fallbacks en el orden aprobado y Qwen local como respaldo.

**Architecture:** Un módulo puro de routing declarará el catálogo, generará el orden `modelo → claves` y envolverá solamente Qwen Groq con razonamiento oculto. Cerebro V2 y la mejora de informes construirán sus cadenas desde ese módulo; el ejecutor de fallback existente seguirá probando candidatos en secuencia con `maxRetries: 0`.

**Tech Stack:** Next.js 15, TypeScript estricto, Vercel AI SDK 6, `@ai-sdk/groq`, `@ai-sdk/openai`, Groq Qwen 3.6, Node test runner con `tsx --test`.

---

## Estructura de archivos

- Crear `src/lib/cerebro-v2/model-routing.ts`: catálogo Groq, orden por modelo, configuración exclusiva de Qwen y creación de instancias.
- Crear `src/__tests__/cerebro-v2-model-routing.test.ts`: prioridad, rotación, razonamiento oculto y parámetros Qwen.
- Modificar `src/lib/cerebro/models.ts`: conservar únicamente el ejecutor de fallback; reexportar catálogo solo si una compatibilidad temporal lo requiere.
- Modificar `src/lib/cerebro-v2/local-provider.ts`: reflejar Groq antes del modelo local en el helper de orden.
- Modificar `src/__tests__/cerebro-v2-local-provider.test.ts`: actualizar la prioridad aprobada.
- Modificar `src/app/api/cerebro-v2/chat/route.ts`: construir texto y visión en orden Groq Qwen → fallback Groq → local → OpenRouter.
- Crear `src/__tests__/cerebro-v2-model-routing-integration.test.ts`: contrato estático de integración y ausencia de Llama 3.3 activo.
- Modificar `src/app/api/cerebro/enhance-diagnosis/route.ts`: usar Qwen Groq con rotación y Qwen local como fallback.
- Modificar `src/__tests__/repair-diagnosis-enhancement-route.test.ts`: proveedor prioritario, fallback local, metadata y `maxRetries: 0`.

### Task 1: Catálogo, prioridad y configuración exclusiva de Qwen

**Files:**
- Create: `src/lib/cerebro-v2/model-routing.ts`
- Create: `src/__tests__/cerebro-v2-model-routing.test.ts`
- Modify: `src/lib/cerebro-v2/local-provider.ts`
- Modify: `src/__tests__/cerebro-v2-local-provider.test.ts`

- [ ] **Step 1: Escribir pruebas fallidas de prioridad**

Crear pruebas con dos claves ficticias:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
    buildGroqCandidateOrder,
    GROQ_KIMI_MODEL,
    GROQ_QWEN_MODEL,
    GROQ_VISION_FALLBACK_MODEL,
    withQwenGroqSettings,
} from "@/lib/cerebro-v2/model-routing";

test("tries Qwen on every Groq key before Kimi for text", () => {
    const candidates = buildGroqCandidateOrder(["key-1", "key-2"], false);
    assert.deepEqual(candidates.map(({ apiKey, model }) => `${model.id}:${apiKey}`), [
        `${GROQ_QWEN_MODEL.id}:key-1`,
        `${GROQ_QWEN_MODEL.id}:key-2`,
        `${GROQ_KIMI_MODEL.id}:key-1`,
        `${GROQ_KIMI_MODEL.id}:key-2`,
    ]);
});

test("tries Qwen on every Groq key before Llama Scout for vision", () => {
    const candidates = buildGroqCandidateOrder(["key-1", "key-2"], true);
    assert.deepEqual(candidates.map(({ model }) => model.id), [
        GROQ_QWEN_MODEL.id,
        GROQ_QWEN_MODEL.id,
        GROQ_VISION_FALLBACK_MODEL.id,
        GROQ_VISION_FALLBACK_MODEL.id,
    ]);
});

test("forces hidden default reasoning only for Qwen Groq", () => {
    const settings = withQwenGroqSettings({ temperature: 0.2, maxOutputTokens: 900 });
    assert.equal(settings.temperature, 0.6);
    assert.equal(settings.topP, 0.95);
    assert.deepEqual(settings.providerOptions?.groq, {
        reasoningEffort: "default",
        reasoningFormat: "hidden",
    });
});
```

Actualizar el test de `providerOrder` para esperar `['groq', 'local']` cuando ambos están disponibles.

- [ ] **Step 2: Ejecutar RED**

Run: `npx tsx --test src/__tests__/cerebro-v2-model-routing.test.ts src/__tests__/cerebro-v2-local-provider.test.ts`

Expected: FAIL porque el módulo no existe y el helper todavía prioriza local.

- [ ] **Step 3: Implementar el módulo de routing**

Crear el catálogo y orden:

```ts
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

export type GroqModelDefinition = { id: string; label: string };
export type GroqCandidate = { apiKey: string; model: GroqModelDefinition };

export const GROQ_QWEN_MODEL = { label: "Qwen 3.6 27B", id: "qwen/qwen3.6-27b" } as const;
export const GROQ_KIMI_MODEL = { label: "Kimi K2", id: "moonshotai/kimi-k2-instruct" } as const;
export const GROQ_VISION_FALLBACK_MODEL = {
    label: "Llama 4 Scout Vision",
    id: process.env.CEREBRO_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
} as const;

export function buildGroqCandidateOrder(keys: readonly string[], vision: boolean): GroqCandidate[] {
    const models = vision
        ? [GROQ_QWEN_MODEL, GROQ_VISION_FALLBACK_MODEL]
        : [GROQ_QWEN_MODEL, GROQ_KIMI_MODEL];
    return models.flatMap((model) => keys.map((apiKey) => ({ apiKey, model })));
}

export function withQwenGroqSettings(params: LanguageModelV3CallOptions): LanguageModelV3CallOptions {
    return {
        ...params,
        temperature: 0.6,
        topP: 0.95,
        providerOptions: {
            ...params.providerOptions,
            groq: { reasoningEffort: "default", reasoningFormat: "hidden" },
        },
    };
}

const qwenGroqMiddleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    transformParams: async ({ params }) => withQwenGroqSettings(params),
};

export function createGroqCandidateModel(candidate: GroqCandidate) {
    const model = createGroq({ apiKey: candidate.apiKey })(candidate.model.id);
    return candidate.model.id === GROQ_QWEN_MODEL.id
        ? wrapLanguageModel({ model, middleware: qwenGroqMiddleware })
        : model;
}
```

Cambiar `providerOrder` a:

```ts
export function providerOrder(input: { baseUrl?: string; hasGroq: boolean }): string[] {
    return [...(input.hasGroq ? ["groq"] : []), ...(input.baseUrl ? ["local"] : [])];
}
```

- [ ] **Step 4: Ejecutar GREEN y TypeScript**

Run: `npx tsx --test src/__tests__/cerebro-v2-model-routing.test.ts src/__tests__/cerebro-v2-local-provider.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cerebro-v2/model-routing.ts src/lib/cerebro-v2/local-provider.ts src/__tests__/cerebro-v2-model-routing.test.ts src/__tests__/cerebro-v2-local-provider.test.ts
git commit -m "feat(cerebro): priorizar qwen groq por modelo"
```

### Task 2: Integrar prioridad Groq en chat y visión

**Files:**
- Modify: `src/app/api/cerebro-v2/chat/route.ts:1-60`
- Modify: `src/lib/cerebro/models.ts:1-9`
- Create: `src/__tests__/cerebro-v2-model-routing-integration.test.ts`

- [ ] **Step 1: Escribir el contrato fallido de integración**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../app/api/cerebro-v2/chat/route.ts", import.meta.url), "utf8");
const models = readFileSync(new URL("../lib/cerebro/models.ts", import.meta.url), "utf8");

test("builds Groq candidates before appending the local model", () => {
    assert.match(route, /buildGroqCandidateOrder/);
    assert.match(route, /createGroqCandidateModel/);
    assert.ok(route.indexOf("buildGroqCandidateOrder") < route.indexOf("createLocalCerebroModel"));
});

test("removes active Llama 3.3 routing", () => {
    assert.doesNotMatch(route, /llama-3\.3-70b-versatile/);
    assert.doesNotMatch(models, /llama-3\.3-70b-versatile/);
});

test("bounds Qwen vision requests to Groq's three-image limit", () => {
    assert.match(route, /images\.slice\(0, 3\)/);
});
```

- [ ] **Step 2: Ejecutar RED**

Run: `npx tsx --test src/__tests__/cerebro-v2-model-routing-integration.test.ts`

Expected: FAIL porque la ruta agrega local primero y el catálogo contiene Llama 3.3.

- [ ] **Step 3: Reemplazar la construcción de candidatos**

En `buildModel` crear configuraciones Groq primero:

```ts
const configurations: Array<{ instance: unknown; label: string; keyId: string; modelId?: string }> = [];
for (const candidate of buildGroqCandidateOrder(getGroqKeys(), vision)) {
    configurations.push({
        instance: createGroqCandidateModel(candidate),
        label: candidate.model.label,
        keyId: "groq",
        modelId: candidate.model.id,
    });
}
const localModel = createLocalCerebroModel(vision);
if (localModel) {
    configurations.push({
        instance: localModel,
        label: vision ? "Qwen local vision" : "Qwen local",
        keyId: "local",
    });
}
```

Conservar OpenRouter al final. Eliminar `createGroq`, `TEXT_MODELS` y `VISION_MODEL` de los imports de la ruta. Retirar del inicio de `src/lib/cerebro/models.ts` las constantes antiguas, dejando intacto `createFallbackModel`.

En `extractVisualFacts`, después de comprobar que existen imágenes, crear `const boundedImages = images.slice(0, 3)` y construir el contenido visual desde `boundedImages`, respetando el máximo admitido por Qwen 3.6 Groq.

- [ ] **Step 4: Ejecutar pruebas de routing y chat**

Run: `npx tsx --test src/__tests__/cerebro-v2-model-routing.test.ts src/__tests__/cerebro-v2-model-routing-integration.test.ts src/__tests__/cerebro-v2-chat-contract.test.ts src/__tests__/cerebro-v2-grounding.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cerebro-v2/chat/route.ts src/lib/cerebro/models.ts src/__tests__/cerebro-v2-model-routing-integration.test.ts
git commit -m "feat(cerebro): usar qwen groq primero en texto y vision"
```

### Task 3: Qwen Groq y fallback local para mejorar informes

**Files:**
- Modify: `src/app/api/cerebro/enhance-diagnosis/route.ts`
- Modify: `src/__tests__/repair-diagnosis-enhancement-route.test.ts`

- [ ] **Step 1: Ampliar la prueba para que falle con la ruta actual**

Agregar asserts:

```ts
test("uses Qwen Groq before the local Qwen fallback", () => {
    const source = readFileSync(routeUrl, "utf8");
    assert.match(source, /GROQ_QWEN_MODEL/);
    assert.match(source, /buildGroqCandidateOrder/);
    assert.match(source, /createGroqCandidateModel/);
    assert.match(source, /createLocalCerebroModel/);
    assert.match(source, /createFallbackModel/);
    assert.ok(source.indexOf("buildGroqCandidateOrder") < source.indexOf("createLocalCerebroModel"));
    assert.match(source, /maxRetries: 0/);
    assert.doesNotMatch(source, /llama-3\.3-70b-versatile/);
});
```

- [ ] **Step 2: Ejecutar RED**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement-route.test.ts`

Expected: FAIL por el modelo Llama hardcodeado y la ausencia del local.

- [ ] **Step 3: Construir el fallback acotado de informe**

Crear la lista solo con candidatos Qwen Groq, después local:

```ts
let selectedProvider = { source: "unavailable", model: GROQ_QWEN_MODEL.id };
const configurations = buildGroqCandidateOrder(getGroqKeys(), false)
    .filter(({ model }) => model.id === GROQ_QWEN_MODEL.id)
    .map((candidate) => ({
        instance: createGroqCandidateModel(candidate),
        label: candidate.model.label,
        keyId: "groq",
        modelId: candidate.model.id,
    }));
const localModel = createLocalCerebroModel(false);
if (localModel) {
    configurations.push({
        instance: localModel,
        label: "Qwen local",
        keyId: "local",
        modelId: process.env.CEREBRO_LOCAL_AI_MODEL ?? "Qwen local",
    });
}
if (configurations.length === 0) {
    return NextResponse.json({ error: "No se pudo profesionalizar el diagnóstico en este momento.", modelUnavailable: true }, { status: 503 });
}
const model = createFallbackModel(configurations, (provider) => {
    selectedProvider = { source: provider.keyId, model: String(provider.modelId ?? provider.label) };
});
```

Pasar ese `model` a `generateText`, usar `temperature: 0.6`, `topP: 0.95`, `maxOutputTokens: 500` y `maxRetries: 0`. Conservar el validador de coherencia. En la respuesta exitosa devolver `source` y `model` desde `selectedProvider`.

- [ ] **Step 4: Ejecutar pruebas del informe y caso real**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement.test.ts src/__tests__/repair-diagnosis-enhancement-route.test.ts`

Expected: PASS, incluido el bloqueo de reemplazo para “se pegó módulo”.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cerebro/enhance-diagnosis/route.ts src/__tests__/repair-diagnosis-enhancement-route.test.ts
git commit -m "feat(repairs): usar qwen groq con fallback local"
```

### Task 4: Verificación completa y producción

**Files:**
- Verify: all files modified in Tasks 1-3

- [ ] **Step 1: Ejecutar suite completa**

Run: `npm test`

Expected: cero fallos y al menos 253 tests.

- [ ] **Step 2: Ejecutar gate de producción**

Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`

Expected: TypeScript, lint de archivos tocados, whitespace, tests y build pasan.

- [ ] **Step 3: Revisar catálogo activo y repositorio**

Run: `rg -n 'llama-3\.3-70b-versatile' src/app/api/cerebro-v2 src/app/api/cerebro/enhance-diagnosis src/lib/cerebro/models.ts src/lib/cerebro-v2 && git diff --check && git status --short`

Expected: `rg` no devuelve referencias activas, no hay errores de whitespace y el worktree está limpio después de commits.

- [ ] **Step 4: Subir y esperar despliegue si el usuario confirma publicación**

Run: `git fetch origin main && git rev-list --left-right --count origin/main...main`, seguido de `git push origin main` solo si no hay commits remotos pendientes.

Expected: push normal sin force y un contenedor productivo posterior al commit.

- [ ] **Step 5: Probar mejora de informe en producción sin escritura**

Enviar al endpoint autenticado el texto `se pego modulo marco doblado` con el ingreso `Pegar modulo/ ingresa con modulo despegado`.

Expected: HTTP 200, `source: "groq"`, `model: "qwen/qwen3.6-27b"`, texto sin “reemplazo” y sin `<think>`.

- [ ] **Step 6: Probar texto y visión directamente contra Qwen Groq productivo**

Desde el contenedor, usar una clave disponible sin imprimirla para llamar al endpoint Groq con `qwen/qwen3.6-27b`, `reasoning_format: "hidden"` y una entrada textual; repetir con una imagen técnica pequeña o asset de prueba autorizado.

Expected: ambas respuestas HTTP 200, contenido final no vacío y ausencia de `<think>`. No llamar al endpoint de chat ni persistir sesiones o mensajes.
