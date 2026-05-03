---
name: maccell
description: Skill maestra y exhaustiva de MACCELL CRM. Sintetiza todas las reglas de arquitectura, patrones de Cerebro AI, guías de Shadcn/Tailwind v4, React 19 Theming, y los anti-patrones exactos del proyecto documentados en AGENT.md.
language: typescript, tsx, css
framework: nextjs, react, tailwindcss, shadcn, prisma
---

# MACCELL CRM - Guía Maestra Definitiva

Esta skill es la **ÚNICA fuente de verdad** unificada para el desarrollo en el repositorio MACCELL CRM. Consolida de forma masiva e integral todas las sub-guías del equipo: `AGENT.md`, `claude.md`, reglas de IA (Cerebro), lineamientos de Vercel (React 19), Shadcn/UI, y el sistema de diseño Tailwind CSS v4.

Todo agente de IA o desarrollador debe acatar **cada una de estas reglas sin excepciones**.

---

## 0. GATE OBLIGATORIO: No romper producción

Antes de decir que una tarea está lista, ejecuta una verificación real. En MACCELL `next.config.ts` tiene `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`; por eso **`npm run build` no demuestra que no haya errores de TypeScript o ESLint**.

### Comando recomendado

Desde la raíz del repo:

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Si el script no existe o no puede ejecutarse, corre manualmente como mínimo:

```bash
npx tsc --noEmit
git diff --check
CHANGED_TS="$( { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then
  printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet
fi
npm run build
```

### Regla de cierre

La respuesta final debe incluir:

- `npx tsc --noEmit`: pasa/falla.
- `lint archivos tocados`: pasa/falla.
- `git diff --check`: pasa/falla.
- `npm run build`: pasa/falla/no corrido.
- `npm test`: pasa/no existe/no corrido.
- `Errores no corregidos`: ninguno, o lista concreta `archivo:línea — motivo`.

Si un chequeo falla en archivos tocados, **sigue corrigiendo**. Si falla por deuda previa fuera del cambio, dilo explícitamente con evidencia.

### Errores recientes que NO deben repetirse

- Rutas `src/app/api/**/route.ts`: autenticar con `getCurrentUser()` **antes** de leer API keys, consultar DB, correr IA o tocar servicios externos. Excepciones solo para `public`, health checks, o cron validado con `CRON_SECRET`.
- Cerebro con imágenes: los uploads del cliente pueden llegar como `part.type === "file"` con `mediaType` `image/*` y `url`; no asumas solo `type === "image"`.
- Fire-and-forget: prohibido `promise.catch(() => {})`. Siempre loggear `console.warn("[MODULO] ...", err.message)`.
- `npm run build` pasando no autoriza deploy si `tsc`, lint acotado o `git diff --check` fallan.
- Al refactorizar a módulos nuevos, lint también debe correr sobre archivos `??` no trackeados.

### Regla de `any` en archivos tocados

Si una tarea toca un archivo TypeScript/React, el agente queda responsable de los `any` explícitos de ese archivo:

- Prohibido dejar nuevos `any`, `any[]`, `Record<string, any>`, `as any` o `(x as any)` en archivos tocados.
- Si el archivo ya tenía `any`, eliminarlos mientras se trabaja en ese archivo usando tipos locales, `unknown`, `Prisma.*`, tipos del schema, `z.infer`, `UIMessage`, `React.ComponentProps`, `ReturnType`, `Awaited`, discriminated unions o tipos compartidos.
- No cerrar con ESLint fallando por `@typescript-eslint/no-explicit-any` en archivos tocados.
- Excepción única: interoperabilidad inevitable con SDK externo sin tipos o monkey-patch heredado. Debe quedar con comentario `TECH_DEBT(YYYY-MM)` explicando por qué no se puede tipar ahora, impacto y fix real.
- Cambiar `catch (error: any)` por `catch (error: unknown)` y normalizar con `error instanceof Error ? error.message : String(error)`.

Antes del cierre, buscar explícitamente:

```bash
CHANGED_TS="$( { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then
  printf '%s\n' "$CHANGED_TS" | xargs rg -n "\bany\b|as any|\(.* as any\)"
fi
```

---

## 0.1 Skills React obligatorias

Cuando una tarea toque React, Next.js UI, hooks, componentes, páginas, dashboards, formularios, charts o performance frontend, carga y aplica estas skills además de `maccell`:

