> **Regla Git vigente:** trabajar únicamente en `main`. No crear ramas ni worktrees con otra rama salvo pedido explícito posterior del usuario. Conservar el trabajo existente y publicar en `origin/main` cuando se solicite, sin force-push. Esta regla prevalece sobre las referencias históricas a ramas de este archivo; ver [AGENTS.md](AGENTS.md).

> **Archivo histórico.** El contrato operativo vigente está en [AGENTS.md](AGENTS.md). Consultá este historial solo por un tema concreto. Las reglas, cifras, bugs y comandos que siguen corresponden a distintas fechas y pueden estar resueltos o desactualizados; no son instrucciones de ejecución vigentes ni evidencia de producción actual.

# AGENT.md — Guía de trabajo para agentes de IA en MACCELL CRM

Este archivo captura el estilo de trabajo, convenciones y filosofía de desarrollo del proyecto, derivados del análisis de los 427 commits del repositorio. Todo agente que trabaje en este codebase debe leerlo antes de comenzar.

---

## Stack tecnológico

- **Framework:** Next.js 15 con App Router (TypeScript estricto)
- **Base de datos:** PostgreSQL vía Prisma ORM
- **UI:** Tailwind CSS + shadcn/ui + Recharts
- **AI/ML:** Groq API (principal), OpenRouter (fallback), Vercel AI SDK, embeddings Xenova, RAG con pgvector
- **Infraestructura:** Docker + Dokploy, standalone Next.js build
- **Integraciones:** AFIP (facturación electrónica argentina), ENACOM (IMEI), Zebra (impresoras térmicas)
- **React:** v19 (usar `--legacy-peer-deps` para compatibilidad de paquetes)

---

## Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| `cerebro` | Asistente de IA con RAG, wiki, schemáticos, diagnóstico técnico |
| `admin` | Dashboard ejecutivo, KPIs, gastos, caja, facturas, backups |
| `pos` | Punto de venta, facturación AFIP, caja |
| `repairs` | Gestión de reparaciones, técnicos, estados, historial |
| `stock` | Inventario, repuestos, control por sucursal |
| `vendor` | Portal del vendedor, métricas, stock |
| `technician` | Portal del técnico, trabajo activo, dashboard |
| `analytics/statistics` | Reportes, gráficos, métricas operativas |
| `public` | Página de seguimiento de reparación con QR |

---

## Convenciones de commits

### Prefijos usados (en orden de frecuencia)

```
fix:       Corrección de bug (el más usado — 202 commits)
feat:      Nueva funcionalidad (130 commits)
style:     Cambios visuales / CSS
chore:     Mantenimiento, configs, deps
perf:      Optimización de rendimiento
refactor:  Refactorización sin cambio de comportamiento
revert:    Revertir cambios previos
docs:      Documentación
Enhance:   Mejora incremental (usado en el módulo Cerebro)
```

### Scopes más usados

```
(cerebro) — 70 commits   (el módulo más activo)
(admin)   — 13 commits
(repairs) — 7 commits
(deploy)  — 6 commits
(vendor)  — 5 commits
(pos)     — 5 commits
(statistics) — 5 commits
(technician) — 6 commits
```

### Formato de mensaje preferido

```
tipo(scope): descripción corta y concisa en minúsculas

# Ejemplos reales del proyecto:
feat(cerebro): implement dual-mode personality (Standard vs Mentor) with dynamic detection
fix(admin): use local tz for default expenses date to prevent early rollover
perf(admin-repairs): implement debounced search to fix typing lag
refactor(vendor): optimize vendor layout performance
```

Para cambios que agrupan múltiples arreglos, se usan guiones em (—):

```
feat/fix: update cerebro AI with device isolation context, free duckduckgo web search fallback, and fix RAG similarity extraction
```

---

## Filosofía y patrones de desarrollo

### 1. Ship fast, fix fast

El proyecto tiene ciclos de desarrollo muy cortos e intensos. El día más activo registró **67 commits en un solo día** (2026-02-24). El estilo es: construir, desplegar, observar, corregir, iterar. No se espera perfección en el primer intento.

### 2. Fixes atómicos y descriptivos

Cada fix debe mencionar exactamente qué se rompía y por qué. Ejemplos del estilo correcto:

```
fix(cerebro): parallelize classifySymptom to fix connection timeout errors
fix(stock-actions): replace unsafe json query with fetch-filter-update logic for compatibility
fix(deploy): definitive fix for libssl3 and cerebro_schematics persistence
```

### 3. Revert sin miedo

Se usan `revert:` commits cuando algo no funciona en producción. No hay vergüenza en revertir. Hay al menos 5 reverts en el historial. Mejor revertir rápido que aguantar un bug en prod.

### 4. Resiliencia como prioridad

Un commit registra: *"fix: massive resilience update addressing 22 POS bugs and security enforcement"*. La robustez ante errores es un valor central. Siempre usar try/catch en rutas de API, fallbacks para modelos de AI, y guards para datos nulos o undefined.

### 5. Iteración de UI refinada

La UI pasa por múltiples iteraciones explícitas. Es normal ver commits como:
- `style: update repair status badges to use vibrant colors`
- `style: revert to solid bright kpi colors`
- `style(technician): unify kpi card styles and colors`

No hay una sola pasada de diseño. Se ajusta hasta que queda bien visualmente.

### 6. Seguridad explícita

- Nunca exponer precios en contextos de AI (`fix: strictly prohibit price mentions`)
- Proteger prompts del sistema contra leakage (`fix: sanitize prompts to prevent instruction leakage`)
- Auth estricta para sucursales (`fix: strict afip auth for 8bit`)

---

## Reglas de código

### TypeScript

- Tipado estricto en todo momento. Si hay un error de tipos, no hacer cast a `any` salvo que sea el último recurso y se comente el motivo.
- Usar `findUniqueOrThrow` de Prisma en lugar de `findUnique` + chequeo manual cuando se espera que el registro exista.
- Evitar hooks condicionales en React — causó bugs serios (`fix: resolve React Error 310 by fixing conditional hooks`).

### API Routes (Next.js App Router)

- Todas las rutas deben tener try/catch y retornar errores descriptivos.
- Usar `export const dynamic = 'force-dynamic'` en páginas que consultan la DB para evitar cache de build.
- Límite de body por defecto puede ser insuficiente — configurar `bodySizeLimit` explícitamente para uploads.

### Prisma

- Siempre correr `prisma generate` antes del build.
- Para operaciones concurrentes en stock, usar `updateMany` con condiciones optimistas (no `update` directo).
- En Docker, incluir `debian-openssl-3.0.x` como binaryTarget para compatibilidad.

### Recharts

- Siempre envolver charts en un estado `isReady` con delay para evitar errores de dimensiones en SSR/hydration.
- Asignar `minWidth` y `minHeight` a los contenedores de charts.

### Timezone

- El negocio opera en **Argentina (UTC-3)**. Siempre usar offset manual o `tzdata` en Docker.
- Para fechas de gastos, facturas o turnos: forzar timezone local, nunca asumir UTC del servidor.

---

## Módulo Cerebro — reglas especiales

Cerebro es el asistente de IA técnico. Es el módulo más complejo y activo del sistema (70 commits).

### Modelo AI

- **Principal:** Groq (gratis, alta velocidad). Usar pool de API keys con rotación.
- **Fallback:** OpenRouter → modelo secundario.
- No usar `maxRetries` en Vercel AI SDK con Groq free tier (causa cuelgues por rate limit 429).

### RAG

- Embeddings con Xenova (384 dimensiones), almacenados en PostgreSQL con pgvector o arrays `float8` nativos como fallback.
- Búsqueda híbrida: semántica + keyword con RRF (Reciprocal Rank Fusion).
- Threshold de similaridad bajo (≥0.3) para no perder resultados relevantes.
- Aislar contexto por marca/dispositivo — nunca mezclar datos de distintas marcas en el RAG.

### Prompts y Diagnóstico Técnico Senior

- Prioridad absoluta a datos de la base de conocimiento (wiki) y biblioteca técnica sobre conocimiento general del modelo.
- Seguir el **Protocolo de Triage Diagnóstico T0-T4** (ver `.agents/skills/cerebro-diagnostic-engine/SKILL.md`):
  1. Triage Periférico (módulo/flex bueno conocido antes de micro-soldar).
  2. Medición de consumo (fuente DC / USB tester).
  3. Rastreo esquemático con páginas exactas y link interactivo al Workbench (`/technician/schematics`).
  4. Cita de casos documentados (`Repair Cases` / fallas típicas de la serie).
  5. Próximo paso seguro con instrumento, escala y criterio binario.
- Modo Mentor: diagnóstico progresivo, guiar al técnico en microelectrónica sin parálisis robótica ni alucinaciones.
- Prohibir estrictamente mencionar precios o información comercial en diagnósticos de Cerebro.
- Aplicar guards de marca: detectar si el dispositivo es iOS o Android antes de mencionar ICs específicos.
- Destilación estricta de tickets CRM: jamás indexar tickets `NO_REPAIR` (status 7) o notas de mostrador; solo *Golden Records* técnicos.
- Normalización obligatoria en `/mnt/data2`: mapear subcarpetas como `iPhone(VIP)` a marca canónica `APPLE`.

### Schemáticos

- Máximo 8k chars de contexto para no superar TPM de Groq free tier.
- Para archivos grandes (>100k chars), usar fragmentación inteligente con ventana deslizante.
- Integrar con el visor interactivo de esquemáticos y boardviews para permitir abrir la página relevante de inmediato.

---

## Infraestructura y despliegue

- **Deploy:** Dokploy con Docker. Build standalone de Next.js.
- El `prisma db push` o `prisma migrate deploy` debe correr en **runtime** (start), no en build time.
- `prisma generate` debe correr **en build time**.
- Los backups de DB se guardan en el filesystem (volumen mapeado en Dokploy), no en la base de datos.
- Usar `node:20-slim` como base image (no alpine, no compatible con workers nativos ONNX/Sharp).

---

## Estilo de trabajo del desarrollador

### Ritmo

El desarrollador trabaja en **sesiones intensas de muchas horas**, con commits cada pocos minutos durante picos de desarrollo. Esto significa:

- Es normal que un PR o rama tenga 20-60 commits.
- Los mensajes de commit son el registro de pensamiento en tiempo real.
- Se prefiere hacer commit frecuente sobre commits grandes monolíticos.

### Idioma

