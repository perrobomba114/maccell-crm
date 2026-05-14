---
name: maccell
description: Skill maestra de MACCELL CRM. Usar para cualquier cambio en este repo: Next.js 15, React 19, Prisma, POS, AFIP/ARCA, reparaciones, stock, Cerebro AI, RAG, deploy y deuda tecnica.
language: typescript, tsx, css
framework: nextjs, react, tailwindcss, shadcn, prisma
---

# MACCELL CRM — Skill Operativa

Esta skill resume el contrato de trabajo para MACCELL CRM. Debe mantenerse alineada con:

- `README.md`: entrada del proyecto.
- `AGENTS.md`: reglas resumidas para Codex.
- `AGENT.md`: contexto historico y bugs conocidos.
- `.claude/claude.md`: reglas equivalentes para Claude.
- `.claude/error-verification.md`: protocolo de cierre.
- `docs/agent-tooling.md`: Codex, Claude, skills y MCP recomendados.
- `docs/technical-debt-roadmap.md`: checklist vivo de deuda tecnica.

Cuando haya conflicto, priorizar seguridad, datos reales del repo y el roadmap vivo.

---

## 1. Contexto Del Sistema

MACCELL CRM es un ERP/CRM operativo para centros de reparacion y venta tecnologica.

Stack:

- Next.js 15 App Router, React 19.
- TypeScript.
- PostgreSQL con Prisma ORM.
- Tailwind CSS v4, shadcn/ui, Recharts, Lucide.
- Groq como AI principal, OpenRouter fallback, Vercel AI SDK.
- Embeddings Xenova 384 dims, RAG con pgvector o fallback.
- AFIP/ARCA para facturacion electronica argentina.
- Docker + Dokploy, build standalone.

Modulos:

- `admin`: KPIs, caja, gastos, facturas, usuarios, backups, reportes.
- `vendor`: POS, ventas, recepcion de equipos, stock de sucursal.
- `technician`: cola de trabajo, diagnostico, repuestos, historial.
- `repairs`: ciclo completo de reparacion.
- `stock`: inventario, repuestos, transferencias.
- `cerebro`: chat AI, wiki, RAG, schematicos.
- `public`: seguimiento por QR y pantallas digitales.

---

## 2. Antes De Tocar Codigo

1. Leer el archivo o modulo completo suficiente para entender el flujo.
2. Revisar `docs/technical-debt-roadmap.md` si el cambio toca deuda conocida.
3. Si tocas UI React, aplicar tambien `vercel-react-best-practices`.
4. Si tocas animaciones/transiciones, aplicar `vercel-react-view-transitions`.
5. Si tocas Supabase, Prisma, Auth, Stripe u otra tecnologia con skill especifica, aplicar la skill relevante.
6. No agregar codigo a archivos de mas de 300 lineas sin dividir responsabilidad o justificar.

---

## 3. Gate Obligatorio De Cierre

En este repo `npm run build` no alcanza porque `next.config.ts` mantiene temporalmente:

- `typescript.ignoreBuildErrors: true`
- `eslint.ignoreDuringBuilds: true`

Comando recomendado desde la raiz:

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Fallback manual minimo:

```bash
npx tsc --noEmit
git diff --check
CHANGED_TS="$( { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then
  printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet
fi
npm run build
```

Si existe `npm test`, correrlo. Para codigo critico, agregar o actualizar tests aunque hoy el script no exista.

La respuesta final debe reportar:

- `npx tsc --noEmit`: pasa/falla/no corrido.
- `lint archivos tocados`: pasa/falla/no corrido.
- `git diff --check`: pasa/falla/no corrido.
- `npm run build`: pasa/falla/no corrido.
- `npm test`: pasa/no existe/no corrido.
- Errores no corregidos: ninguno o lista concreta.

---

## 4. Reglas Inquebrantables

### Seguridad

- Toda ruta privada `src/app/api/**/route.ts` debe autenticar antes de leer body, DB, archivos, API keys o servicios externos.
- Patron base:

```ts
const user = await getCurrentUser();
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
```

- Excepciones: rutas `public` documentadas, health checks sin datos sensibles, crons con `CRON_SECRET`.
- Cookies de sesion: `secure: process.env.NODE_ENV === "production"`.
- No autorizar por `branch.name`; usar `branchId`, rol y permisos reales.

### Logs