1. `vercel-react-best-practices`
   - Uso obligatorio para componentes React/Next.js, hooks, render performance, data fetching, memoización, bundles y errores de hidratación.
   - En MACCELL web esta es la skill React principal y debe leerse antes de editar archivos `.tsx` o hooks compartidos.

2. `vercel-react-view-transitions`
   - Uso obligatorio si se agregan o corrigen animaciones de navegación, transiciones entre estados, shared elements, entrada/salida de componentes, reorder de listas o se menciona `ViewTransition`.
   - No introducir librerías de animación si React/CSS View Transitions resuelven el caso limpiamente.

3. `vercel-react-native-skills`
   - Uso obligatorio solo si la tarea toca React Native, Expo, mobile nativo, listas móviles, animaciones nativas o módulos mobile.
   - Para MACCELL web/Next.js no reemplaza a `vercel-react-best-practices`; úsala únicamente cuando el alcance sea mobile/native.

Regla práctica: si el archivo tocado termina en `.tsx` o contiene hooks React (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, custom hooks), al menos `vercel-react-best-practices` debe guiar la implementación. Si además hay transición/animación, sumar `vercel-react-view-transitions`.

---

## 1. Contexto Global y Stack Tecnológico

- **Framework:** Next.js 15 (App Router), React 19 (usar `--legacy-peer-deps` temporalmente).
- **Base de datos:** PostgreSQL vía Prisma ORM (⚠️ Importante: siempre correr `prisma generate` antes del build para evitar desincronizaciones de type definitions).
- **UI:** Tailwind CSS v4 (CSS-first config), shadcn/ui (Radix primitives), Recharts.
- **AI/ML (Módulo Cerebro):** Groq API (modelo principal, rápido y barato) y OpenRouter (fallback). Vercel AI SDK, embeddings Xenova locales, RAG con `pgvector` en DB.
- **Infraestructura:** Docker + Dokploy, standalone Next.js build.
- **Dominios:** El sistema cubre POS (Punto de Venta), Admin, Reparaciones, Técnicos, Sucursales, y Cerebro (Asistente de Inteligencia Artificial para técnicos).

---

## 2. REGLAS INQUEBRANTABLES DE ARQUITECTURA (De `AGENT.md`)

El historial de MACCELL muestra un fuerte ritmo ("Ship fast, fix fast"), pero ha acumulado deuda técnica. Para evitarlo, rigen estas leyes:

### 2.1 Cero `console.log` en el Backend
- **Regla:** Está prohibido dejar `console.log` en `src/actions/*` y `src/lib/*`.
- **Razón:** Llegaron a contarse +129 logs en producción, filtrando CUITs, emails y passwords. ESLint bloquea esto.
- **Fix:** Si necesitas debuggear temporalmente, usa `console.warn("[DEBUG] ...")` y elimínalo antes del commit. En `src/app/api/` solo se permite `console.error` para excepciones cacheadas.

### 2.2 Fixes de Emergencia = Deuda Técnica Declarada
- **Regla:** Cuando se haga un parche rápido o "monkey-patch" por urgencia (ej. para APIs truncadas como AFIP), el commit y el código deben incluir un comentario exhaustivo.
- **Formato obligatorio:**
  `// TECH_DEBT(YYYY-MM): <Qué hiciste> - Impacto: <Riesgo> - Fix esperado: <Solución ideal y links>`

### 2.3 Límite de Tamaño: `< 300` Líneas
- **Regla:** Ningún archivo (componente o módulo de acciones) debe superar las 300 líneas.
- **Razón:** El histórico `dashboard-actions.ts` alcanzó 1166 líneas generando code smells inmensos y dificil mantenimiento.
- **Fix:** Si editas un archivo de `>300` líneas, sepáralo por dominios (ej. de `dashboard-actions.ts` derivar `kpis.ts`, `repairs.ts`, `cash.ts`, etc). En la UI, dividir mega-modales y extraer lógicas.

### 2.4 Testing Obligatorio (`src/__tests__`)
- **Regla:** Cualquier función que aplique a **Cálculo de Dinero / AFIP**, **Fechas / Tiempos**, y **Lógica pura de Estados**, debe tener test con `Vitest`.
- **Razón:** Un bug en el sumario de cálculos rompe la contabilidad de la empresa entera.
- **Excepción:** No se deben escribir tests obligatorios para componentes renderizados UI de React ni validaciones menores.
- **Uso:** Correr `npm test` antes y después.