- Código y commits: **inglés** (mayoritariamente).
- Comentarios internos y commits de urgencia: a veces **español** (especialmente en madrugadas o cuando el problema es urgente).
- Mezcla natural de ambos idiomas en el mismo commit está bien.

### Prioridades en producción

1. Que funcione y no explote → fix inmediato
2. Que sea rápido → perf/debounce/SSR
3. Que se vea bien → style iterations
4. Que esté bien abstraído → refactor (menor prioridad, se hace cuando hay tiempo)

---

## Qué hacer y qué no hacer al contribuir

### Hacer

- Commits pequeños y frecuentes con mensajes descriptivos del problema y la solución.
- Mencionar el módulo afectado en el scope: `fix(cerebro):`, `feat(admin):`, etc.
- Al corregir un bug, describir la causa raíz en el mensaje del commit.
- Usar `force-dynamic` en páginas con datos en tiempo real.
- Probar en mobile: el CRM se usa desde celular en el taller.
- Correr `npm test` antes de hacer un commit en módulos de cálculo (caja, bonos, fechas, AFIP).

### No hacer

- No hacer un solo commit con 10 features mezcladas sin separación.
- No asumir timezone UTC — siempre Argentina (UTC-3).
- No usar `any` en TypeScript salvo último recurso documentado.
- No cachear páginas de admin o dashboard (datos siempre frescos).
- No mixear datos de marcas diferentes en el contexto RAG de Cerebro.
- No exponer precios ni datos del negocio en respuestas de la AI.
- No hacer commit con `console.log` en `src/actions/` o `src/lib/` — el linter lo bloquea.

---

## Las 3 reglas que evitan el 80% de la deuda técnica

Estas reglas nacen del análisis de los 427 commits y los 21 code smells encontrados. No son sugerencias — son el contrato de trabajo para este proyecto y cualquier proyecto futuro.

### Regla 1 — Cero `console.log` en actions y lib

**Por qué se rompió:** El ciclo `bug → console.log para debuggear → fix → console.log olvidado` se repitió decenas de veces. El resultado: 129 `console.log` acumulados incluyendo emails de usuarios, CUITs de AFIP y búsquedas de vendedores loggeadas en producción.

**La regla:**
```
src/actions/**   → console.log prohibido (configura ESLint no-console: error)
src/lib/**       → console.log prohibido (mismo)
src/app/api/**   → solo console.error permitido para errores reales
```

**Cómo no olvidarlo:** El ESLint ya está configurado en el proyecto. Agregar esta regla al `eslint.config.mjs` hace que el linter lo rechace antes del commit, no después.

Para debugging temporal, usar `console.warn` con un prefijo `[DEBUG]` para que sea buscable y eliminable:
```typescript
// ✅ Debug temporal — buscable y claramente marcado para eliminar
console.warn("[DEBUG] repair search term:", cleanTerm);

// ❌ Debug que se olvida y llega a producción
console.log("Search term:", cleanTerm);
```

---

### Regla 2 — Todo fix de emergencia tiene un `TECH_DEBT` inmediato

**Por qué se rompió:** El monkey-patch global de TLS para AFIP, el `$queryRaw` fallback por Prisma desincronizado, el `(prisma as any).expense` — todos fueron la solución más rápida bajo presión. El problema es que la urgencia desaparece cuando el fix funciona, y nadie vuelve a limpiar.

**La regla:** En el momento del fix de emergencia, el mismo commit agrega un comentario con formato estandarizado:

```typescript
// TECH_DEBT(2026-01): Monkey-patch global para AFIP SSL.
// Impacto: degrada TLS de TODAS las conexiones HTTPS del proceso.
// Fix real: httpsAgent customizado solo para las llamadas a AFIP.
// Contexto: servidores de AFIP usan DH keys < 1024 bits (error: dh key too small).
// Ticket: cuando haya tiempo, ver https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions
```

El prefijo `TECH_DEBT` hace que `grep -r "TECH_DEBT" src/` devuelva toda la deuda técnica del proyecto en un solo comando. Es el inventario de cosas por limpiar.

---

### Regla 3 — Un archivo > 300 líneas se divide antes de agregar más código

**Por qué se rompió:** Ningún archivo empieza con 1000 líneas. `dashboard-actions.ts` llegó a 1166 líneas de a 20-30 líneas por feature. Sin una regla de corte automática, el crecimiento es invisible.

**La regla:** Cuando un archivo llega a 300 líneas, la siguiente tarea antes de agregar features es dividirlo. No después. No "cuando haya tiempo".

División correcta de `dashboard-actions.ts` (ejemplo):
```
src/actions/dashboard/
  kpis.ts          ← métricas de ventas y caja
  repairs.ts       ← conteos de reparaciones y urgencias
  technicians.ts   ← workload y presencia de técnicos
  cash.ts          ← turnos y cierres de caja del dashboard
  index.ts         ← re-exporta todo para compatibilidad
```

El `index.ts` de re-exportación garantiza que ningún import existente se rompe.

**Regla adicional para components:** Un componente con más de 15 `useState` necesita ser dividido en subcomponentes o refactorizado con `useReducer`. `pos-client.tsx` con 25+ estados es el ejemplo de qué no hacer.

---

## Testing — Cómo correr los tests antes de tocar algo

El proyecto usa **Vitest** para tests unitarios. Los tests están en `src/__tests__/`.

### Correr tests

```bash
npm test              # corre todos los tests
npm run test:watch    # modo watch durante desarrollo
npm run test:ui       # interfaz visual en el browser
```

### Qué cubren los tests actuales

Los tests cubren los módulos más críticos del sistema: aquellos donde un error silencioso tiene impacto en **dinero real o datos de facturación**.

| Archivo de test | Módulo cubierto | Por qué es crítico |
|-----------------|-----------------|-------------------|
| `date-utils.test.ts` | `lib/date-utils.ts` | Fecha incorrecta = cierre de caja en día equivocado, factura AFIP inválida |
| `bonus-calc.test.ts` | Cálculo de bonus en `cash-shift-actions.ts` | Dinero directo a empleados — un error en el umbral afecta cada cierre |
| `repair-statuses.test.ts` | Mapa de IDs de estado | Status equivocado = reparación invisible para técnico o cliente |
| `groq-fallback.test.ts` | `lib/groq.ts` | Sin fallback el chat de Cerebro cae completamente |
| `business-hours.test.ts` | `lib/services/business-hours.ts` | Fecha prometida incorrecta = cliente enojado, mala métrica de tiempo |

### 🥇 REGLA DE ORO — Todo lo que se crea tiene su test en Vitest

**Sin excepción.** Cada función nueva, cada acción nueva, cada utilería nueva tiene su archivo `.test.ts` correspondiente en `src/__tests__/`. No se considera "terminado" si no tiene tests.

```
CREASTE src/lib/nueva-utileria.ts
→ OBLIGATORIO: src/__tests__/nueva-utileria.test.ts

CREASTE src/actions/nuevo-modulo.ts
→ OBLIGATORIO: src/__tests__/nuevo-modulo.test.ts

CREASTE src/lib/services/nuevo-servicio.ts
→ OBLIGATORIO: src/__tests__/nuevo-servicio.test.ts
```

Esto no es burocracia — es la diferencia entre saber que algo funciona y creer que funciona. En este proyecto hubo días enteros perdidos arreglando cosas que se rompieron silenciosamente. Los tests hacen ese ciclo imposible.

---

### Qué testear y qué no

**Testear siempre:**
- Funciones de cálculo (dinero, bonos, totales, descuentos)
- Funciones de fecha y timezone (rangos, formateo, horarios comerciales)
- Lógica de negocio pura (estados de reparación, validaciones, reglas)
- Funciones de fallback y resiliencia (rotación de keys, retry logic)
- Transformaciones de datos (mapeos, serializaciones, parseos)

**No requiere test:**
- Componentes React visuales (botones, tablas, modales)
- Queries de listado simples (findMany sin lógica)
- Páginas de Next.js (el framework las maneja)
- Configuraciones estáticas (tailwind, next.config.ts)

La regla práctica: **si la función recibe datos y devuelve datos sin tocar la DB ni el DOM, tiene test.** Si toca la DB o el DOM, no es prioritario.

---

### Estructura de un test en este proyecto

```typescript
// src/__tests__/nombre-del-modulo.test.ts
import { describe, it, expect } from "vitest";
import { miFuncion } from "@/lib/mi-modulo"; // mismo alias que usa el proyecto

describe("miFuncion", () => {

    it("caso normal — descripción en español de qué tiene que pasar", () => {
        const resultado = miFuncion(inputNormal);
        expect(resultado).toBe(valorEsperado);
    });

    it("caso borde — qué pasa con input vacío o extremo", () => {
        const resultado = miFuncion(inputVacio);
        expect(resultado).toBe(valorPorDefecto);
    });

    it("caso de error conocido — el bug que se encontró y se arregló", () => {
        // Documentar el bug con el número de BUG del AGENT.md
        // BUG LATENTE 1: status 4 es PAUSED no LISTO
        const resultado = miFuncion(inputQueAntesFallaba);
        expect(resultado).not.toBe(valorIncorrecto);
        expect(resultado).toBe(valorCorrecto);
    });

});
```

Los nombres de los tests son en **español** — el negocio es argentino, las reglas de negocio se entienden mejor en el idioma del dominio.

---

### Flujo obligatorio antes de hacer cualquier fix

```bash
# PASO 1 — Estado conocido: todos los tests pasan antes de tocar nada
npm test

# PASO 2 — Hacer el fix en el código

# PASO 3 — Los tests siguen pasando (no se rompió nada)
npm test

# PASO 4 — Si el fix corrige un bug documentado en AGENT.md,
#           agregar un test que cubra ese caso específico
#           para que no vuelva a aparecer nunca

# PASO 5 — Commit
git add src/__tests__/modulo-afectado.test.ts
git commit -m "fix(modulo): descripción del fix + test de regresión"
```

El test de regresión en el Paso 4 es lo más importante. Es la diferencia entre "arreglé el bug" y "el bug no puede volver". En este proyecto hubo commits como `fix(cerebro): fix again` y `fix(pos): revert and redo` — esos commits no habrían existido si hubiera un test que dijera "este caso tiene que funcionar así".

---

### Regla de testing para este proyecto