- Prohibido `console.log` en `src/actions/**` y `src/lib/**`.
- En `src/app/api/**`, usar `console.error` solo para errores reales.
- Debug temporal solo con `console.warn("[DEBUG] ...")` y debe eliminarse antes de cerrar.
- Nunca loggear CUIT, certificados, claves privadas, passwords, emails sensibles, prompts completos ni datos internos de negocio.

### TypeScript

- No agregar `any`, `any[]`, `Record<string, any>`, `as any` ni `(x as any)`.
- Si un archivo `.ts`/`.tsx` se toca, limpiar los `any` explicitos de ese archivo o documentar excepcion inevitable con `TECH_DEBT`.
- `catch (error: any)` debe ser `catch (error: unknown)` y normalizar mensaje.
- Preferir tipos Prisma, `unknown`, `z.infer`, `React.ComponentProps`, `ReturnType`, `Awaited`, unions discriminadas y DTOs locales.
- No usar `(prisma as any).modelo` si el modelo existe en schema. Ejecutar `prisma generate`.

### Deuda Tecnica

Todo parche de emergencia requiere:

```ts
// TECH_DEBT(YYYY-MM): que se hizo
// Impacto: que riesgo deja
// Fix real: como resolverlo bien
```

### Archivos Grandes

- Objetivo: archivos por debajo de 300 lineas.
- Si un archivo supera 300 lineas, dividir por responsabilidad antes de agregar mas comportamiento.
- Ejemplos: modales grandes, hooks con muchas responsabilidades, actions mezcladas.

### Tests

Tests obligatorios para:

- Dinero: caja, facturas, IVA, premios, pagos.
- Fechas/timezone.
- Estados de reparacion.
- Stock concurrente y transferencias.
- Fallbacks AI/DB/impresoras.
- AFIP/ARCA y errores de facturacion.

---

## 5. Next.js, Prisma y Deploy

- Paginas y rutas que consultan DB deben usar datos frescos. Usar `export const dynamic = "force-dynamic"` cuando corresponda.
- No confiar en cache de build para admin, vendor, technician, dashboard o reportes.
- `prisma generate` corre en build time.
- `prisma db push` o `migrate deploy` corre en runtime/deploy segun estrategia.
- Docker usa `node:20-slim`, no Alpine.
- `output: "standalone"` es requerido.
- Backups deben vivir en filesystem con volumen persistente.
- Evitar `JSON.parse(JSON.stringify(result))`; usar `select` acotados con datos serializables.

---

## 6. Fechas y Timezone

- Argentina UTC-3 siempre.
- Usar `src/lib/date-utils.ts`.
- No reimplementar offsets manuales como `getTime() - 3 * 3600 * 1000`.
- Cierres de caja, gastos, facturas, garantias, turnos y reportes deben respetar timezone local.

---

## 7. Reparaciones y Estados

No usar numeros magicos para `statusId`. Crear/usar constantes compartidas:

```ts
export const REPAIR_STATUS = {
  PENDING: 1,
  CLAIMED: 2,
  IN_PROGRESS: 3,
  PAUSED: 4,
  OK: 5,
  DELIVERED: 6,
  NO_REPAIR: 7,
  INVOICED: 10,
} as const;
```

Reglas:

- `PAUSED` es `4`; no es listo ni entregado.
- Toda transicion importante registra historial.
- Tomar una reparacion debe asignar `assignedUserId`.
- Entregar/facturar debe mantener venta, reparacion e historial consistentes.
- Notificaciones a multiples tecnicos/admins deben paralelizarse con cuidado.

---

## 8. Stock, POS, Caja y AFIP

### Stock

- Movimientos concurrentes con `prisma.$transaction`.
- Usar verificacion optimista para evitar stock negativo o doble descuento.
- Registrar `SparePartHistory`/historial equivalente en consumos, devoluciones y transferencias.

### POS

- Checkout debe mantener consistentes venta, pagos, stock, reparacion y factura.
- No usar `setTimeout` para secuenciar impresion/adjuntos si se puede usar `await`, cola o promesas explicitas.
- Errores de impresion o adjuntos deben ser visibles o loggeados con `console.warn`.

### Caja

- Cierres calculan efectivo, digital, gastos, ventas modificadas y premios.
- No ocultar errores de gastos con catches vacios.
- Evitar N+1 en enriquecimiento de turnos.

### AFIP/ARCA

- No loggear certificados, keys, CUIT o fragmentos de secretos.
- Cualquier downgrade TLS debe estar aislado al cliente AFIP, nunca global.
- `rejectUnauthorized: false` solo puede quedar con justificacion `TECH_DEBT` y scope minimo.
- Factura A/B/C y consumidor final salen de datos reales, no hardcode.