### 2.5 Eliminación de IDs Mágicos
- **Regla:** Prohibidas queries como `toStatusId: [5, 6, 7]`. Nadie sabe qué es 5 en runtime.
- **Fix:** Siempre usar diccionarios de constantes en frontend/backend. (Ej: `REPAIR_STATUS_IDS.OK`).

### 2.6 TypeScript sin `any` en archivos modificados

Cada archivo tocado debe salir mejor tipado de lo que entró. Si el cambio requiere tocar un módulo con deuda, arreglar también los `any` del módulo o documentar la excepción como deuda técnica explícita. No usar `as any` para “pasar” `tsc`; eso solo mueve el bug a runtime.

---

## 3. CEREBRO AI - Reglas de Backend, Embeddings y RAG

Cerebro es el módulo hipercrítico de MACCELL para inteligencia artificial con 70+ commits.

### 3.1 Manejo de Embeddings y Vector Search (pgvector)
- **NUNCA** hagas un fallback que pida 200 arrays flotantes a la RAM de Node.js si la DB falla. Genera errores _Out Of Memory (OOM)_.
- **Solución Correcta:**
  1. Si `pgvector` trae `0` resultados, intenta con un `minSimilarity` rebajado (ej. de 0.60 baja a 0.45).
  2. Si `pgvector` truena catastróficamente, el `fallbackLimit` no debe pasar jamás de `100` filas puras.
- Las interpolaciones de variables raw en Queries SQL crudas deben ser purificadas usando matemáticas: `const safeLimit = Math.min(...)`.
- **Concurrencia DB:** NO instancias de `pg.Pool` nuevas en módulos de IA. Aprovecha a Prisma `$executeRawUnsafe`.

### 3.2 Clasificación Temprana y Habilidades Vision
- **Vision:** LlamaModels en fallback o Vercel Llama70 carecen de visión. Si en un request detectas `hasImages === true`, obligatoriamente despacha la ejecución del sistema a una ruta de Pipeline de Visión (`buildVisionMessages` con modelo tipo *llama-3.2-11b-vision*).
- **RAG Classification:** El usuario suele ingresar "iphone prendo no anda modulo". Nunca dispares búsqueda vectorial sin clasificar. Pásalo primero por `classifySymptom()`, y solo **con la query enriquecida clasificatoriamente** procedes a similaridad.

### 3.3 Híbrid RAG Score y Limitaciones Aisladas
- Mezclas búsquedas de keywords integradas con Vector Search (`Semantic`).
- **IMPORTANTE:** En **RRF** (Reciprocal Rank Fusion) para consolidar los scores, JAMÁS normalizes usando un multiplicador estático (Ej: `score * k`) porque aplasta el resultado a 0.97. Normaliza haciendo una división sobre el score más alto encontrado `score / maxScore`.
- ¡Aislamiento absoluto de marcas! iOS y Android no deben combinarse y deben cruzarse contra taxonomías limpias para evitar alucinaciones cruzadas.

### 3.4 Optimizaciones de Procesamiento y Batching
- Evitar `for(const item of list)` con awaits en serie para indexar.
- Evitar librar `Promise.all(massive)` salvaje que exceda la rate limit (429) y explote CPU.
- **Patrón mandatorio:** `BATCH_SIZE = 5`. Cortar los items y mandar en lotes usando `Promise.allSettled()`.
- **Desligue de Diccionarios Masivos:** Términos intrincados `TECHNICAL_DICTIONARY` no se almacenan como variables sueltas en módulos; separarlos a `lib/technical-dictionary.ts`.

---

## 4. PATRONES "VERCEL / REACT / NEXT.JS" PERFORMANCE

Vercel destina reglas estrictas. Aplícalas en MACCELL.

### 4.1 Eliminación de Cascadas o "Waterfalls" (CRÍTICO)
- Evita encadenar `const a = await f() \n const b = await f(a)` excesivamente si no son dependientes.
- Usa `Promise.all()` en `page.tsx` serversides si requieres traer Reparaciones, Stock, y Tickets que no se requieran linealmente.
- Delega el Fetching al cliente si no pertenece a validaciones de seguridad crípticas en initial layout loads, o utiliza Streaming y Boundaries con *React`<Suspense fallback={...}>`.*