**No se requieren tests para todo.** Se requieren tests para:
1. Cualquier función que calcule **dinero** (bonos, totales, facturación)
2. Cualquier función que calcule **fechas** (rangos, zonas horarias, horarios)
3. Cualquier función que determine **estados de reparación** (flujo de trabajo completo)
4. Cualquier función de **fallback crítico** (AI, DB, impresoras)

Las páginas React, los componentes UI, y las queries de listado **no necesitan tests** en este proyecto — el costo de mantenerlos supera el beneficio para el tamaño actual del equipo.

### Antes de arreglar cualquier bug de cálculo

```bash
# 1. Verificar que los tests actuales pasan (estado conocido)
npm test

# 2. Hacer el fix

# 3. Verificar que siguen pasando
npm test

# 4. Si el fix cambia comportamiento, agregar un test que documente el caso
```

Esto reemplaza el ciclo actual de: hacer fix → clickear manualmente toda la app → esperar que alguien reporte si algo se rompió.

---

## Bugs reales y code smells encontrados en el código

Este análisis está basado en lectura línea a línea de los archivos más críticos del proyecto. Cada ítem está referenciado con el archivo y línea exacta.

---

### 🔴 BUG CRÍTICO 1 — `enrichShifts` tiene N+1 queries (cash-shift-actions.ts:336)

La función `enrichShifts` hace `Promise.all(shifts.map(async (shift) => { prisma.sale.findMany(...) }))`. Si hay 20 cierres de caja en el mes, ejecuta **20 queries de ventas + 20 queries de gastos = 40 queries** en lugar de 2.

El developer ya solucionó esto creando `getCashShiftsInRangeOptimized` (línea 205) que hace batch queries y luego filtra en memoria. Pero `getCashShiftById` (línea 75) todavía llama al viejo `enrichShifts`, por lo que el detalle individual de un turno sigue siendo N+1.

```typescript
// ❌ ACTUAL en getCashShiftById
const [enriched] = await enrichShifts([shift]);  // N+1 por shift

// ✅ FIX: reemplazar enrichShifts por getCashShiftsInRangeOptimized
// y pasar el rango de tiempo del shift
```

---

### 🔴 BUG CRÍTICO 2 — Error silencioso en gastos (cash-shift-actions.ts:365)

```typescript
try {
    expenses = await (prisma as any).expense.findMany({ ... });
} catch (err) { }  // ← ERROR TRAGADO SIN LOGGEAR
```

Si la query de gastos falla, `expenses` queda como `[]` y el total del turno calculado será **incorrecto** — mostrará menos gastos de los reales sin ningún aviso. El catch vacío hace imposible detectar cuándo esto ocurre en producción.

---

### 🔴 BUG CRÍTICO 3 — AFIP baja la seguridad TLS global (lib/afip.ts:8-21)

```typescript
// --- NUCLEAR FIX FOR AFIP SSL ERROR (DH KEY TOO SMALL) ---
(tls as any).createSecureContext = function (options: any) {
    options.ciphers = 'DEFAULT:@SECLEVEL=0';
    options.minVersion = 'TLSv1';
    ...
};
```

Este monkey-patch modifica `tls.createSecureContext` **globalmente** para todo el proceso de Node.js. Esto significa que **todas** las conexiones HTTPS del servidor (a Groq, a OpenRouter, a ENACOM, a cualquier API) usan los ciphers degradados y TLS 1.0. No solo las conexiones a AFIP. Es un riesgo de seguridad real en producción.

**Fix:** usar `httpsAgent` customizado solo para las llamadas a AFIP en lugar de parchear el módulo global.

---

### 🟠 BUG LATENTE 1 — Cron con status IDs equivocados (api/cron/enrich-diagnoses/route.ts:20)

```typescript
statusId: { in: [4, 5] } // Asumiendo que 4=Listo y 5=Entregado
```

El comentario está **mal**. Según el resto del código:
- `statusId: 4` = **Pausado** (no "Listo")
- `statusId: 5` = **Finalizado OK** (correcto para enriquecer)
- `statusId: 10` = **Entregado** (no está incluido)

El cron enriquece diagnósticos de reparaciones **Pausadas** (que aún están en proceso) en lugar de solo las finalizadas. Esto puede generar diagnósticos enriquecidos de reparaciones que todavía no terminaron.

---

### 🟠 BUG LATENTE 2 — `takeRepairAction` no asigna el técnico (technician-actions.ts:27)

```typescript
data: {
    // assignedUserId: technicianId, // REMOVED as per request
    statusId: 2, // Tomado por Técnico
```

El técnico "toma" la reparación (status → 2) pero `assignedUserId` queda como `null`. Esto significa que si se filtran reparaciones por técnico asignado, esta no aparece. Hay comentarios posteriores en `assignTimeAction` que hacen el assign real, por lo que el flow depende de que se llame AMBAS acciones en secuencia — si solo se llama `takeRepairAction`, el repair queda en un estado inconsistente.

---

### 🟠 BUG LATENTE 3 — `highPriorityCount` cuenta mal las urgencias (dashboard-actions.ts:283)

```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const highPriorityCount = repairsActive.filter(r =>
    r.promisedAt && new Date(r.promisedAt) < tomorrow
).length;
```

Esto cuenta como "alta prioridad" todas las reparaciones con fecha prometida antes de mañana — incluyendo todas las **vencidas** desde semanas atrás + las que vencen **hoy**. Si hay 50 reparaciones retrasadas de hace 3 semanas, todas se muestran como "alta prioridad", lo que hace el indicador inútil. Debería separar "vencidas" de "vence hoy".

---

### 🟠 BUG LATENTE 4 — Dos funciones de enriquecimiento sobrescriben el mismo campo

Hay dos caminos de enriquecimiento de diagnóstico que escriben en `diagnosisEnriched`:

1. **Cron nocturno** (`/api/cron/enrich-diagnoses`) — usa `ENRICH_DIAGNOSIS_SYSTEM_PROMPT`
2. **Botón manual** (`/api/cerebro/enhance-diagnosis`) — usa `ENHANCE_DIAGNOSIS_SYSTEM_PROMPT`

Ambos escriben en el mismo campo `diagnosisEnriched`. Si el técnico mejoró manualmente el diagnóstico y después corre el cron, el cron **sobreescribe** el trabajo manual del técnico con la versión automática. El cron debería checkear si `diagnosisEnriched` ya tiene contenido antes de sobrescribir.

---

### 🟠 BUG LATENTE 5 — Dead code en `getSalesAnalytics` (dashboard-actions.ts:14)

```typescript
const { start: todayStart } = getDailyRange(); // Not used directly here but good for ref reference
```

`todayStart` nunca se usa en la función. El comentario dice "good for ref reference" lo cual indica que se dejó por si acaso. En producción esto ejecuta un cálculo de timezone innecesario en cada llamada al dashboard.

---

### 🟡 CODE SMELL 1 — 108 `console.log` en código de producción

```
src/actions/  → 25 console.log
src/lib/      → 71 console.log
src/components/ → 12 console.log
```

La función `searchSparePartsAction` tiene 6 `console.log` consecutivos que loggean cada búsqueda con el término, longitud, whitespace detectado, y resultados encontrados. En un sistema con 10 usuarios buscando repuestos activamente, esto genera cientos de logs por minuto en producción.

---

### 🟡 CODE SMELL 2 — `(prisma as any).expense` debería ser `prisma.expense`

En `enrichShifts` y `updateCashShiftDate` aparece:
```typescript
if ((prisma as any).expense) {
    const expenses = await (prisma as any).expense.findMany({ ... });
}
```

El modelo `Expense` existe en el schema. Este cast a `any` es un vestigio de cuando el modelo no existía y se agregó defensa runtime. Ahora enmascara el tipo real, apaga el autocompletado de TypeScript, y si `prisma generate` falla silenciosamente, el check `(prisma as any).expense` retorna `true` de todas formas (porque es una propiedad del objeto).

---

### 🟡 CODE SMELL 3 — 40+ usos de status IDs mágicos sin constantes

En 40+ lugares del código hay queries con `statusId: { in: [5, 6, 10] }` o `toStatusId === 2`. El único archivo que los documenta es un comentario al inicio de `technician-actions.ts`:

```typescript
// Status IDs:
// 2: Tomado por Técnico (Claimed)
// 4: Pausado (Time Assigned / Planned)
// 3: En Proceso (Started)
// 5-9: Final states
```

Pero ese comentario está **incompleto** (no incluye 7, 8, 9, 10) y **solo en un archivo**. Cuando alguien edita `statistics-actions.ts` y ve `statusId: { in: [5, 6, 7, 10] }` no tiene ninguna referencia cercana de qué significan esos números.

---

### 🟡 CODE SMELL 4 — `EmbeddingPipeline` singleton no usa `globalThis` (local-embeddings.ts)

```typescript
class EmbeddingPipeline {
    private static instance: FeatureExtractionPipeline | null = null;
```

`db.ts` usa correctamente el patrón `globalThis.prisma_v3` para evitar reinstanciar Prisma en cada hot reload de Next.js dev. `EmbeddingPipeline` usa una variable estática de clase que **se resetea en cada hot reload**, forzando la descarga del modelo all-MiniLM (~23MB) repetidamente durante desarrollo.

---

### 🟡 CODE SMELL 5 — `cerebro-indexer.ts` usa dynamic import innecesario

```typescript
// En cada llamada a indexRepair():
const { db } = await import('@/lib/db');
```

`db` podría importarse al inicio del archivo como import estático. El dynamic import fuerza resolución de módulo en cada invocación del indexador, agregando latencia innecesaria a cada reparación indexada.

---

### 🟡 CODE SMELL 6 — La lógica de bonus está duplicada exactamente

El cálculo de bonus aparece **dos veces** con el mismo código:

```typescript
// En enrichShifts (línea ~392):
const bonusRate = totalSales >= 1200000 ? 0.02 : 0.01;
const count = (shift as any).employeeCount || 1;
const perEmp = (Math.round((totalSales * bonusRate) / 1000) * 1000);
finalBonus = perEmp * count;

// En getCashShiftsInRangeOptimized (línea ~287): MISMO CÓDIGO EXACTO
```

Si el umbral de 1.200.000 o la tasa de 2% cambia, hay que acordarse de cambiarlo en dos lugares. Ya fue fuente de bugs — el commit `Update bonus threshold to 1.2M` en enero era probablemente para actualizar uno de los dos.

---

### 🟡 CODE SMELL 7 — Debate interno en comentario de producción (statistics-actions.ts:72-86)

