# CLAUDE.md — Guía de trabajo para Claude en MACCELL CRM

> Referencia completa derivada del análisis de 332 archivos, 53.000 líneas y 427 commits.
> Para el historial completo de bugs y análisis sesión por sesión, leer `AGENT.md` en la raíz.

---

## Stack tecnológico

- **Framework:** Next.js 15 (App Router), React 19 — usar `--legacy-peer-deps`
- **Base de datos:** PostgreSQL vía Prisma ORM
- **UI:** Tailwind CSS, shadcn/ui, Recharts
- **AI/ML:** Groq API (principal), OpenRouter (fallback), Vercel AI SDK, embeddings Xenova (384 dims), RAG pgvector
- **Infra:** Docker + Dokploy, build `output: 'standalone'`. Base image: `node:20-slim` (NO alpine)
- **Integraciones:** AFIP/Arca (facturación electrónica), ENACOM (IMEI), Zebra (impresoras térmicas)

---

## Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| `cerebro` | Asistente IA con RAG, wiki, schemáticos, diagnóstico técnico (módulo más activo) |
| `admin` | Dashboard ejecutivo, KPIs, gastos, caja, facturas, backups |
| `pos` | Punto de venta, facturación AFIP, caja |
| `repairs` | Gestión de reparaciones, técnicos, estados, historial |
| `stock` | Inventario, repuestos, control por sucursal |
| `vendor` | Portal del vendedor, métricas, stock |
| `technician` | Portal del técnico, trabajo activo, dashboard |
| `analytics/statistics` | Reportes, gráficos, métricas operativas |
| `public` | Página de seguimiento de reparación con QR |

---

## Variables de entorno requeridas

```bash
# Base de datos
DATABASE_URL

# AFIP / Arca (facturación electrónica argentina)
AFIP_CERT          # certificado en base64 o path al archivo
AFIP_KEY           # clave privada
AFIP_CUIT          # CUIT del emisor
AFIP_PRODUCTION    # "true" para producción, homologación si no está

# AI
GROQ_API_KEY_1     # hasta GROQ_API_KEY_N (pool con rotación automática)
OPENROUTER_API_KEY # fallback si todo Groq falla

# Seguridad
CRON_SECRET        # valida requests entrantes a /api/cron/*
NEXTAUTH_SECRET    # firma de cookies de sesión
NEXTAUTH_URL       # URL base del app
```

---

## 🚨 Reglas de Oro INQUEBRANTABLES

### 1. CERO `console.log` en backend

```
src/actions/**   → PROHIBIDO (ESLint configurado como error)
src/lib/**       → PROHIBIDO
src/app/api/**   → SOLO console.error para errores reales catchados
```

Debug temporal: `console.warn("[DEBUG] ...")` — buscable, marcado para eliminar.
El proyecto tiene 129 `console.log` en producción — no agregar más, eliminar al tocar esos archivos.

### 2. Todo fix de emergencia tiene `TECH_DEBT` inmediato

```typescript
// TECH_DEBT(2026-04): descripción del monkey-patch
// Impacto: qué afecta
// Fix real: cómo resolverlo bien
```

### 3. Archivos > 300 líneas: dividir antes de agregar código

No agregar código a archivos que superen 300 líneas. Dividir primero por responsabilidad.
```
dashboard-actions.ts (1166 líneas) → kpis.ts, repairs.ts, cash.ts, index.ts
```

### 4. Tests Vitest obligatorios para código crítico

Requieren test en `src/__tests__/`:
- Funciones de **dinero** (caja, facturas, bonos)
- Funciones de **fechas/timezone**
- Funciones de **estados de reparación**
- Funciones de **fallback crítico** (AI, DB, impresoras)

```bash
npm test          # ANTES y DESPUÉS de tocar código crítico
npm run test:watch
```

### 5. Aislamiento de marcas en Cerebro AI

- Nunca mezclar contexto de distintas marcas en el RAG
- Prohibido mencionar precios en respuestas de IA
- Guards iOS/Android antes de mencionar ICs específicos

---

## Reglas de código por tecnología

### TypeScript
- Tipado estricto. No usar `any` sin comentario explicativo. Hay 120 usos de `as any` y 78 de `any[]` — no agregar más.
- Usar `findUniqueOrThrow` cuando el registro debe existir (actualmente 0 usos en el código — aplicar en código nuevo).
- No hooks condicionales en React.
- Componentes con +15 `useState`: usar `useReducer`.

### Next.js / Build
- `next.config.ts` tiene `ignoreBuildErrors: true` e `ignoreDuringBuilds: true` como workaround temporal — **no extender este patrón**. El objetivo es revertirlo.
- Usar `export const dynamic = 'force-dynamic'` en páginas y rutas que consultan la DB.
- `bodySizeLimit: '50mb'` configurado para uploads de schemáticos e imágenes.