### 4.2 Restricción de Renders React 19 (Hooks e Iteraciones)
- Identificar dependencias de `useEffect`. Muchos bugs en `spare-parts-client` fueron originados por llamados a `setState` que dependían de sí mismos generando bucles infinitos.
- Evitar hooks condicionales (rompe React Error 310).
- Usa refs (`useRef`) para variables mutables transitivas en lugar de states superfuloos si la vista no necesita obligadamente un refresh visual (Ej, variables semáforos como `isSaving`).
- **Estados Masivos:** Componentes como `pos-client.tsx` ostentaron +25 `useStates`. No repitas eso. Unificar configuraciones en Modales separados.

### 4.3 Errores Inadecuados de Data Fetching en Clientes
- No uses la recursividad temporal libre de `setTimeout` o `setInterval` manuales que queden colgando en layouts desencadenando Fugas de Memoria.
- Obligatorio: Consolidar estados periódicos a un hook de `usePolling()` con un ciclo de vida `useEffect` que haga `clearInterval` al desmontar o directamente usar `SWR`.

### 4.4 Carga Dinámica e Isolación
- Elementos sumamente pesados (Visores de PDF de etiquetas ZPL, Gráficos Recharts en Dashboard) DEBEN importar asíncronamente con `next/dynamic` y apagar falsos SSR errors en Recharts usando wraps montados `isReady`.

---

## 5. DISEÑO DE INTERFACES: Tailwind CSS v4 & Shadcn/ui

### 5.1 CSS-First v4 Tailwind
MACCELL abandonó `tailwind.config.ts`. Ahora usamos un abordaje `CSS-first`.
- Toda configuración de tokens, variantes custom, y animaciones base habita en `globals.css` bajo las directivas `@theme` o estandares CSS variables bajo `@layer base`.
- El manejo de temas y mododark se unifica a `@custom-variant dark (&:where(.dark, .dark *));`.
- Los colores semánticos (`--color-primary`, `--color-background`) prevalecen utilizando **OKLCH** para percepción humana uniforme y consistencia de luminosidad extrema en contraste de modo oscuro.
- Las animaciones base se aplican combinando keys CSS y `@starting-style` nativo y CSS discreto en lugar de librerías extras js-pesadas de terceros para slides y fades.

### 5.2 Estructuración de Shadcn/UI Componentes
El CRM abraza el toolkit Shadcn; por ende, estos componentes no están encapsulados herméticamente. **Son código en propidad.**
- Ante la carencia de dependencias complejas, todos los overrides de inputs e forms deben unirse bajo **`React Hook Form` y un Resolver `Zod`**. Cero forms html controlados sueltos "brutos".
- **React 19:** `ref` ya pasó a ser prop normal base en componentes funcionales. Quitar y evadir el patrón anticuado `forwardRef` al customizar e instalar piezas complejas extra. Los type declarations como `React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }` son preferidos.