```typescript
// Actually, "Delivered" state timestamp change is the "delivery" event.
// But if we want unique count, maybe use finishedAt?
// "Delivered Count" usually means "How many left the shop".
// ...
// However, "Delivered" is a distinct event from "Finished".
// ...
// Wait, Delivered (10) is a SUBSET of Finished.
```

Hay un bloque de 14 líneas de comentarios que son un monólogo interno resolviendo una ambigüedad de diseño. La decisión final nunca queda clara — el comentario termina con "Let's assume" y deja el código usando `updatedAt` sin resolución definitiva. Esto confunde a cualquiera que toque ese código después.

---

### 🟡 CODE SMELL 8 — Solo 1 de 15 API routes tiene verificación de auth

```
src/app/api/  → 15 route.ts
Auth checks   → 1 (solo /api/cerebro usa getCurrentUser)
```

Rutas como `/api/admin/spare-parts`, `/api/backups/[filename]`, `/api/system/version` no verifican sesión. Cualquier usuario con acceso a la URL puede ejecutar estas acciones. El sistema confía en que el middleware de Next.js proteja las rutas, pero no hay doble verificación en el handler de la API.

---

### ✅ CÓDIGO QUE SÍ ESTÁ MUY BIEN ESCRITO

Para referencia — estos son los archivos que deberían servir como modelo de calidad:

| Archivo | Por qué es un buen ejemplo |
|---------|---------------------------|
| `lib/date-utils.ts` | JSDoc completo con ejemplos, funciones puras, nombres descriptivos |
| `lib/cerebro-rag.ts` | Separación clara con delimitadores, tipos definidos, fallbacks documentados |
| `lib/local-embeddings.ts` | Singleton bien implementado, comentarios explicando las decisiones técnicas |
| `lib/cerebro-indexer.ts` | Propósito claro, logging consistente con prefijo `[CEREBRO_INDEXER]` |
| `config/ai-models.ts` | Prompts separados en constantes nombradas con contexto, fácil de modificar |
| `actions/repairs/technician-actions.ts` | Tiene el comentario del mapa de IDs al inicio (aunque incompleto) |

---

## Análisis del código actual — Qué hace lenta la programación

Este análisis está basado en la lectura real del código fuente (332 archivos, ~53.000 líneas). Identifica los patrones que causan días enteros de trabajo para features que deberían tomar horas.

### Problema 1 — Archivos dios (God Files)

Estos son los archivos más grandes del proyecto:

```
dashboard-actions.ts         1166 líneas
spare-parts-client.tsx       1169 líneas
spare-parts.ts                704 líneas
repairs.ts (lib/actions)     1024 líneas
statistics-actions.ts         583 líneas
cerebro-chat.tsx              581 líneas
```

Un archivo de 1166 líneas es difícil de leer, difícil de modificar sin romper algo, y difícil de debuggear. Cuando hay un bug en `dashboard-actions.ts`, hay que navegar ~1000 líneas para encontrarlo.

**Regla para futuros proyectos:** Ningún archivo debería superar 300 líneas. Si lo supera, dividir por responsabilidad. Por ejemplo, `dashboard-actions.ts` debería ser: `dashboard-kpis.ts`, `dashboard-repairs.ts`, `dashboard-sales.ts`, `dashboard-cash.ts`.

---

### Problema 2 — Sin capa de servicio (Service Layer)

El proyecto tiene apenas 3 archivos en `src/lib/services/` (business-hours, customers, tickets). El resto de los 31 archivos de acciones hacen queries directas a Prisma sin ninguna capa intermedia. Esto significa que:

- La misma query se repite en múltiples archivos
- Cambiar una regla de negocio (ej: cómo se calcula el tiempo promedio de reparación) requiere buscar en 10 archivos
- No hay ningún lugar único de verdad para la lógica de negocio

**Estructura recomendada para futuros proyectos:**

```
src/
  lib/
    repositories/       ← Solo queries de DB (sin lógica)
      repair.repository.ts
      sale.repository.ts
      stock.repository.ts
    services/           ← Lógica de negocio pura
      repair.service.ts
      stock.service.ts
      stats.service.ts
  actions/              ← Solo orchestración: llama servicios, revalida cache
    repairs.ts
    stock.ts
```

---

### Problema 3 — Polling manual duplicado (18 setInterval)

El proyecto tiene **18 llamadas a `setInterval`** distintas distribuidas en toda la app:

```
admin/layout.tsx          → polling de presencia
technician/layout.tsx     → polling de presencia
vendor-layout-client.tsx  → polling de presencia
notification-bell.tsx     → polling cada 4 segundos
stock-table.tsx           → polling de stock
admin-repairs-table.tsx   → polling de reparaciones
cerebro-chat.tsx          → polling de tokens
version-updater.tsx       → polling de versión
...
```

Cada uno de estos maneja su propio `clearInterval` manualmente. Cuando uno falla o genera una condición de carrera, es casi imposible debuggearlo porque el problema está distribuido en 18 lugares distintos.

Esto causó directamente commits como:
- `fix(stock): stabilize search input by adding focus-aware polling guards`
- `perf(admin-repairs): implement debounced search to fix typing lag`
- `fix(repairs): sync estimatedTime with promisedAt when extending deadline`

**Solución para futuros proyectos:** Un único hook `usePolling` o usar SWR/React Query que maneja polling, deduplicación, y cleanup automáticamente:

```typescript
// Un hook reutilizable que reemplaza los 18 setInterval
function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number) {
  const [data, setData] = useState<T>();
  useEffect(() => {
    fetcher().then(setData);
    const id = setInterval(() => fetcher().then(setData), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return data;
}
```

O mejor: usar **SWR** con `refreshInterval` que ya tiene deduplicación, revalidación en focus, y manejo de errores integrado.

---

### Problema 4 — Prompts de AI hardcodeados en el route

El archivo `src/app/api/cerebro/chat/route.ts` tiene 716 líneas, de las cuales ~500 son strings de prompts del sistema (`BASE_INSTRUCTIONS`, `STANDARD_PROMPT`, `MENTOR_PROMPT`, `FINAL_DIRECTIVE`). Esto significa que cada vez que se quiere ajustar el comportamiento de Cerebro, hay que:

1. Abrir un archivo TypeScript de 716 líneas
2. Modificar strings gigantes mezclados con lógica de routing
3. Hacer commit y redeploy del servidor completo

Esto explica los **70 commits al módulo cerebro** — la mitad son ajustes de prompts que podrían ser ediciones en un archivo de texto plano.

**Solución para futuros proyectos:** Separar prompts en archivos `.md` o `.txt` que se cargan en runtime:

```
src/lib/prompts/
  cerebro-base.md
  cerebro-standard.md
  cerebro-mentor.md
  cerebro-final-directive.md
```

En desarrollo se pueden editar sin tocar TypeScript. En producción se pueden incluso guardar en DB para editar desde admin.

---

### Problema 5 — Sin custom hooks (solo 1 en todo el proyecto)

El proyecto tiene **un solo custom hook**: `use-debounce.ts`. Toda la lógica de estado, polling, y efectos secundarios está duplicada dentro de los componentes. Los componentes `spare-parts-client.tsx` y `products-client.tsx` tienen ~1000 líneas cada uno en parte porque contienen lógica que debería estar en hooks reutilizables.

Lógica que se repite en múltiples componentes y debería ser un hook:

```typescript
useRepairPolling()        // usado en 3+ componentes
useStockCheck()           // usado en 2+ lugares
usePresenceHeartbeat()    // duplicado en 3 layouts
useNotifications()        // en bell + layouts
useArgentinaDate()        // timezone siempre manual
```

---

### Problema 6 — IDs mágicos de estado

En `technician-actions.ts` hay queries como:

```typescript
toStatusId: { in: [5, 6, 7] }
```

¿Qué son 5, 6, y 7? Nadie lo sabe sin mirar la DB. Si algún día se agrega un nuevo estado o se reordena la tabla, este código falla silenciosamente.

**Regla para futuros proyectos:** Siempre definir un enum o constante:

```typescript
// src/lib/constants/repair-statuses.ts
export const REPAIR_STATUS = {
  IN_PROGRESS: 3,
  OK: 5,
  DELIVERED: 6,
  NO_REPAIR: 7,
} as const;
```

---

### Problema 7 — Sin tests (0 archivos de test)

El proyecto tiene 332 archivos de código y cero tests. Esto no es un juicio — es una realidad del ritmo de desarrollo. Pero contribuye directamente a los días largos: cuando se toca `cash-shift-actions.ts` para arreglar un cálculo, no hay forma de saber si se rompió algo en AFIP, en el cierre de caja, o en las estadísticas sin hacer click manualmente en toda la app.

Los módulos más críticos que necesitarían tests primero son:
- `lib/afip.ts` — cálculos de facturación AFIP (dinero real)
- `lib/date-utils.ts` — ya tiene JSDoc excelente, candidato ideal
- `actions/cash-shift-actions.ts` — lógica de caja y bonos
- `lib/cerebro-rag.ts` — RRF scoring y búsqueda híbrida

---

### Resumen: Qué cambiar en el próximo proyecto

| Problema actual | Solución concreta |
|----------------|-------------------|
| Archivos de 1000+ líneas | Máximo 300 líneas por archivo, dividir por responsabilidad |
| Sin service layer | `repositories/` para DB, `services/` para lógica |
| 18 setInterval manuales | SWR con `refreshInterval`, o un único `usePolling` hook |
| Prompts en TypeScript | Archivos `.md` separados cargados en runtime |
| Solo 1 custom hook | Extraer toda lógica repetida a hooks (`useRepairPolling`, etc.) |
| IDs mágicos de estado | Constantes tipadas en `src/lib/constants/` |
| Sin tests | Al menos tests unitarios para cálculos financieros y date-utils |

---

### Lo que el proyecto hace MUY BIEN (mantener en futuros proyectos)

- **`lib/date-utils.ts`** — JSDoc ejemplar, funciones puras, bien documentadas. Este es el estándar de calidad a replicar en todo el código.
- **`lib/cerebro-rag.ts`** — Separación clara de responsabilidades con secciones delimitadas por comentarios (`// ─────`). Excelente legibilidad.
- **`lib/db.ts`** — Singleton de Prisma con build-time safety explicado en comentarios. Conciso y robusto.
- **Pool de API keys con rotación** en `lib/groq.ts` — Patrón inteligente para manejar rate limits sin pagar.
- **Smart polling con checksums** en `repair-check-actions.ts` y `stock-check-actions.ts` — Evita re-renders innecesarios comparando hashes antes de actualizar estado.
- **Búsqueda híbrida RAG con RRF** — Implementación sofisticada y bien comentada que rivaliza con soluciones comerciales.

