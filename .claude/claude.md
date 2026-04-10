# Instrucciones Globales para Claude - MACCELL CRM

Este archivo proporciona el contexto crítico del proyecto para Claude. Para una lectura exhaustiva de todas las reglas y la arquitectura, consulta siempre el archivo principal `AGENT.md` en la raíz del proyecto.

## 🛠 Stack Tecnológico
- **Framework:** Next.js 15 (App Router), React 19 (usar `--legacy-peer-deps`)
- **Base de datos:** PostgreSQL vía Prisma ORM (siempre correr `prisma generate` antes del build)
- **UI:** Tailwind CSS, shadcn/ui, Recharts
- **AI/ML:** Groq API (principal), OpenRouter (fallback), Vercel AI SDK, embeddings Xenova, RAG con pgvector

## 🚨 Reglas de Oro INQUEBRANTABLES (Extraídas de AGENT.md)

1. **PROHIBIDO el uso de `console.log` en Backend (`src/actions/*` y `src/lib/*`).**
   - Configurado en `eslint.config.mjs` como `error`.
   - Para debuggear temporalmente, usar SÓLO `console.warn("[DEBUG] ...")` para luego eliminarlo.
   - En APIs (`src/app/api/*`), usar solo `console.error` para errores reales catchados.

2. **Deuda técnica explícita en fixes de emergencia.**
   - Usar el formato `// TECH_DEBT(YYYY-MM): <descripción>` para marcar cualquier monkey-patch o arreglo rápido.

3. **Límites de tamaño de archivo (< 300 líneas).**
   - No agregar código a archivos que superen las 300 líneas. Refactorizar y dividirlos en sub-módulos primero. Ejemplo: `dashboard-actions.ts` no debería existir; en su lugar usar archivos específicos por dominio (`kpis.ts`, `repairs.ts`, etc.).

4. **Testing (Vitest) Obligatorio por dominio.**
   - Cualquier función que calcule **dinero** (caja, facturas, bonus), **fechas/tiempos**, o dicte el **estado** del sistema DEBE tener test en `src/__tests__/`.
   - Siempre correr `npm test` antes y después de intervenir código crítico.

5. **Aislamiento de Módulos (Cerebro AI):**
   - Nunca mezclar contexto de distintas marcas en el RAG.
   - Prohibido filtrar o mencionar precios en chats generados por IA.

## 🏗 Arquitectura y Código
- Las fechas siempre deben manejarse considerando el huso horario local de **Argentina (UTC-3)**. Usar las utilidades de `lib/date-utils.ts` para cálculos, **NO REINVENTAR LA LÓGICA**.
- Evitar hooks condicionales en React.
- Abstraer polling de timers (`setInterval`) a hooks reutilizables (como un `usePolling` custom o SWR).
- Componentes modulares y evitar los React de +25 estados (`useState`); utilizar `useReducer` en entidades complejas.

> **TIP DE AGENTE**: Si un archivo te parece enorme, inestable o notas variables mágicas (ej. `toStatusId === 5` sin constante explicativa), consulta tu archivo de referencias cruzadas o haz un refactor atómico sin modificar comportamiento (`refactor:` en los commits de git).