### 5.3 Convenciones Estético-Visuales
- Un diseño que NO esté pulido, colorido o dinámico falla automáticamente tu encomienda.
- **Usar skill `frontend-design` en UI:** Para cualquier cambio de interfaz web, páginas admin, dashboards, formularios, tablas, cards o rediseños visuales, activar la skill instalada en `.agents/skills/frontend-design/SKILL.md` como capa de criterio visual. Aplicarla siempre filtrada por MACCELL CRM: primero consistencia operativa, densidad útil, accesibilidad y patrones existentes; después creatividad. No usar su libertad estética para romper el sistema de administración ni inventar un lenguaje visual por pantalla.
- **Garantizar Modernidad:** Revestir botones, tarjetas con micro-efectos y gradientes sutiles.
- Usa los breakpoints prefabricados para diseños Grid Responsivos (Grid containers).
- **Sistema uniforme de KPIs admin:** Las tarjetas de métricas en administrador deben seguir el patrón de `src/components/admin/dashboard/KPIGrid.tsx`: `Card` con `relative overflow-hidden border-none shadow-lg bg-gradient-to-br ... text-white`, `CardContent className="p-6"` como único contenedor de KPI, título chico `text-sm font-medium text-*/100`, valor grande `text-3xl font-bold leading-none tracking-tight tabular-nums`, icono Lucide en `rounded-xl bg-white/20 p-3 backdrop-blur-sm`, y círculo decorativo `absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none`. Usar una grilla consistente `grid gap-6 md:grid-cols-2 lg:grid-cols-4`.
- **Paleta de KPIs admin:** Reusar el set del dashboard: ingresos/positivos `from-emerald-500 to-emerald-700`, operación/IVA/promedio `from-blue-500 to-indigo-600`, tiempo/acumulados `from-amber-400 to-orange-600`, usuarios/sucursales/estado `from-purple-500 to-pink-600`, egresos/alertas `from-rose-500 to-red-700`. No inventar tarjetas pastel, bordeadas o dark-outline diferentes para facturación, gastos, backups, caja u otros módulos admin.
- **Alineación de valores en KPIs:** Los valores numéricos deben compartir la misma línea base visual dentro de su grilla. Usar altura estable (`min-h-*`) y empujar metadata con `mt-auto`; nunca dejar que subtítulos de 1 o 2 líneas muevan importes a distintas alturas. Los importes deben usar `tabular-nums` y `leading-none`.
- **Estructura obligatoria de 3 filas para KPIs admin con icono:** No poner el valor en la misma fila flex que el icono — el icono compite por ancho y montos largos como `$ 512.000` parten en 2 líneas mientras `$ 0` queda en 1, rompiendo la línea base. Layout correcto:
  1. **Fila 1 (título + icono):** `<div className="flex items-start justify-between gap-4">` con el `<p>` del título a la izquierda y el contenedor del icono con `shrink-0` a la derecha. El título debe reservar altura uniforme con `line-clamp-2 min-h-[2.5rem]` para que títulos de 1 línea ("Promedio") y 2 líneas ("Gastos del día seleccionado") ocupen el mismo espacio.
  2. **Fila 2 (valor):** `<h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">`. El `whitespace-nowrap` es obligatorio para que el signo `-` o `$` no se separen del monto.
  3. **Fila 3 (metadata):** `<div className="mt-auto pt-4 text-sm text-{color}-100">`.
  - Altura mínima del `CardContent`: `min-h-[180px]` (no `156px`) para acomodar las 3 filas sin recortar.
  - Si el valor es texto variable (nombre de sucursal, estado), igualmente convertirlo a un valor homogéneo con el resto de la grilla — preferir mostrar un monto y bajar el texto a metadata, no al revés.
  - Anti-patrón explícito: agrupar `<p>` título + `<h3>` valor en un mismo `<div>` al lado del icono. Esto fuerza al monto a competir por ancho con el icono y produce wraps inconsistentes entre cards. Detectado y corregido en `admin/expenses` (2026-05) — no reintroducir.
- **Headers de sección admin (patrón canónico):** El header de cada página admin (Ventas, Gastos, Reparaciones, etc.) debe usar este patrón en lugar de gradients horizontales pesados que se ven anticuados:
  - Contenedor: `<section className="overflow-hidden rounded-xl border bg-card shadow-sm">`.
  - Banda superior: `<div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">` con un **acento vertical lateral** `<div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-{color}-400 to-{color}-600" />` usando el color del módulo (emerald=ventas/positivos, rose=gastos, blue=reparaciones, etc.).
  - Título a la izquierda: icono Lucide en chip cuadrado `<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-{color}-500/10 text-{color}-600 dark:text-{color}-400">` + `<h2 className="text-2xl sm:text-3xl font-black tracking-tight">` + `<p className="text-sm text-muted-foreground">` con la descripción del módulo.
  - A la derecha del título: contador en vivo del filtro como `<Badge variant="secondary">` (ej: "125 operaciones") — feedback inmediato sin badges duplicados que repitan los valores ya visibles en los selects.
  - Anti-patrón: gradient horizontal pesado tipo `bg-[linear-gradient(135deg,...)]` cubriendo todo el header y bloque de filtros amontonado a la derecha. Detectado y corregido en `admin/sales` (2026-05) — no reintroducir.