---

---

## Hallazgos adicionales — Sesión de lectura profunda (Abril 2026)

Esta sección agrega los bugs, vulnerabilidades y code smells encontrados al leer la segunda tanda de archivos: `auth-actions.ts`, `groq.ts`, `zpl-generator.ts`, `print-utils.ts`, `pos-client.tsx`, `products-client.tsx`, `business-hours.ts`, `customers.ts`, `cerebro-layout.tsx`, `knowledge-panel.tsx`, `sales-client.tsx`, y más.

---

### 🔴 VULNERABILIDAD DE SEGURIDAD 1 — Cookies de sesión sin `secure: true` en producción (auth-actions.ts:44-56)

```typescript
cookieStore.set("session_user_id", user.id, {
    httpOnly: true,
    secure: false, // process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SIX_HOURS,
});
cookieStore.set("session_role", user.role, {
    httpOnly: true,
    secure: false, // process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SIX_HOURS,
});
```

La línea correcta está **comentada**. Hay `secure: false` hardcodeado para ambas cookies de sesión. El flag `secure` garantiza que las cookies solo se transmitan sobre HTTPS. Sin él, si alguna vez se accede al CRM por HTTP (error de configuración, red interna, proxy mal configurado), las cookies de sesión viajan en texto plano y pueden ser robadas por un atacante en la misma red.

**Fix:** Descomentar `process.env.NODE_ENV === "production"` o simplemente poner `secure: true` siempre (Dokploy/Docker ya garantiza HTTPS).

---

### 🔴 VULNERABILIDAD DE SEGURIDAD 2 — Login loggea el email del usuario (auth-actions.ts:9)

```typescript
console.log("LOGIN ACTION STARTED", { email });
```

La función `login` tiene **8 console.log** incluyendo uno que imprime el email del usuario en cada intento de login. En producción, esto significa que cada login queda en los logs del servidor — incluyendo intentos fallidos con emails de terceros o clientes. Datos personales en logs de servidor violan principios básicos de privacidad.

La función también loggea el resultado del `bcrypt.compare` y si el usuario fue encontrado — información útil para un atacante con acceso a los logs.

---

### 🟠 BUG LATENTE 6 — `setState` durante render en `spare-parts-client.tsx` (líneas 196-198)

```typescript
// Dentro del cuerpo del componente, fuera de useEffect:
if (someCondition) {
    setCurrentPage(1);  // ← setState durante render → bucle infinito
}
```

Llamar `setState` directamente en el cuerpo del componente (no en un handler o useEffect) provoca que React re-renderice inmediatamente después de renderizar, creando un bucle de renders. En el mejor caso degrada el rendimiento, en el peor caso congela el browser. La condición puede que no siempre se active, lo que hace el bug intermitente y difícil de reproducir.

---

### 🟠 BUG LATENTE 7 — Fire-and-forget sin feedback en `cerebro-chat.tsx`

```typescript
// El guardado del mensaje en DB es fire-and-forget:
saveUserMessageAction(conversationId, text, ...).catch(console.error);
```

Si el guardado del mensaje falla (timeout de DB, error de red), el usuario ve la interfaz respondiendo normalmente pero el mensaje no queda persistido. Al recargar la página, el mensaje "desaparece". No hay indicador visual de error ni reintento automático.

Además, el polling de tokens tiene un `} catch { }` vacío — si el fetch de tokens falla, el contador de tokens queda congelado en el último valor y el usuario no sabe si el modelo ya agotó su quota o si hubo un error de red.

---

### 🟠 BUG LATENTE 8 — `formatDateAFIP` reimplementa la lógica de `date-utils.ts` (lib/actions/pos.ts)

```typescript
// En pos.ts — cálculo manual de UTC-3:
function formatDateAFIP(date: Date): string {
    const argDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    ...
}
```

Existe `src/lib/date-utils.ts` con funciones bien testeadas para manejar el timezone de Argentina. Esta función ignora esa utilería y reimplementa el offset manualmente. La misma duplicación aparece también en `business-hours.ts` (comentado: `// Removed date-fns-tz dependency due to environment issues`). Hay **3 implementaciones distintas** del mismo cálculo UTC-3 en el proyecto:

1. `date-utils.ts` — usa `date-fns-tz` (la correcta)
2. `pos.ts / formatDateAFIP` — `getTime() - 3 * 60 * 60 * 1000`
3. `business-hours.ts` — mismo cálculo manual en `toArgFaceValue()`

Si alguna vez Argentina cambia de horario o se agrega horario de verano, hay que actualizar 3 lugares distintos. Actualmente solo `date-utils.ts` lo haría bien.

---

### 🟠 BUG LATENTE 9 — Control de acceso por nombre hardcodeado de sucursal (stock.ts)

```typescript
if (unitToRemove.sparePart.branch.name !== "MACCELL 2") {
    throw new Error("Solo MACCELL 2 puede hacer esto");
}
```

La autorización usa el **nombre literal** de la sucursal como control de acceso. Si la sucursal "MACCELL 2" cambia de nombre (rebranding, normalización), o si se agrega "MACCELL 5" con los mismos privilegios, hay que buscar en todo el código todos los strings hardcodeados. El mismo patrón aparece en `products-client.tsx` en la función `getBranchColor`:

```typescript
if (name.includes("maccell 1")) return "bg-blue-100...";
if (name.includes("maccell 2")) return "bg-violet-100...";
if (name.includes("8 bit")) return "bg-pink-100...";
```

**Fix:** Usar `branchId` o un campo `code` de la sucursal (ya existe `Branch.code` en el schema de Prisma) para control de acceso y configuración visual.

---

### 🟠 BUG LATENTE 10 — `pos-client.tsx` usa `setTimeout` para secuenciar impresión (líneas 209-210)

```typescript
setTimeout(() => handlePrinting(result, totalToPay, soldItems), 150);
setTimeout(() => handleAutomaticAttachments(soldItems), 2500);
```

Después de una venta exitosa, el código espera 150ms antes de imprimir y 2500ms antes de adjuntar automaticamente. Estos timeouts son puramente de prueba y error — no hay garantía de que en un dispositivo más lento ambas acciones funcionen correctamente. Si el ticket de venta tarda más de 150ms en prepararse (imagen de logo no cargada), el print puede fallar silenciosamente. Si el servidor está bajo carga, 2500ms puede no ser suficiente.

---

### 🟡 CODE SMELL 9 — 129 `console.log` en código de producción (corrección del conteo anterior)

El conteo exacto al leer todos los archivos es **129 console.log** (no 108 como se indicó en el análisis anterior):

```
src/actions/     →  ~45 console.log
src/lib/         →  ~52 console.log
src/components/  →  ~20 console.log
src/app/api/     →  ~12 console.log
```

Destacados especialmente problemáticos:
- `auth-actions.ts`: 8 console.log en el flow de login, incluyendo emails de usuarios
- `products-client.tsx:184`: `console.log('ProductsClient Params:', {...})` en el render del componente (se ejecuta en CADA render)
- `lib/afip.ts`: loggea el CUIT del contribuyente en cada inicialización del cliente
- `lib/actions/pos.ts`: loggea nombre, rol y sucursal del vendedor en cada búsqueda de productos

---

### 🟡 CODE SMELL 10 — `business-hours.ts` no puede usar `date-fns-tz` por "environment issues"

```typescript
// Removed date-fns-tz dependency due to environment issues
// import { toZonedTime, fromZonedTime } from "date-fns-tz";
```

El archivo `business-hours.ts` tiene comentado el import de `date-fns-tz` con una nota ambigua de "environment issues". Esto probablemente fue un problema de compatibilidad con el entorno WASM/Node durante el deploy que se resolvió eliminando la dependencia en lugar de arreglarla correctamente. El resultado es una clase que implementa manualmente toda la lógica de timezone que `date-fns-tz` ya provee de forma más robusta. El horario comercial también está **hardcodeado** en el código (09:00-13:00, 17:00-21:00, cerrado domingos) — no hay forma de configurarlo desde admin sin tocar el código.

---

### 🟡 CODE SMELL 11 — `print-utils.ts` tiene un iframe de cleanup de 60 segundos

```typescript
// Fallback cleanup
setTimeout(() => {
    if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
    }
}, 60000); // ← 60 segundos
```

El iframe de impresión (con `opacity: 0.01`, prácticamente invisible) queda en el DOM durante hasta 60 segundos si el cleanup normal falla. En una sesión de uso intenso del POS donde se imprimen muchos tickets seguidos, pueden acumularse múltiples iframes zombies en el DOM. El mecanismo de lock `lastPrintTime` es una variable de módulo global — no se resetea entre navegaciones en una SPA, lo que puede bloquear impresiones legítimas si el sistema considera que fue "reciente".

---

### 🟡 CODE SMELL 12 — `customers.ts` lookea sin aislamiento de sucursal

```typescript
let customer = await db.customer.findFirst({
    where: {
        phone: data.phone,  // ← sin branchId
    }
});
```

Los clientes se buscan solo por teléfono, sin filtrar por sucursal. Esto significa que el cliente "Juan Pérez" registrado en MACCELL 1 con teléfono "2215551234" es el mismo registro que se usa en MACCELL 3 si llama. En principio esto puede ser deseable (cliente compartido entre sucursales), pero el modelo tiene un campo `branchId` que sugiere intención de aislamiento. No hay documentación de cuál fue la decisión de diseño.

---

### 🟡 CODE SMELL 13 — `cerebro-layout.tsx` y `cerebro-chat.tsx` usan un event bus DOM informal

```typescript
// En cerebro-layout.tsx:
window.addEventListener("cerebro-save-wiki", handleSaveWiki);

// En cerebro-chat.tsx:
window.dispatchEvent(new CustomEvent("cerebro-quick-prompt", { detail: { text } }));
window.addEventListener("cerebro-quick-prompt", handleQuickPrompt);
```

La comunicación entre componentes de Cerebro (chat → layout → knowledge panel) se hace a través de `CustomEvent` en `window`. Este es un patrón de event bus informal que no tiene typing, no aparece en el árbol de componentes de React, y es difícil de trazar. Si el componente se desmonta y remonta (cambio de conversación), hay que asegurar que el listener se limpie correctamente — cualquier error hace que los eventos se queden "huérfanos".