---

## 9. Cerebro AI y RAG

Reglas criticas:

- Principal: Groq con pool `GROQ_API_KEY_1..N`.
- Fallback: OpenRouter.
- No usar `maxRetries` con Groq free tier.
- Priorizar wiki/RAG sobre conocimiento general.
- No mezclar marcas ni plataformas.
- No mencionar precios internos.
- Detectar iOS/Android antes de mencionar ICs especificos.
- Si hay imagen, usar pipeline/modelo con vision; detectar tambien partes `file` con `mediaType image/*`.
- Schematicos: max 8k chars de contexto; archivos grandes se fragmentan.
- Embeddings: Xenova 384 dims; evitar OOM en fallback.
- Si pgvector falla, fallback maximo de 100 filas puras.
- RRF debe normalizar contra el max score, no con multiplicadores estaticos.
- Indexacion/batching: usar lotes pequenos y `Promise.allSettled()`, no `Promise.all` masivo.
- Fire-and-forget siempre:

```ts
task.catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("[CEREBRO] Background task failed:", message);
});
```

---

## 10. React, UI y Performance

- Para `.tsx`, hooks, dashboards, formularios y charts, aplicar `vercel-react-best-practices`.
- No hooks condicionales.
- Componentes con mas de 15 `useState`: usar `useReducer` o dividir.
- No agregar `setInterval` manual suelto. Usar SWR o `usePolling`.
- Recharts debe montarse con guard de cliente (`isReady`) y contenedor con `minWidth`/`minHeight`.
- Tablas con mas de 5 columnas necesitan vista mobile alternativa.
- Usar shadcn/ui y Lucide cuando haya componente/icono existente.
- UI de CRM: densa, clara, operativa. Evitar landing/hero innecesario dentro de herramientas internas.
- KPIs admin, headers y filtros deben seguir patrones existentes del dashboard/admin.
- No agregar `suppressHydrationWarning` masivamente para atributos de extensiones como `bis_skin_checked`.

---

## 11. Anti-Patrones Prohibidos

- `console.log` en backend.
- Rutas API privadas sin auth.
- `secure: false` en cookies de produccion.
- `any`/`as any` para tapar tipos.
- `(prisma as any).modelo`.
- `statusId: 4` o similares en vez de constantes.
- `.catch(() => {})` silencioso.
- `setInterval` manual sin abstraccion.
- `setTimeout` para secuenciar operaciones de negocio.
- Timezone UTC o offset manual.
- `JSON.parse(JSON.stringify(result))` en codigo nuevo/tocado.
- TLS/HTTPS monkey-patch global.
- Mezclar marcas en RAG.
- Exponer precios en AI.
- `maxRetries` con Groq free tier.
- Agregar comportamiento a archivos grandes sin dividir.

---

## 12. Archivos Modelo

Usar como referencia:

- `src/lib/date-utils.ts`: timezone, funciones puras y documentacion.
- `src/lib/db.ts`: singleton con `globalThis`.
- `src/lib/groq.ts`: rotacion/fallback de keys.
- `src/lib/cerebro-rag.ts`: separacion de responsabilidades RAG.
- `src/lib/actions/stock-actions.ts`: transacciones y optimistic locking.
- `src/actions/repairs/history.ts` o busquedas multi-palabra equivalentes.
- `src/config/ai-models.ts`: prompts y modelos en constantes.

---

## 13. Roadmap Vivo

Para arreglar deuda, usar:

```bash
docs/technical-debt-roadmap.md
```

Cada item cerrado debe marcarse `[x]` o eliminarse si el equipo quiere mantener solo pendientes. No marcar items criticos sin verificacion.

---

## 14. Skills y MCP

Las skills versionadas del proyecto viven en `.agents/skills/`.

Uso obligatorio:

- `maccell`: siempre.
- `vercel-react-best-practices`: si se toca React/Next/UI/hooks.
- `frontend-design`: si se toca experiencia visual.
- `vercel-react-view-transitions`: si se toca animacion/transicion.
- `find-skills`: si falta una skill especifica.

Claude debe usar `.claude/claude.md`, que apunta a esta misma skill para evitar reglas duplicadas.

MCPs recomendados y plantillas locales:

```bash
docs/agent-tooling.md
```

Reglas MCP:

- No commitear secretos ni configs locales con tokens.
- Preferir herramientas read-only para DB/produccion.
- Usar MCP de documentacion para librerias actuales.
- Usar browser/Playwright para verificar UI local cuando aplique.