- **Toolbars de filtros con identidad visual de color por filtro:** Las barras de filtros de páginas admin no deben ser un bloque gris plano de selects con `border-dashed`. Patrón canónico:
  - Banda contenedora: `<div className="border-t bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5">` — gradient tri-color sutil al 5% que da continuidad con la paleta de KPIs sin abrumar.
  - Layout: buscador como elemento hero ocupando el ancho restante (`flex-1`) y selects/popovers como pills al costado.
  - Buscador hero: `h-12 rounded-xl border-2 pl-12 pr-10 text-base font-medium`. Cuando hay valor o foco, mostrar un **glow blur** detrás con `<div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition-opacity duration-300" />` activado con `opacity-25` (valor) o `group-focus-within:opacity-20` (foco). Cuando hay valor, intensificar borde a `border-blue-500 bg-blue-500/5`.
  - Filtros pill (Sucursal, Fecha): `h-12 rounded-xl border-2 px-4 font-semibold shadow-sm transition-all hover:shadow-md`. Estado activo = gradient sólido con texto blanco usando la paleta del módulo (sucursal=`from-emerald-500 to-emerald-600`, fecha=`from-amber-400 to-orange-500`). Estado inactivo = `border-border bg-background hover:border-{color}-500/50`.
  - Iconografía: cada filtro lleva su icono Lucide dentro de un chip `<div className="flex h-7 w-7 items-center justify-center rounded-lg ..."` con fondo `bg-{color}-500/10 text-{color}-600` cuando inactivo y `bg-white/20` cuando activo (sobre el gradient).
  - Botón "Limpiar" destructivo coherente: `border-2 border-rose-500/30 bg-rose-500/5 text-rose-600 hover:border-rose-500/50 hover:bg-rose-500/10`. Solo visible cuando hay filtros activos.
  - Anti-patrones explícitos: `border-dashed` apagado, `h-9` o más chico (se ve "viejo"), botones de sucursal con colores aleatorios por índice (`colors[index % colors.length]`), labels en mayúsculas tipo formulario de los 2010s, badges duplicados que repiten los valores de los selects, separadores verticales entre cada control. Detectado y corregido en `admin/sales` (2026-05) — no reintroducir.
- **Tablas (componente shadcn `Table`) — defaults canónicos:** El componente `src/components/ui/table.tsx` define defaults premium que NO deben rebajarse en consumidores ni se debe pasar `className` que los anule. Reglas obligatorias:
  - `TableHeader`: `border-b-2 border-border bg-muted/70 backdrop-blur-sm` — la cabecera debe estar **claramente diferenciada** del body con un fondo notorio (no `bg-muted/40` apagado) y un borde inferior de 2px que separe del primer row. Prohibido pasar `bg-muted/50` o variantes más débiles que rebajen este contraste.
  - `TableHead` (cada `<th>`): `h-12 px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground`. Los títulos deben ser **`text-xs font-extrabold uppercase`** con tracking ancho — patrón Stripe/Linear/Vercel. Usar `text-foreground` (no `text-muted-foreground` apagado) para que se lean firmes incluso en dark mode.
  - `TableRow`: `border-b border-border/60 transition-colors hover:bg-muted/40` — borde sutil entre filas, hover claro pero no agresivo.
  - `TableCell`: `px-3 py-3` — celdas con respiración, no `p-2` apretado.
  - El wrapper del `<Table>` es neutro (solo `overflow-x-auto`) porque las páginas suelen envolver la tabla en su propio `<Card>` o `<div className="rounded-lg border">`. No agregar `border` ni `shadow` al wrapper interno o se duplicarán los bordes.
  - Anti-patrones: títulos con `font-medium text-muted-foreground` (se ven débiles, no jerarquizan), `h-10` o más bajo (sin presencia), `text-[11px]` u otros tamaños no canónicos, header `bg-muted/30` o sin fondo (no diferencia del body). Detectado y corregido en `ui/table.tsx` (2026-05) — no reintroducir bajando el contraste por archivo.
- **Vista mobile obligatoria para tablas con +5 columnas:** Cualquier tabla admin con más de 5 columnas debe tener vista alternativa de cards en mobile (`md:hidden` para cards, `hidden md:block` para la tabla). El scroll horizontal en mobile es anti-patrón: pierde contexto y no muestra la columna de acciones. Patrón canónico de card mobile (referencia: `src/app/admin/sales/components/sales-table.tsx`):
  - `<article className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">`.
  - **Header del card** con identificador + valor principal grande (`text-2xl font-black tabular-nums {color}`) + badge de estado a la derecha. Banda con micro-gradient del color del módulo.
  - **Body en grid** (típicamente `grid-cols-2 gap-3 p-4`) con metadata clave (fecha/hora, sucursal, items) — cada item con su icono Lucide y tipografía jerarquizada.
  - **Footer con grid de acciones uniformes** (`grid grid-cols-N gap-1 border-t bg-muted/20 p-2`), cada botón `h-9` con su color de hover por acción (azul=ver, ámbar=editar, emerald=imprimir, rose=borrar).
  - Empty state con icono Lucide opaco al 30% + texto. Skeletons mobile distintos del desktop, simulando la card.