**Alternativa:** Pasar callbacks como props, usar un Context, o usar un estado compartido en el componente padre.

---

### 🟡 CODE SMELL 14 — `pos-client.tsx` tiene más de 25 useState (hyper-stateful)

El componente `pos-client.tsx` tiene **más de 25 variables de estado** declaradas al inicio:
```
cart, cashShift, isLoadingShift, isRegisterModalOpen, modalAction,
amountInput, shiftSummary, searchQuery, products, isSearching,
repairQuery, repairs, isSearchingRepairs, bestSellers,
isExpenseModalOpen, expenseAmount, expenseDescription, isSubmittingExpense,
isTransferModalOpen, transferTab, transferSearchQuery, transferProducts,
selectedTransferProduct, targetBranchId, transferQty, transferNotes,
branches, pendingTransfers, isSearchingTransfer, isCheckoutModalOpen,
isProcessingSale, editableTotal, paymentAmountInput, partialPayments,
isInvoiceModalOpen, invoiceData, showCashConfirm, isPriceOverrideModalOpen,
selectedCartItem, overridePrice, overrideReason, billCounts, employeeCount
```

Este es el patrón que más contribuye a los componentes de 500-1000 líneas. Cada modal, cada loading state, cada query tiene su propio `useState`. La alternativa sería usar `useReducer` con un estado unificado del POS o extraer cada modal a su propio componente con estado encapsulado.

---

### 🟡 CODE SMELL 15 — `groq.ts` itera hasta 50 keys pero limita el debugging

```typescript
for (let i = 2; i <= 50; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
```

El código busca hasta `GROQ_API_KEY_50`. Si se configura `GROQ_API_KEY_30` pero se olvida alguna intermedia, esa key nunca se usa pero tampoco hay advertencia. El loop es O(50) en var lookups en cada invocación de `runWithGroqFallback` — insignificante, pero podría ser un array declarado en config.

Dicho esto: el patrón `runWithGroqFallback` es el **mejor código de utilería del proyecto**. Limpio, tipado, y con logging que preserva privacidad (solo los últimos 4 caracteres de la key).

---

### 🟡 CODE SMELL 16 — `zpl-generator.ts` tiene comentarios no-ZPL dentro de strings ZPL

```typescript
let zpl = `
^XA
^CI28
^CW1,E:MACCELL.TTF

### CONFIGURACION DE PAGINA ###
^PW440
^LL352
```

Las líneas `### CONFIGURACION DE PAGINA ###`, `### CODIGO DE BARRAS ###`, etc. son comentarios del desarrollador embebidos directamente en el string ZPL. El lenguaje ZPL no tiene una sintaxis `###` para comentarios — la impresora Zebra probablemente ignora comandos no reconocidos, pero es un comportamiento no documentado que depende del firmware de la impresora. Si una versión de firmware más estricta aparece, estos "comentarios" podrían generar errores o artefactos en las etiquetas.

---

### 🟡 CODE SMELL 17 — `any[]` aparece 78 veces como tipo en el proyecto

```typescript
// Ejemplos representativos:
const [bestSellers, setBestSellers] = useState<any[]>([]);
const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
const [branches, setBranches] = useState<any[]>([]);
getPaymentBadge = (method: string, payments: any[], total: number)
```

78 usos de `any[]` significa que TypeScript no puede ayudar cuando se accede a propiedades de estos arrays. Cambios en los tipos de respuesta del servidor no generan errores en compilación — solo en runtime. Muchos de estos podrían tipados con los tipos que Prisma ya genera.

---

### 📋 Mapa completo de status IDs de reparación

Dado que los IDs mágicos son un problema recurrente, acá está el mapa completo derivado de leer todos los archivos:

```typescript
// IDs de estado de reparación (RepairStatus en Prisma)
// Reconstruido desde technician-actions.ts, dashboard-actions.ts, statistics-actions.ts
const REPAIR_STATUS_IDS = {
  PENDING:    1,  // Ingresada, esperando técnico
  CLAIMED:    2,  // Tomada por técnico (takeRepairAction)
  IN_PROGRESS: 3, // En proceso activo
  PAUSED:     4,  // Pausada / tiempo asignado
  OK:         5,  // Reparación exitosa
  DELIVERED:  6,  // Entregada al cliente
  NO_REPAIR:  7,  // No tiene reparación / sin solución
  // 8, 9: Estados finales adicionales (no completamente documentados)
  INVOICED:   10, // Entregada con factura
} as const;

// ATENCIÓN: El cron de enriquecimiento usa { in: [4, 5] } creyendo que son
// "Listo" y "Entregado", pero 4 = PAUSED (ver BUG LATENTE 1).
```

---

### 🗃️ Modelos y campos huérfanos en `prisma/schema.prisma`

Campos y modelos que aparecen en el schema pero no se usan activamente en el código fuente:

| Campo / Modelo | Tabla | Estado |
|----------------|-------|--------|
| `diagnosticJson Json?` | `Repair` | No hay queries que lean/escriban este campo |
| `dataQualityScore Int` | `User` | Feature de scoring de AI parcialmente implementada |
| `avgDataQuality Float` | `User` | Ídem — sin queries activas |
| `DeviceFamily` | model propio | `checklistJson` — feature de checklist de diagnóstico iniciada pero sin UI completa |
| `Ticket` | model separado | Parece ser un modelo legacy/duplicate de `Repair` — mismo concepto, diferente nombre |
| `backups` | tabla | Usa minúsculas en `@@map("backups")` — inconsistente con el resto que usan PascalCase en el `@@map` |

Estos campos ocupan espacio en el schema y confunden a cualquier agente o desarrollador nuevo que los encuentre y trate de entender su propósito. Recomendado: o eliminarlos o documentarlos con un comentario en el schema.

---

### 📊 Estadísticas finales del codebase (conteo real)

| Métrica | Valor |
|---------|-------|
| Archivos de código fuente | 332 |
| Líneas de código aprox. | ~53.000 |
| `console.log` en producción | 129 |
| `@ts-ignore` | 11 |
| `any[]` como tipo | 78 |
| `setInterval` activos | 16 |
| `setTimeout` activos | 38 |
| Custom hooks | 1 (`use-debounce`) |
| Archivos de test | 0 |
| API routes sin auth check | 14 de 15 |
| Archivos >500 líneas | 12 |
| Archivos >1000 líneas | 4 |

---

### ✅ Más código bueno encontrado en esta sesión

| Archivo | Por qué destacar |
|---------|-----------------|
| `lib/groq.ts` | `runWithGroqFallback` es el patrón de utilería más limpio del proyecto. Tipado perfecto, logging de privacidad consciente (últimos 4 chars de key), manejo de errores correcto. |
| `lib/services/customers.ts` | `CustomerService.findOrCreate` con lista de teléfonos dummy y sufijo `Date.now()` para garantizar unicidad es una solución práctica y elegante. |
| `app/vendor/pos/pos-client.tsx` | `processingRef = useRef(false)` para prevenir doble-submit en ventas es el patrón correcto — más confiable que `useState` porque no trigerea re-renders. |
| `lib/print-utils.ts` | Lock de impresión via `lastPrintTime` modular es pragmático y resuelve el problema real de dialogs de impresión superpuestos. |

---

---

## Hallazgos finales — Tercera sesión de lectura (Abril 2026)

Esta sección cubre los últimos archivos analizados en profundidad: `lib/actions/repairs.ts` (1024 líneas), `lib/actions/stock-actions.ts`, `lib/actions/compliance-actions.ts`, `actions/spare-parts.ts`, `components/admin/cash-shift-details-modal.tsx`, y los patrones globales restantes.

---

### 🟠 BUG LATENTE 11 — Notificaciones a técnicos enviadas en serie (repairs.ts:303)

```typescript
// En createRepairAction — al crear una reparación:
for (const tech of technicians) {
    await createNotificationAction({ userId: tech.id, ... });
}
```

Las notificaciones a los técnicos se envían **una por una** en un `for` secuencial, no en paralelo. Si hay 5 técnicos, se hacen 5 inserts a DB en serie. Si hubiera 10 técnicos, son 10 awaits encadenados. La función `resolveStockDiscrepancy` en `stock-actions.ts` correctamente usa `Promise.all(admins.map(...))` — ese patrón debería usarse aquí también.

```typescript
// ✅ Correcto (como en stock-actions.ts):
await Promise.all(admins.map(admin => createNotificationAction({ ... })));

// ❌ Actual (en repairs.ts):
for (const tech of technicians) {
    await createNotificationAction({ ... }); // Secuencial
}
```

---

### 🟠 BUG LATENTE 12 — `isFinalConsumer` hardcodeado como `false` sin lógica (repairs.ts:198)

```typescript
const customer = await customerService.findOrCreate({
    name: formData.get("customerName") as string,
    ...
    isFinalConsumer: false // Logic?
});
```

El campo `isFinalConsumer` en la creación de clientes siempre es `false`. El comentario `// Logic?` indica que el desarrollador nunca implementó la lógica para determinar cuándo un cliente es consumidor final (relevante para la facturación AFIP donde los consumidores finales reciben Factura B y los responsables inscriptos reciben Factura A). Esta lógica incompleta podría afectar la categorización fiscal de clientes.

---

### 🟠 BUG LATENTE 13 — Fallback con `$queryRaw` por "stale client" en spare-parts.ts

```typescript
// En getSpareParts y searchSparePartsAction:
if (spareParts.length > 0 && (spareParts[0] as any).pricePos === undefined) {
    console.warn("Detected stale client in getSpareParts (missing pricePos). Fetching manually.");
    try {
        const rawPrices = await prisma.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
        // ... merge manually
    }
}
```

Este bloque existe porque en algún momento el campo `pricePos` fue agregado al schema de Prisma **sin correr `prisma generate`** en el servidor, dejando el cliente de Prisma desincronizado con el schema real. La solución fue detectar el campo faltante en runtime y hacer un query SQL crudo como fallback.

El mismo bloque aparece en **dos lugares** distintos (`getSpareParts` y `searchSparePartsAction`), duplicando la workaround. El problema de raíz (no correr `prisma generate` en el deploy) debería haberse resuelto en el Dockerfile, no en el código de aplicación. Esta workaround debería eliminarse una vez que el deploy siempre corre `prisma generate`.

---

### 🟡 CODE SMELL 18 — `JSON.parse(JSON.stringify(...))` como workaround de serialización

