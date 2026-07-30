# Coherent Groq Diagnosis Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profesionalizar el informe del técnico con Groq sin introducir reparaciones, reemplazos, mediciones ni diagnósticos que el técnico no afirmó.

**Architecture:** Extraer la construcción del prompt y el control semántico a un módulo puro y pequeño. La API autenticada enviará a Groq fuentes delimitadas, validará la respuesta antes de devolverla y responderá 422 si aparece una acción no respaldada, por lo que el modal conservará el texto original.

**Tech Stack:** Next.js 15 Route Handlers, TypeScript estricto, Vercel AI SDK, Groq, Zod 4, Node test runner mediante `tsx --test`.

---

## Estructura de archivos

- Crear `src/lib/repair-diagnosis-enhancement.ts`: prompt especializado, normalización y validador determinista de acciones.
- Crear `src/__tests__/repair-diagnosis-enhancement.test.ts`: regresiones semánticas basadas en `MAC1-00001114` y patrones observados en producción.
- Modificar `src/app/api/cerebro/enhance-diagnosis/route.ts`: autenticación previa al body, validación Zod, generación de baja variabilidad y rechazo de alucinaciones.
- Crear `src/__tests__/repair-diagnosis-enhancement-route.test.ts`: contrato estático de seguridad e integración de la ruta.

### Task 1: Prompt y validador de coherencia

**Files:**
- Create: `src/lib/repair-diagnosis-enhancement.ts`
- Test: `src/__tests__/repair-diagnosis-enhancement.test.ts`

- [ ] **Step 1: Escribir las pruebas fallidas del caso real y de autoridad de fuentes**

Crear el test con imports de `buildRepairDiagnosisPrompt` y `validateEnhancedDiagnosis`. Debe verificar:

```ts
test("rejects a module replacement when the technician only reported fixation", () => {
    const result = validateEnhancedDiagnosis(
        "se pego modulo marco doblado",
        "Se realizó el reemplazo y fijación del módulo. El marco se encuentra doblado.",
    );
    assert.deepEqual(result, { ok: false, unsupportedActions: ["replacement"] });
});

test("allows replacement language when the technician reported a change", () => {
    const result = validateEnhancedDiagnosis(
        "cambie el modulo",
        "Se realizó el reemplazo del módulo.",
    );
    assert.deepEqual(result, { ok: true, unsupportedActions: [] });
});

test("does not let the seller intake authorize completed work", () => {
    const prompt = buildRepairDiagnosisPrompt({
        diagnosis: "marco doblado",
        problemDescription: "Cambio de módulo",
        deviceBrand: "Motorola",
        deviceModel: "G05",
    });
    assert.match(prompt, /REPORTE DE INGRESO.*no confirma trabajo realizado/is);
    assert.match(prompt, /INFORME ORIGINAL DEL TÉCNICO.*única fuente/is);
    assert.match(prompt, /marco doblado/);
});
```

Agregar casos equivalentes para reparación, limpieza, medición/prueba y una negación como `no se reemplazó el módulo`, asegurando que una salida afirmativa sea rechazada.

- [ ] **Step 2: Ejecutar el test para verificar RED**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement.test.ts`

Expected: FAIL porque `@/lib/repair-diagnosis-enhancement` todavía no existe.

- [ ] **Step 3: Implementar el módulo puro mínimo**

Crear:

```ts
export type RepairDiagnosisPromptInput = {
    diagnosis: string;
    problemDescription?: string | null;
    deviceBrand?: string | null;
    deviceModel?: string | null;
};

export type DiagnosisValidationResult = {
    ok: boolean;
    unsupportedActions: string[];
};

const ACTION_FAMILIES = [
    { name: "replacement", pattern: /\b(?:cambi\w*|reemplaz\w*|sustitu\w*|instal\w*)\b/g },
    { name: "repair", pattern: /\b(?:repar\w*|reconstru\w*|arregl\w*|solucion\w*)\b/g },
    { name: "cleaning", pattern: /\b(?:limpi\w*|mantenim\w*|ba(?:n|ñ)o\s+quimic\w*)\b/g },
    { name: "verification", pattern: /\b(?:medi\w*|medic\w*|prob\w*|verific\w*|comprob\w*|diagnostic\w*|detect\w*|constat\w*)\b/g },
] as const;

const normalize = (value: string): string => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isNegated = (text: string, index: number): boolean =>
    /\b(?:no|sin)\s+(?:se\s+|realizar\s+(?:el|la)\s+)?$/.test(text.slice(Math.max(0, index - 35), index));

const hasAffirmedAction = (text: string, pattern: RegExp): boolean => {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
        if (!isNegated(text, match.index ?? 0)) return true;
    }
    return false;
};