- **Hidratación y atributos inyectados por extensiones del navegador:** Si el log muestra mismatches de hidratación con el ÚNICO atributo `bis_skin_checked`, `data-darkreader-*`, `cz-shortcut-listen` u otros similares, **no es un bug del código** — los inyecta una extensión del navegador (Bitdefender Anti-Tracker, Dark Reader, Grammarly, ColorZilla, etc.). El proyecto ya tiene `suppressHydrationWarning` en `<html>` y `<body>` en `src/app/layout.tsx`, lo que es suficiente. NO agregar `suppressHydrationWarning` en cada `<div>` del árbol para tapar este síntoma — contamina el codebase. Si el warning molesta, pedir al usuario que pruebe en incógnito o desactive la extensión en el sitio.

---

## 6. ANTI-PATRONES EXPLÍCITOS EXISTENTES EN MACCELL

Durante la auditoría del proyecto MACCELL se detectaron los siguientes smells prohibidos. Cero reincidencia sobre los mismos:

1. **`JSON.parse(JSON.stringify(x))` en Next Actions:** Se utilizaba para serialización extrema, evaporando Date typings e imponiendo costo inmenso JSON procesal a cosas triviales. Remedio: Utilice conversiones explícitas, envíe Data serializable normal, limpie las fechas o confíe en superjson si estuviera configurado.
2. **Consultas N+1 destructivas (`enrichShifts`):** No haga bucles `for of` donde dentro invoca iterativamente Queries Prisma individuales a `Sales` o `Expenses`.
3. **Errores Ocultados:** Poner try y catch vacío sin `console.error` `catch (e) {}`. Si un `Expense` rompe, no notifica al Admin.
4. **Modificadores Globales en Red:** En algún momento para el SDK de AFIP un Dev parcheó la configuración global del Node.js limitando el protocolo Ciphers: `(tls as any).createSecureContext = ...`. **PROHIBIDO.** Todas intercepciones o downgrade de TLS DEBEN suscribirse única y llanamente a un Custom `httpsAgent` instanciado para esa solitaria request a AFIP.
5. **Autenticación Faltante (`secure: false` y Rutas de APIs):** Se encontró que las Cookies generadas por Dokploy estaban ignorando la obligatoriedad SSL. Las llamadas de endpoint puras a la capa de Route API como Backups y Admin ignoran cruzar el session ID server.
6. **Timezone Arcaico:** 3 calculos independientes paralelos en el tiempo y fecha del codebase `(getTime() - 3 * 3600 * 1000)`. Para un correcto funcionamiento de las garantías argentinas y emisión de comprobantes fiscales, usar siempre y únicamente `date-fns-tz` bajo la utilidad estandarizada `src/lib/date-utils.ts`.

---

## 7. CÓDIGO BENDITO (Modelos a Seguir)

Si tienes recelo al crear algún módulo, oriéntate en torno a la excelencia documentada de estos archivos del repositorio:

| Archivo / Patrón | Mérito Destacado |
| :-------: | :------: |
| `lib/date-utils.ts` | JSDocs precisos, funciones puras testeadas, validación timezone sólida (Argentino local puro). |
| `lib/cerebro-rag.ts` | Particiones claras en el documento (`// --------`), escalable, maneja Fallbacks elegantemente. |
| `lib/groq.ts` | Lógica `runWithGroqFallback()` que interpone rotación de keys y retry fallbacks de un Pool impecable. |
| `stock-actions.ts` | Contiene un solver en Transacción `resolveStockDiscrepancy()` que usa optimistic locking brillante evitando duplicaciones por race conditions paralelos entre admins. |

> **Recordatorio Final de Agente:** Como Antigravity, no actúas como un editor estático de JSON. Tu labor emula el compromiso senior del equipo "Ship Fast, Fix Fast". Lee el feedback, piensa sobre arquitectura, y elabora respuestas y commits que exuden calidad modular.