```typescript
// repairs.ts:376 — getActiveRepairsAction:
return JSON.parse(JSON.stringify(repairs));

// dashboard-actions.ts:1160 — getTechniciansWorkload:
return JSON.parse(JSON.stringify(workloads));
```

Este patrón convierte objetos Prisma (con tipos `Decimal`, `Date`, `BigInt`) a objetos planos para evitar errores de serialización al pasar datos de Server Actions a componentes cliente en Next.js. Es una solución funcional pero tiene dos problemas:

1. **Pierde tipos**: Todas las fechas se convierten a `string`, todos los Decimals a `number`. El componente cliente recibe un tipo diferente al que TypeScript espera.
2. **Costo de CPU**: Para 50 reparaciones con historial completo e imágenes, este stringify+parse puede procesar varios megabytes de JSON.

**Alternativa:** Usar el helper `superjson` (ya popular en el ecosistema Next.js/tRPC) o hacer `select` más acotados en Prisma para no devolver campos de tipo complejo que no se necesitan.

---

### 🟡 CODE SMELL 19 — 11 `@ts-ignore` distribuidos y sus causas reales

Mapa completo de los 11 `@ts-ignore` encontrados, con la causa de cada uno:

| Archivo | Causa real |
|---------|-----------|
| `spare-parts-client.tsx:164` | jsbarcode importado dinámicamente — tipos no disponibles en módulo |
| `spare-parts-client.tsx:410` | jsPDF con plugin de autoTable — tipos de plugin incompletos |
| `sales-client.tsx:156,159` | Type mismatch en `paymentMethod` enum — tipos desincronizados entre archivos |
| `invoices/page.tsx:52` | Arca SDK con tipos incompletos |
| `compliance-actions.ts:51,53` | Campo `lastCheckedAt` en `ProductStock` — `prisma generate` probablemente no fue corrido |
| `stock-actions.ts:108,279,310` | Mismo campo `lastCheckedAt` — misma causa: client de Prisma desincronizado |
| `admin-invoice.ts:159` | Arca SDK — campo `cbteNro` existe en runtime pero no en la definición de tipos del SDK |

**Patrón sistemático**: 6 de los 11 `@ts-ignore` son por `lastCheckedAt` — un campo que fue agregado al schema de Prisma pero el cliente de Prisma no fue regenerado en el ambiente de producción. Esto confirma el mismo problema de raíz del CODE SMELL 18: el flujo de deploy no garantiza que `prisma generate` corre siempre. El fix correcto es en el Dockerfile, no en el código.

---

### 🟡 CODE SMELL 20 — `compliance-actions.ts` filtra en memoria para buscar discrepancias

```typescript
// En reportStockDiscrepancy — para detectar duplicados:
const pendingDiscrepancies = await db.notification.findMany({
    where: { status: 'PENDING', type: 'ACTION_REQUEST' }
    // ← NO filtra por stockId en la query
});

const existingPending = pendingDiscrepancies.find(n => {
    const data = n.actionData as any;
    return data?.type === 'STOCK_DISCREPANCY' && data?.stockId === stockId;
});
```

La query trae **todas** las notificaciones ACTION_REQUEST pendientes y filtra en memoria para encontrar la del `stockId` específico. Si hay muchos admins y muchas discrepancias pendientes, esta query puede devolver cientos de notificaciones para luego descartar la mayoría en JS.

La causa es que `actionData` es un campo `Json` en Postgres — Prisma no permite filtrar dentro de un campo JSON directamente en la cláusula `where`. La solución sería un campo de índice separado (ej: `referenceId`) o usar `db.$queryRaw` con una condición `->>'stockId'` de Postgres. Esta misma limitación se repite en `resolveStockDiscrepancy`.

---

### 🟡 CODE SMELL 21 — `searchSparePartsAction` tiene 6 console.log en producción

```typescript
console.log("=== SPARE PART SEARCH ===");
console.log("Original term:", JSON.stringify(term), `(length: ${term?.length || 0})`);
console.log("Cleaned term:", JSON.stringify(cleanTerm), `(length: ${cleanTerm?.length || 0})`);
console.log("Had whitespace:", term !== cleanTerm);
// ...
console.log("DB Query Starting...");
console.log("DB Query Result:", parts.length, "parts found");
```

Cada búsqueda de repuesto en el formulario de creación de reparaciones genera 6 líneas de log en el servidor. En un taller con 3 técnicos creando reparaciones simultáneamente y búsqueda con debounce (500ms), esto genera decenas de logs por minuto. Este logging fue agregado para depurar un bug de búsqueda con whitespace y nunca fue removido.

---

### ✅ Código bien diseñado encontrado en esta sesión

| Archivo | Por qué destacar |
|---------|-----------------|
| `lib/actions/stock-actions.ts` → `resolveStockDiscrepancy` | Usa transacción con optimistic locking: verifica si la discrepancia ya fue procesada por otro admin dentro de la misma transacción. Es la implementación de concurrencia más sofisticada del proyecto. |
| `lib/actions/compliance-actions.ts` → `checkStockControlCompliance` | Lógica de compliance bien encapsulada: identifica top 30 productos, verifica stock sin controlar hace >30 días, y tiene anti-spam de notificaciones (1 hora de cooldown). |
| `lib/actions/repairs.ts` → `getRepairHistoryAction` | Búsqueda multi-palabra inteligente: divide la query por espacios y construye `AND` con `OR` por cada palabra, permitiendo buscar "iPhone 13" como dos términos independientes. |
| `components/admin/cash-shift-details-modal.tsx` | Componente puramente presentacional (sin estado, sin efectos) — recibe datos tipados y renderiza. Es el patrón correcto para modales de detalle. |

---

### 📋 Inventario completo de @ts-ignore, any[] y workarounds — Para el próximo proyecto

Al iniciar un proyecto nuevo, evitar los patrones que generaron estos workarounds:

1. **`prisma generate` en deploy**: Agregar al Dockerfile antes del build para evitar los 6 `@ts-ignore` de `lastCheckedAt` y los fallbacks de `$queryRaw`.

2. **SDK de terceros sin tipos completos** (Arca/AFIP): Crear un archivo `src/types/arca.d.ts` con las interfaces faltantes en lugar de usar `@ts-ignore` por archivo.

3. **Serialización de Server Actions**: Definir tipos `SerializedRepair`, `SerializedSale`, etc. con fechas como `string` para que el cliente y el servidor tengan contratos claros, en lugar de `JSON.parse(JSON.stringify(...))`.

4. **Campos Json en DB para datos estructurados**: Si un campo `Json` necesita ser filtrado en queries, crear columnas dedicadas para los campos que se buscan (ej: `discrepancyId`, `stockId` como columnas propias en `Notification`).

---

### 🗂️ Árbol de archivos críticos — Referencia rápida para agentes

```
src/
├── app/
│   ├── api/
│   │   ├── cerebro/chat/route.ts       ← 716 líneas, prompts + lógica AI
│   │   ├── cron/enrich-diagnoses/      ← BUG: status IDs equivocados
│   │   └── backups/[filename]/         ← Sin auth check
│   ├── admin/
│   │   ├── layout.tsx                  ← Polling 10s + doble getUserData()
│   │   └── dashboard/                  ← dashboard-actions.ts (1166 líneas)
│   └── vendor/
│       ├── pos/pos-client.tsx          ← 25+ useState, setTimeout para print
│       └── sales/sales-client.tsx      ← 2× @ts-ignore en fetchSales
├── actions/
│   ├── auth-actions.ts                 ← secure: false + 8 console.log
│   ├── cash-shift-actions.ts           ← N+1 en enrichShifts, catch vacío
│   ├── dashboard-actions.ts            ← Magic IDs, dead code, 1166 líneas
│   ├── products.ts                     ← Sort en memoria O(N)
│   ├── spare-parts.ts                  ← $queryRaw fallback duplicado
│   ├── statistics-actions.ts           ← Debate de 14 líneas en comentario
│   ├── stock.ts                        ← Hardcoded "MACCELL 2"
│   └── repairs/technician-actions.ts   ← assignedUserId removido inconsistente
├── lib/
│   ├── afip.ts                         ← 🚨 NUCLEAR TLS global downgrade
│   ├── cerebro-rag.ts                  ← ✅ Mejor código del proyecto
│   ├── date-utils.ts                   ← ✅ Referencia de calidad
│   ├── db.ts                           ← ✅ Singleton correcto con globalThis
│   ├── groq.ts                         ← ✅ runWithGroqFallback limpio
│   ├── local-embeddings.ts             ← Singleton sin globalThis (dev perf)
│   ├── print-utils.ts                  ← iframe 60s cleanup, lock global
│   ├── actions/
│   │   ├── repairs.ts                  ← 1024 líneas, notificaciones en serie
│   │   ├── stock-actions.ts            ← @ts-ignore lastCheckedAt (×3)
│   │   ├── compliance-actions.ts       ← filtrado JSON en memoria
│   │   └── pos.ts                      ← formatDateAFIP duplica date-utils
│   └── services/
│       ├── business-hours.ts           ← UTC-3 manual, horarios hardcodeados
│       └── customers.ts               ← findOrCreate sin branchId isolation
├── components/
│   ├── admin/
│   │   ├── spare-parts/spare-parts-client.tsx ← 1169 líneas, setState en render
│   │   ├── products/products-client.tsx        ← console.log en render
│   │   └── cash-shift-details-modal.tsx        ← ✅ Componente presentacional puro
│   └── cerebro/
│       ├── cerebro-chat.tsx            ← Fire-and-forget, CustomEvent bus
│       ├── cerebro-layout.tsx          ← CustomEvent bus, good drawer pattern
│       └── knowledge-panel.tsx         ← No error UI en fallos de save
├── config/
│   └── ai-models.ts                   ← ✅ Prompts en constantes nombradas
├── middleware.ts                       ← 🚨 /api sin auth, secure: false
└── utils/
    └── zpl-generator.ts               ← Comentarios ### no-ZPL en string ZPL
```

---

*Actualizado con análisis de código fuente real — 332 archivos, 53.000 líneas — Abril 2026*
*Sesiones completadas: commits (427), comments/patterns, bugs profundos, security, arquitectura, archivos finales*

---

## Hallazgos adicionales — Cuarta sesión (Abril 2026)

Análisis cruzado entre el código actual y lo documentado hasta ahora. Esta sección documenta los problemas encontrados que NO estaban en ninguna sesión anterior.

