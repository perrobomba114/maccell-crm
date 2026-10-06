# MACCELL CRM — instrucciones de trabajo

Entrada operativa única para agentes. Leé solo el código y las referencias del tema solicitado; no cargues todo el historial ni todas las skills al comenzar. Si una guía histórica contradice el código actual, verificá la implementación y el entorno afectado.

## Git: trabajar únicamente en main

- Todos los cambios se realizan directamente en `main`. No crear ramas de trabajo ni worktrees con otra rama, salvo una instrucción explícita posterior del usuario.
- Antes de editar o confirmar cambios, comprobar `git branch --show-current`. Si no es `main`, conservar el trabajo existente e integrarlo en `main` sin sobrescribir cambios ajenos.
- Publicar en `origin/main` cuando el usuario lo solicite. No hacer force-push ni reescribir el historial compartido.
- Las referencias históricas a ramas, PRs o worktrees no modifican esta regla.

## Mapa del proyecto

Aplicación Next.js 15 App Router, React 19, TypeScript, Tailwind 4/shadcn y PostgreSQL/Prisma 6. No es un backend NestJS separado.

| Área | Dónde empezar |
| --- | --- |
| Pantallas por rol | `src/app/admin`, `src/app/vendor`, `src/app/technician` |
| Seguimiento público | `src/app/estado`, `src/app/api/public` |
| UI compartida | `src/components`, `src/hooks`, `src/app/globals.css` |
| Operaciones de negocio | `src/actions`: `repairs`, `pos`, `sales`, `cash-shifts`, `products`, `transfers`, `spare-parts`, `dashboard`, `statistics`; también existen archivos de acciones en la raíz |
| Autenticación y permisos | `src/actions/auth-actions.ts`, `src/middleware.ts`; comprobá además las guards de la acción/ruta |
| Datos | `prisma/schema.prisma`, `prisma/migrations`, `src/lib/db.ts` |
| Estados de reparación | `src/lib/repairs/status.ts`, `src/lib/repairs/status-sets.ts`; no copies mapas numéricos de documentos viejos |
| Fechas | `src/lib/date-utils.ts` |
| Cerebro actual | `src/lib/cerebro-v2`, `src/app/api/cerebro-v2`; seguí los imports antes de modificar módulos legacy `cerebro*` |
| Proveedores IA | `src/lib/cerebro-v2/model-routing.ts`, `provider-selection.ts`, `src/lib/groq.ts`; diagnóstico también en `src/lib/repair-diagnosis-enhancement.ts` |
| Biblioteca técnica | `src/lib/schematics`, `src/app/api/schematics`, `scripts/technical-worker-queue.ts`, `scripts/index-technical-library.ts` |
| Worker RAG Python | `services/cerebro-rag-worker/src/cerebro_rag`, su `AGENTS.md`, `pyproject.toml` y `tests` |
| Infra RAG e inferencia | `infra/cerebro-rag/docker-compose.yml`, `infra/cerebro-rag-gpu`, `infra/cerebro-local-ai` |
| Pruebas | `src/__tests__`, `scripts/run-tests.mjs`; pruebas operativas adicionales en `scripts/tests` |
| Despliegue | `Dockerfile`, `scripts/start-with-technical-worker.sh`, `next.config.ts` |

## Servicios de producción y límites del RAG

Dokploy MACCELL contiene CRM, PostgreSQL `maccell`, PostgreSQL aislado `maccell-rag-db`, Compose `maccell-rag-worker` y MinIO de backups. Identificadores y snapshot verificado por MCP: `docs/cerebro-rag-runbook.md`.

El CRM usa Prisma para la base principal y `pg`/`RAG_DATABASE_URL` para RAG. El worker Python sirve embeddings/PDF; `ingestion-sequential` indexa PDFs y `repair-sync` sincroniza reparaciones. El índice técnico Node para PCBE/catálogo es otra capa. No confundas sus jobs, migraciones ni bases.

Ante cambios de RAG, verificá Compose declarado, contenedores realmente activos, mounts y logs con `dokploy_maccell`. Un recurso `done`, un contenedor `running` o un `/health` exitoso no prueban cobertura completa ni recuperación útil. No inicies shards, reinicies cursores ni reconstruyas índices como diagnóstico rutinario. La base RAG contiene también chats y feedback: no es íntegramente descartable.

## Comandos verificados en el repositorio

Node >=20 y npm con `package-lock.json`. Desde la raíz:

- Instalar: `npm ci --legacy-peer-deps` (el postinstall aplica `scripts/patch-sdk.js`).
- Generar cliente: `npx prisma generate`.
- Desarrollo: `npm run dev` (HTTP, puerto 3000). HTTPS solo con `npm run dev:https` y certificados locales preparados.
- Tests completos: `npm test` usa Node test runner + tsx, no Vitest.
- Test puntual: `node --import tsx --test src/__tests__/<archivo>.test.ts`.
- Tipos: `npx tsc --noEmit`; lint puntual: `npx eslint <archivos-tocados>`.
- Build: `npm run build`; modifica `public/version.txt`. `npm run start` requiere `.next/standalone/server.js`.
- Whitespace: `git diff --check`.