export const validateEnhancedDiagnosis = (
    originalDiagnosis: string,
    improvedDiagnosis: string,
): DiagnosisValidationResult => {
    const original = normalize(originalDiagnosis);
    const improved = normalize(improvedDiagnosis);
    const unsupportedActions = ACTION_FAMILIES
        .filter(({ pattern }) => hasAffirmedAction(improved, pattern) && !hasAffirmedAction(original, pattern))
        .map(({ name }) => name);
    return { ok: unsupportedActions.length === 0, unsupportedActions };
};
```

En el mismo archivo exportar un system prompt que establezca que el técnico es la única autoridad sobre trabajos realizados, que el vendedor solo aporta contexto, que se debe escribir para clientes y que prohíba convertir fijación en reemplazo. `buildRepairDiagnosisPrompt` debe delimitar marca/modelo, reporte de ingreso e informe técnico, sanitizando delimitadores `<` y `>` de los textos recibidos.

- [ ] **Step 4: Ejecutar el test para verificar GREEN**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement.test.ts`

Expected: PASS en todos los casos de prompt, familias y negación.

- [ ] **Step 5: Commit del módulo puro**

```bash
git add src/lib/repair-diagnosis-enhancement.ts src/__tests__/repair-diagnosis-enhancement.test.ts
git commit -m "fix(repairs): validar coherencia del informe técnico"
```

### Task 2: Integración segura en la API

**Files:**
- Modify: `src/app/api/cerebro/enhance-diagnosis/route.ts`
- Test: `src/__tests__/repair-diagnosis-enhancement-route.test.ts`

- [ ] **Step 1: Escribir la prueba fallida del contrato de la ruta**

Crear una prueba que lea el source de la ruta y confirme:

```ts
test("authenticates before reading diagnosis enhancement request data", () => {
    const source = readFileSync(routeUrl, "utf8");
    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.match(source, /getCurrentUser\(\)/);
    assert.ok(source.indexOf("getCurrentUser()") < source.indexOf("req.json()"));
});

test("validates Groq output before returning an improved diagnosis", () => {
    const source = readFileSync(routeUrl, "utf8");
    assert.match(source, /buildRepairDiagnosisPrompt/);
    assert.match(source, /validateEnhancedDiagnosis/);
    assert.match(source, /coherenceViolation/);
    assert.match(source, /status: 422/);
});
```

- [ ] **Step 2: Ejecutar el test para verificar RED**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement-route.test.ts`

Expected: FAIL porque la ruta no autentica ni aplica el validador.

- [ ] **Step 3: Integrar auth, Zod, prompt y guard**

Modificar la ruta para:

```ts
export const dynamic = "force-dynamic";

const requestSchema = z.object({
    diagnosis: z.string().trim().min(1),
    deviceBrand: z.string().nullish(),
    deviceModel: z.string().nullish(),
    problemDescription: z.string().nullish(),
});

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const parsed = requestSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "El diagnóstico está vacío o es inválido." }, { status: 400 });
        }

        const { diagnosis } = parsed.data;
        const prompt = buildRepairDiagnosisPrompt(parsed.data);
        const { text } = await runWithGroqFallback((groq) => generateText({
            model: groq("llama-3.3-70b-versatile"),
            system: REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT,
            prompt,
            temperature: 0,
            maxOutputTokens: 500,
        }));

        if (text) {
            const improved = text.trim();
            const validation = validateEnhancedDiagnosis(diagnosis, improved);
            if (!validation.ok) {
                return NextResponse.json({
                    error: "La IA intentó agregar un trabajo que no figura en tu informe. Conservamos el texto original para que lo revises.",
                    coherenceViolation: true,
                }, { status: 422 });
            }
            return NextResponse.json({ improved, source: "groq", model: "llama-3.3-70b" });
        }
```

Conservar el fallback 503 y el catch 500 existentes. Eliminar imports sin uso. En el catch, registrar solamente el mensaje normalizado del error.

- [ ] **Step 4: Ejecutar pruebas específicas**

Run: `npx tsx --test src/__tests__/repair-diagnosis-enhancement.test.ts src/__tests__/repair-diagnosis-enhancement-route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit de integración**

```bash
git add src/app/api/cerebro/enhance-diagnosis/route.ts src/__tests__/repair-diagnosis-enhancement-route.test.ts
git commit -m "fix(repairs): bloquear mejoras de groq incoherentes"
```

### Task 3: Verificación de producción

**Files:**
- Verify: all files changed in Tasks 1-2

- [ ] **Step 1: Ejecutar la suite completa**

Run: `npm test`

Expected: 244 o más tests, cero fallos.

- [ ] **Step 2: Ejecutar el gate completo de MACCELL**

Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`

Expected: TypeScript, lint de archivos tocados, `git diff --check` y build pasan.

- [ ] **Step 3: Revisar el diff final**

Run: `git diff HEAD~2 --check && git status --short`

Expected: sin errores de whitespace y sin archivos de implementación sin seguimiento.

- [ ] **Step 4: Confirmar manualmente el caso real sin llamar producción**

Run:

```bash
npx tsx -e 'import { validateEnhancedDiagnosis } from "./src/lib/repair-diagnosis-enhancement"; console.log(validateEnhancedDiagnosis("se pego modulo marco doblado", "Se realizó el reemplazo y fijación del módulo. El marco se encuentra doblado."))'
```

Expected: `{ ok: false, unsupportedActions: [ 'replacement' ] }`.