---

### 🔴 CRÍTICO — `next.config.ts` ignora errores TypeScript y ESLint en build

```typescript
// next.config.ts
typescript: {
    ignoreBuildErrors: true,   // ❌ Código con errores de tipo llega a producción
},
eslint: {
    ignoreDuringBuilds: true,  // ❌ El linter no frena el build aunque haya errores
},
```

Esto invalida parcialmente la regla de "tipado estricto siempre" del proyecto. El linter que bloquea `console.log` no sirve si los errores se ignoran en el build. Esta configuración fue probablemente un workaround temporal para poder deployar mientras había errores de tipos pendientes (los mismos `@ts-ignore` de `lastCheckedAt`). El fix real es:
1. Correr `prisma generate` correctamente en el Dockerfile
2. Eliminar los `@ts-ignore` de `lastCheckedAt`
3. Revertir `ignoreBuildErrors: false` e `ignoreDuringBuilds: false`

---

### 🔴 CRÍTICO — Variables de entorno sin `.env.example` ni documentación

El proyecto usa las siguientes variables de entorno que no están documentadas en ningún archivo:

```
# Base de datos
DATABASE_URL

# AFIP (facturación electrónica)
AFIP_CERT          ← certificado en base64 o path
AFIP_KEY           ← clave privada
AFIP_CUIT          ← CUIT del emisor
AFIP_PRODUCTION    ← "true" para producción, homologación por defecto

# AI
GROQ_API_KEY_1     ← hasta GROQ_API_KEY_N (pool de keys con rotación)
OPENROUTER_API_KEY ← fallback si Groq falla

# Seguridad
CRON_SECRET        ← valida requests a /api/cron/* para evitar ejecución no autorizada

# NextAuth / sesión
NEXTAUTH_SECRET    ← firma de cookies de sesión
NEXTAUTH_URL       ← URL base del app
```

No existe `.env.example`. Cualquier desarrollador nuevo (o agente) que clone el repo no sabe qué variables necesita configurar. Crear `.env.example` con todas las variables y descripción es una tarea pendiente urgente.

---

### 🟠 BUG LATENTE 14 — Race condition en stock transfers sin transacciones

`ProductStock.quantity` se actualiza con `update` directo, sin transacción de Prisma. Si dos transferencias del mismo producto se aprueban en paralelo (dos admins aprobando al mismo tiempo), ambas leen el mismo `quantity` inicial y ambas restan — el stock final puede ser incorrecto.

```typescript
// ❌ Actual — unsafe concurrent update:
await prisma.productStock.update({
    where: { id: stockId },
    data: { quantity: { decrement: qty } }
});

// ✅ Fix — usar transacción con verificación optimista:
await prisma.$transaction(async (tx) => {
    const stock = await tx.productStock.findUnique({ where: { id: stockId } });
    if (stock.quantity < qty) throw new Error("Stock insuficiente");
    await tx.productStock.update({
        where: { id: stockId },
        data: { quantity: { decrement: qty } }
    });
});
```

La función `resolveStockDiscrepancy` en `stock-actions.ts` YA implementa este patrón correctamente con `prisma.$transaction`. Usar ese mismo patrón para todas las actualizaciones de stock.

---

### 🟠 BUG LATENTE 15 — `isFinalConsumer` siempre `false` en creación de clientes (repairs.ts:198)

```typescript
const customer = await customerService.findOrCreate({
    name: formData.get("customerName") as string,
    isFinalConsumer: false // Logic?
});
```

El campo `isFinalConsumer` determina si el cliente recibe Factura A (responsable inscripto) o Factura B (consumidor final) en AFIP. Siempre está en `false`, lo que puede generar facturas con tipo incorrecto para consumidores finales.

---

### 🟠 CODE SMELL — Fire-and-forget inconsistente en 14+ lugares

Hay dos patrones contradictorios para operaciones background:

```typescript
// ✅ Correcto — loggea el error:
trackTokens(usage.totalTokens).catch(err =>
    console.error("[CEREBRO] Background track error:", err)
);

// ❌ Incorrecto — silencio total:
indexWikiInRAG(newKnowledge).catch(() => { });
saveUserMessageAction(...).catch(console.error); // solo en algunos lados
```

**Convención a seguir para todas las operaciones fire-and-forget:**
```typescript
// Si el fallo es no-crítico: loggear con warn
promise.catch(err => console.warn("[MODULO] Background task failed:", err.message));

// Si el fallo debería alertar: loggear con error
promise.catch(err => console.error("[MODULO] CRITICAL background failure:", err));

// NUNCA: .catch(() => { }) — los errores silenciosos son imposibles de debuggear
```

---

### 🟠 CODE SMELL — `TIMEZONE` hardcodeado en 5+ archivos

La constante `"America/Argentina/Buenos_Aires"` aparece repetida en:
- `cash-shift-actions.ts`
- `repairs.ts`
- `business-hours.ts`
- `statistics-actions.ts`
- otros

`date-utils.ts` ya exporta funciones que usan este timezone internamente. La solución es exportar la constante desde `date-utils.ts` e importarla en los demás archivos:

```typescript
// lib/date-utils.ts
export const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";
```

Si Argentina alguna vez cambia su timezone (o se agrega DST), hay que editar un solo lugar.

---

### 🟠 CODE SMELL — RAG retry threshold hardcodeado (`cerebro-rag.ts`)

```typescript
const retryThreshold = 0.42;  // ← número mágico
```

El threshold que controla cuándo el RAG hace un segundo intento de búsqueda está hardcodeado. Junto con el threshold principal (0.3), estos dos números determinan la calidad de respuestas de Cerebro. Cambiarlos requiere tocar código y redeploy.

Mover a constante con comentario explicativo:
```typescript
// Threshold para retry de búsqueda semántica.
// Si el score máximo encontrado supera este valor, se considera suficientemente relevante.
// Valor más alto = más exigente = menos resultados pero más precisos.
const RAG_RETRY_THRESHOLD = 0.42;
const RAG_MIN_SIMILARITY = 0.3;
```

---

### 🟡 CODE SMELL — `findUniqueOrThrow` recomendado pero con 0 usos en el código

AGENT.md recomienda usar `findUniqueOrThrow` en lugar de `findUnique` + chequeo manual, pero en todo el codebase hay **0 usos** de `findUniqueOrThrow`. Todos los casos usan el patrón manual:

```typescript
// ❌ Patrón actual (en decenas de lugares):
const shift = await prisma.cashShift.findUnique({ where: { id } });
if (!shift) return null;

// ✅ Patrón recomendado (cuando el registro debe existir):
const shift = await prisma.cashShift.findUniqueOrThrow({ where: { id } });
// Si no existe, lanza PrismaClientKnownRequestError — no null silencioso
```

Esta discrepancia entre lo que dice AGENT.md y lo que hace el código real es una inconsistencia documentada.

---

### 🟡 CODE SMELL — Sin índices en campos de búsqueda de reparaciones

Los campos más buscados en el módulo de reparaciones no tienen índices en el schema de Prisma:

```prisma
model Repair {
  diagnosis         String?   // ← búsquedas full-text sin índice
  diagnosisEnriched String?   // ← ídem
  problemDescription String?  // ← ídem
  imei              String?   // ← búsquedas exactas frecuentes
}
```

Las búsquedas de reparaciones (`searchWarrantyRepairs`, `getRepairHistoryAction`) hacen `contains` sobre estos campos sin índice — full table scan en cada búsqueda. Con cientos de reparaciones en producción, esto se vuelve lento. Agregar índices o usar full-text search de PostgreSQL.

---

### 🟡 CODE SMELL — `JSON.parse(JSON.stringify(...))` para serialización de Server Actions

```typescript
// repairs.ts:376
return JSON.parse(JSON.stringify(repairs));

// dashboard-actions.ts:1160
return JSON.parse(JSON.stringify(workloads));
```

Este patrón convierte objetos Prisma (con `Decimal`, `Date`, `BigInt`) a objetos planos para evitar errores de serialización en Server Actions de Next.js. Es funcional pero:
1. Pierde tipos: fechas se convierten a `string`, Decimals a `number`
2. Costo de CPU innecesario para payloads grandes

**Alternativa correcta:** Usar `select` acotados en Prisma que solo devuelvan campos primitivos, o definir tipos `Serialized*` explícitos para los contratos cliente-servidor.

---

### 🟡 CODE SMELL — 11 `@ts-ignore` — 6 tienen la misma causa raíz

Mapa de los 11 `@ts-ignore`:

| Archivo | Causa |
|---------|-------|
| `spare-parts-client.tsx:164` | jsbarcode con dynamic import — tipos no disponibles |
| `spare-parts-client.tsx:410` | jsPDF + autoTable — tipos de plugin incompletos |
| `sales-client.tsx:156,159` | `paymentMethod` enum desincronizado |
| `invoices/page.tsx:52` | Arca SDK con tipos incompletos |
| `compliance-actions.ts:51,53` | Campo `lastCheckedAt` — `prisma generate` no corrido |
| `stock-actions.ts:108,279,310` | Ídem `lastCheckedAt` |
| `admin-invoice.ts:159` | Arca SDK — campo `cbteNro` existe en runtime, no en tipos |

**6 de los 11 se solucionan corriendo `prisma generate` correctamente en el deploy.** El resto necesitan archivos de declaración de tipos (`src/types/arca.d.ts`, etc.).

---

### ✅ Patrones buenos no documentados anteriormente

| Patrón | Dónde | Por qué es bueno |
|--------|-------|-----------------|
| `processingRef = useRef(false)` para prevenir doble-submit | `pos-client.tsx` | Más confiable que `useState` — no trigerea re-renders |
| `resolveStockDiscrepancy` con `$transaction` + optimistic lock | `stock-actions.ts` | La implementación de concurrencia más robusta del proyecto |
| `getRepairHistoryAction` búsqueda multi-palabra con AND+OR | `lib/actions/repairs.ts` | Busca "iPhone 13" como dos términos independientes |
| `trackTokens()` fire-and-forget con logging correcto | `cerebro-chat route` | Modelo a seguir para operaciones background |
| Boost de marca 2.5x en RRF scoring de RAG | `cerebro-rag.ts` | Garantiza aislamiento de contexto por marca en AI |
| Sliding session (6h) en middleware | `middleware.ts` | Sesiones se extienden automáticamente en uso activo |

---

*Cuarta sesión completada — Abril 2026*