No ejecutes `prisma db push`, migraciones, seeds o scripts de reparación de datos como preparación rutinaria: comprobá primero qué base y entorno usarán. Producción aplica `prisma migrate deploy` al arrancar el contenedor.

## Contratos importantes

- Acciones y rutas privadas validan usuario, rol y sucursal antes de acceder a datos. Usá `branchId`, no nombres de sucursal. Rutas públicas, cron y workers conservan su mecanismo propio de autenticación.
- Dinero, pagos, stock y repuestos deben mantener consistencia transaccional y trazabilidad. Las transiciones de reparación conservan su historial.
- Usá constantes compartidas para estados y helpers de fechas de Argentina. No derives reglas de números copiados ni offsets nuevos.
- Uploads dinámicos van a `upload/` y se sirven por `/api/uploads/...`; `public/` contiene estáticos versionados.
- Cerebro conserva aislamiento por marca/modelo, evidencia verificable y privacidad de precios internos. No inventes mediciones ni procedimientos al mejorar la redacción de un diagnóstico.
- Conservá la prioridad Qwen/Groq del flujo de diagnóstico y sus fallbacks; chat, visión e inferencia local tienen routing propio. Verificá el flujo concreto, no asumas un proveedor universal.
- La biblioteca física operativa es `/mnt/ESQUEMATICO` (disco de 4 TB, UUID `fa0a1b6a-f35b-49ab-820d-49d86c4d1d17`), montada en el contenedor como sources; verificá el montaje en vivo antes de operar. No crees otro destino ni elimines originales. Catálogo, índice técnico, RAG y visor son capas distintas.
- La biblioteca mantiene un único `/mnt/ESQUEMATICO/AGENTS.md`; `.CATALOGO` es oculto. Nuevas tandas: staging + `PUBLICAR.json` revisado; `technical-indexer --watch --intake` y RAG incremental. `CURSO` queda fuera de los índices. Consultá `docs/schematic-library-AGENT.md` antes de incorporar archivos.
- No expongas secretos ni agregues logs de datos sensibles, errores silenciados o casts para ocultar fallas de tipos. Limitá el cambio al pedido; el tamaño de un archivo por sí solo no obliga a refactorizarlo.

## Documentación por tarea

| Si el pedido trata de… | Consultá |
| --- | --- |
| PDF/PCBE, catálogo, vínculos o Workbench | `docs/schematics-architecture.md`; para uso del técnico, `docs/schematics-technician.md` |
| Ingesta o normalización de biblioteca | `docs/schematic-library-AGENT.md` (regla vigente), `.agents/skills/schematic-library-ingestion/SKILL.md`, `docs/schematics-ingestion-runbook.md` |
| RAG V2, sincronización, chat o recuperación | `docs/cerebro-rag-runbook.md` |
| Inferencia local o visión | `docs/cerebro-local-inference.md` |
| Conducta del diagnóstico técnico | `.agents/skills/cerebro-diagnostic-engine/SKILL.md` |
| Imágenes y almacenamiento | `docs/uploads-storage.md` |
| Deuda técnica explícitamente solicitada | Sección pertinente de `docs/technical-debt-roadmap.md`; corroborá cada pendiente |
| Historial de un cambio concreto | Buscá por tema en `AGENT.md` o `docs/superpowers/{specs,plans}`; son antecedentes, no workflows obligatorios |

## Ejecución y verificación

Trabajá con Codex nativo. Cambios pequeños se resuelven directamente; cambios complejos requieren un plan breve. Superpowers y agentes adicionales solo si el usuario los pide o autoriza. Skills de tecnologías se usan cuando aportan a la tarea, sin encadenarlas por defecto.

Para documentación: verificá rutas, comandos y `git diff --check`. Para código: tipos y lint pertinentes, tests del comportamiento afectado; agregá regresiones cuando cambies dinero, estados, stock, fechas, permisos o fallbacks críticos. Build cuando afectes compilación, dependencias, configuración o prepares despliegue. Ampliá las pruebas si el riesgo o los resultados lo justifican.

El build ignora errores de tipos y ESLint en `next.config.ts`: no reemplaza esas comprobaciones. El script `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build` sigue disponible como comprobación amplia; ejecuta toda la suite y no es obligatorio para cada edición.

Verificá el recorrido afectado: UI en navegador, persistencia, provider o worker según corresponda. No declares producción funcionando por un push o un build. Si el pedido incluye publicar en la rama desplegada, usá exclusivamente `dokploy_maccell`, comprobá commit y estado terminal, y verificá la revisión servida y el comportamiento. Si esa herramienta o acceso falta, reportá el bloqueo.

Cerrá con qué cambió, evidencia de verificación y pendientes reales. No conviertas deuda previa fuera del alcance en una refactorización general. No hagas commit, push ni despliegue por una tarea de documentación salvo pedido del usuario.