### API Routes — Auth obligatoria
- **Verificar sesión en CADA route handler** — actualmente 14 de 15 rutas no verifican:
```typescript
const user = await getCurrentUser();
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
```
- Todas las rutas deben tener `try/catch` con errores descriptivos.

### Prisma
- `prisma generate` corre en **build time**, `prisma db push`/`migrate deploy` en **runtime**.
- Para stock concurrente: usar `prisma.$transaction` con verificación optimista (ver `resolveStockDiscrepancy` en `stock-actions.ts` como modelo).
- No usar `(prisma as any).modelo` — si existe en schema, el tipo está disponible tras generate.
- `JSON.parse(JSON.stringify(result))` es el workaround actual para serializar Server Actions — para código nuevo, usar `select` acotados con solo campos primitivos.

### Fechas / Timezone
- **Argentina (UTC-3)** siempre. Usar `lib/date-utils.ts` — nunca reimplementar el offset.
- La constante `"America/Argentina/Buenos_Aires"` está duplicada en 5+ archivos. En código nuevo importar desde `date-utils.ts`.

### Recharts
- Envolver en estado `isReady` con delay antes de renderizar para evitar errores SSR.
- `minWidth` y `minHeight` en contenedores de charts.

### Polling / setInterval
- 18 `setInterval` manuales en el proyecto — no agregar más.
- Usar SWR con `refreshInterval` o un hook `usePolling` reutilizable.
- No usar `setTimeout` para secuenciar operaciones — usar `await` o `Promise.all`.

### Fire-and-forget (operaciones background)
```typescript
// ✅ Correcto — loggear siempre:
promise.catch(err => console.warn("[MODULO] Background task failed:", err.message));

// ❌ Incorrecto — nunca silencio total:
promise.catch(() => { });
```

### Seguridad — Cookies de sesión
```typescript
// auth-actions.ts — CORREGIR al tocar este archivo:
secure: false  // ← cambiar a: secure: process.env.NODE_ENV === "production"
```

---

## Módulo Cerebro — Reglas especiales

### Modelo AI
- **Principal:** Groq free tier con pool de API keys (`GROQ_API_KEY_1`..`GROQ_API_KEY_N`) — rotación automática via `runWithGroqFallback` en `lib/groq.ts`.
- **Fallback:** OpenRouter → modelo secundario.
- **NO** usar `maxRetries` con Groq free tier — causa cuelgues por rate limit 429.

### RAG
- Embeddings Xenova (384 dims) en PostgreSQL con pgvector o arrays `float8` como fallback.
- Búsqueda híbrida: semántica + keyword con RRF (Reciprocal Rank Fusion).
- Threshold mínimo de similaridad: `0.3`. Retry threshold: `0.42`.
- Boost de marca 2.5x en scoring — garantiza aislamiento de contexto por marca.
- Nunca mezclar datos de distintas marcas.

### Schemáticos
- Máximo 8k chars de contexto (límite TPM de Groq free tier).
- Archivos >100k chars: fragmentación con ventana deslizante.

### Prompts
- Prioridad absoluta a datos de la wiki/RAG sobre conocimiento general del modelo.
- Modo Mentor: preguntar antes de dar solución final.
- El cron de enriquecimiento NO debe sobreescribir `diagnosisEnriched` si ya tiene contenido.
- El event bus de Cerebro usa `window.dispatchEvent(CustomEvent)` — no extender este patrón, preferir Context o props.

---

## Status IDs de reparación — Mapa completo

```typescript
// SIEMPRE usar constantes, nunca números mágicos
const REPAIR_STATUS = {
  PENDING:     1,  // Ingresada, esperando técnico
  CLAIMED:     2,  // Tomada por técnico (takeRepairAction)
  IN_PROGRESS: 3,  // En proceso activo
  PAUSED:      4,  // ⚠️ PAUSED — el cron cree que es "Listo" (BUG conocido)
  OK:          5,  // Reparación exitosa
  DELIVERED:   6,  // Entregada al cliente
  NO_REPAIR:   7,  // Sin solución
  // 8, 9: estados finales adicionales (no completamente documentados)
  INVOICED:    10, // Entregada con factura
} as const;
```

---

## Vulnerabilidades de seguridad conocidas

Al tocar estos archivos, arreglar:

| Archivo | Problema | Fix |
|---------|---------|-----|
| `auth-actions.ts:44-56` | `secure: false` en cookies de sesión | `secure: process.env.NODE_ENV === "production"` |
| `auth-actions.ts:9` | 8 `console.log` en login — loggea emails, resultado de bcrypt | Eliminar todos |
| `lib/afip.ts:8-21` | Monkey-patch TLS global que degrada TODAS las conexiones HTTPS | `httpsAgent` customizado solo para AFIP |
| Cualquier route nueva | Sin auth check | Siempre agregar `getCurrentUser()` |

---

## Bugs conocidos — No reintroducir

| # | Archivo | Bug |
|---|---------|-----|
| 1 | `cash-shift-actions.ts:75` | N+1: `getCashShiftById` usa `enrichShifts` secuencial |
| 2 | `cash-shift-actions.ts:365` | Catch vacío en gastos — total incorrecto sin aviso |
| 3 | `lib/afip.ts:8` | Monkey-patch TLS global para AFIP |
| 4 | `api/cron/enrich-diagnoses:20` | `statusId: {in:[4,5]}` — 4=PAUSED no "Listo" |
| 5 | `technician-actions.ts:27` | `takeRepairAction` no asigna `assignedUserId` |
| 6 | `dashboard-actions.ts:283` | `highPriorityCount` incluye todas las vencidas históricas |
| 7 | `enhance-diagnosis route` | Cron sobreescribe diagnóstico manual sin verificar |
| 8 | `spare-parts-client.tsx:196` | `setState` durante render — loop de renders |
| 9 | `cerebro-chat.tsx` | Fire-and-forget sin feedback al usuario |
| 10 | `pos.ts` / `business-hours.ts` | UTC-3 reimplementado manualmente |
| 11 | `stock.ts` | Auth por `branch.name !== "MACCELL 2"` — usar `branchId` |
| 12 | `repairs.ts:303` | Notificaciones a técnicos en serie — usar `Promise.all` |
| 13 | `local-embeddings.ts` | `EmbeddingPipeline` sin `globalThis` — reload descarga el modelo |
| 14 | `transfer-actions.ts` | Stock updates sin `$transaction` — race condition |
| 15 | `repairs.ts:198` | `isFinalConsumer: false` hardcodeado — facturas AFIP incorrectas |

---

## Infra y deploy

- `prisma generate` en **build time**, `prisma db push` en **runtime**.
- Docker: `node:20-slim`, incluir `debian-openssl-3.0.x` en `binaryTarget`.
- Backups en filesystem (volumen mapeado en Dokploy).
- Los 11 `@ts-ignore` del proyecto: 6 se solucionan corriendo `prisma generate` correctamente.

---

## Convenciones de commits

```
fix: / feat: / refactor: / perf: / style: / chore: / revert: / Enhance:
```
Formato: `tipo(scope): descripción corta en minúsculas`
Scopes: `(cerebro)`, `(admin)`, `(repairs)`, `(pos)`, `(vendor)`, `(technician)`, `(statistics)`, `(deploy)`

---

## Lo que NO hacer

- No `console.log` en `src/actions/` o `src/lib/`
- No asumir UTC — siempre Argentina (UTC-3) via `date-utils.ts`
- No `any` sin comentario explicativo
- No cachear páginas admin/dashboard (`force-dynamic`)
- No mezclar marcas en RAG de Cerebro
- No exponer precios en respuestas IA
- No `maxRetries` con Groq free tier
- No números mágicos de statusId — usar constantes
- No auth por `branch.name` — usar `branchId`
- No agregar `setInterval` sueltos
- No `.catch(() => { })` silencioso en operaciones background
- No reimplementar UTC-3 manualmente
- No confiar en `ignoreBuildErrors: true` — es un workaround temporal

---

## Código modelo (referencias de calidad)

| Archivo | Por qué es el estándar |
|---------|----------------------|
| `lib/date-utils.ts` | JSDoc completo, funciones puras, bien documentado |
| `lib/groq.ts` → `runWithGroqFallback` | Tipado perfecto, logging consciente de privacidad |
| `lib/cerebro-rag.ts` | Separación clara con delimitadores, fallbacks documentados |
| `lib/db.ts` | Singleton con `globalThis` para hot reload safety |
| `stock-actions.ts` → `resolveStockDiscrepancy` | Transacción con optimistic lock — modelo para stock concurrente |
| `repairs.ts` → `getRepairHistoryAction` | Búsqueda multi-palabra con AND+OR |
| `config/ai-models.ts` | Prompts en constantes nombradas, fácil de modificar |

---

## Flujo obligatorio antes de cualquier fix crítico

```bash
npm test          # 1. Estado conocido — todos pasan
# hacer el fix
npm test          # 2. Siguen pasando
# agregar test de regresión si corresponde
git commit -m "fix(modulo): descripción + test de regresión"
```
