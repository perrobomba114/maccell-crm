# MACCELL CRM

Sistema integral para operaciones de MACCELL: ventas, caja, reparaciones, stock multi-sucursal, facturación AFIP/ARCA, reportes y asistencia técnica con Cerebro AI.

Este README es la entrada rápida del proyecto. Las reglas obligatorias para agentes y desarrollo diario viven en:

- [AGENTS.md](./AGENTS.md): contrato operativo resumido.
- [AGENT.md](./AGENT.md): contexto histórico y patrones del repo.
- [.claude/claude.md](./.claude/claude.md): guía equivalente para Claude.
- [.agents/skills/maccell/SKILL.md](./.agents/skills/maccell/SKILL.md): skill activa para agentes.
- [docs/agent-tooling.md](./docs/agent-tooling.md): Codex, Claude, skills y MCP recomendados.
- [docs/technical-debt-roadmap.md](./docs/technical-debt-roadmap.md): checklist vivo de deuda técnica.

## Estado Actual

MACCELL CRM es un producto en producción con ritmo de iteración alto. El sistema funciona como ERP/CRM operativo, pero tiene deuda técnica conocida en seguridad de rutas API, TypeScript, tests críticos, polling, estados mágicos de reparación, AFIP y Cerebro AI.

Antes de sumar features grandes, priorizar el roadmap de deuda:

```bash
open docs/technical-debt-roadmap.md
```

## Stack

| Área | Tecnología |
| --- | --- |
| Framework | Next.js 15 App Router, React 19 |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL con Prisma ORM |
| UI | Tailwind CSS v4, shadcn/ui, Recharts, Lucide |
| Formularios | React Hook Form, Zod |
| AI | Groq, OpenRouter fallback, Vercel AI SDK |
| RAG | Xenova embeddings 384 dims, pgvector/fallback |
| Facturación | AFIP/ARCA |
| Impresión | Tickets térmicos, Zebra/ZPL |
| Infra | Docker, Dokploy, `output: "standalone"` |

## Módulos

| Módulo | Ruta principal | Responsabilidad |
| --- | --- | --- |
| Admin | `src/app/admin` | KPIs, caja, gastos, facturas, usuarios, backups, reportes |
| Vendor | `src/app/vendor` | POS, ventas, recepción de equipos, stock de sucursal |
| Technician | `src/app/technician` | Cola de trabajo, diagnóstico, repuestos, historial técnico |
| Repairs | `src/actions/repairs`, `src/components/repairs` | Ciclo completo de reparación y trazabilidad |
| Stock | `src/actions/stock*`, `src/actions/transfers` | Inventario, repuestos, transferencias multi-sucursal |
| Cerebro | `src/lib/cerebro*`, `src/app/api/cerebro` | Asistente AI, RAG, wiki técnica, schemáticos |
| Public | `src/app/estado`, `src/app/api/public` | Seguimiento público por QR y pantallas digitales |

## Requisitos

- Node.js 20 recomendado.
- npm.
- PostgreSQL accesible por `DATABASE_URL`.
- Variables de entorno de AFIP/ARCA si se prueba facturación.
- Usar `--legacy-peer-deps` si npm encuentra conflictos por React 19.

## Instalación Local

```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run dev
```

El script `dev` actual usa HTTPS experimental y desactiva verificación TLS para desarrollo:

```bash
NODE_TLS_REJECT_UNAUTHORIZED='0' next dev --experimental-https -p 3000
```

No usar ese patrón como referencia para producción.

## Variables de Entorno

Mínimas para levantar el sistema:

```env
DATABASE_URL="postgresql://usuario:password@host:5432/maccell"
NEXTAUTH_SECRET="cambiar-en-produccion"
NEXTAUTH_URL="http://localhost:3000"
CRON_SECRET="secreto-para-crons"
```

AFIP/ARCA:

```env
AFIP_CERT="certificado-base64-o-path"
AFIP_KEY="clave-privada-base64-o-path"
AFIP_CUIT="CUIT"
AFIP_PRODUCTION="false"

# Opcional para entidad 8BIT
AFIP_CERT_8BIT="..."
AFIP_KEY_8BIT="..."
AFIP_CUIT_8BIT="..."
```

AI:

```env
GROQ_API_KEY_1="..."
GROQ_API_KEY_2="..."
OPENROUTER_API_KEY="..."
```

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor local con HTTPS experimental |
| `npm run dev:clean` | Limpia `.next` y levanta dev |
| `npm run build` | Build standalone de Next |
| `npm run start` | Ejecuta `.next/standalone/server.js` |
| `npm run lint` | ESLint completo |
| `npx tsc --noEmit` | Type-check real |
| `npx prisma generate` | Genera Prisma Client |
| `npx prisma db push` | Sincroniza schema en desarrollo |
| `npm run wiki:sync` | Seed/sync de wiki desde reparaciones |
| `npm run wiki:reindex` | Reindex de reparaciones para RAG |

Importante: hoy `npm test` no existe en `package.json`. Agregar Vitest es una deuda P0 documentada.

## Verificación Antes de Cerrar Cambios

`npm run build` no alcanza como señal de producción porque `next.config.ts` todavía ignora errores de TypeScript y ESLint. Usar:

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Si el script no se puede usar, correr como mínimo:

```bash
npx tsc --noEmit
git diff --check
CHANGED_TS="$( { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then
  printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet
fi
npm run build
```

Si existe `npm test`, correrlo antes y después de tocar código crítico.

## Agentes, Skills y MCP

Este proyecto incluye tooling para trabajar con Codex y Claude sin duplicar reglas:

- Codex usa las skills versionadas en `.agents/skills/`.
- Claude usa `.claude/claude.md`, que apunta a la misma skill principal de MACCELL.
- MCPs recomendados y plantillas locales están documentados en [docs/agent-tooling.md](./docs/agent-tooling.md).

Skills principales:

| Skill | Ruta | Uso |
| --- | --- | --- |
| `maccell` | `.agents/skills/maccell/SKILL.md` | Reglas del proyecto |
| `frontend-design` | `.agents/skills/frontend-design/SKILL.md` | UI y experiencia visual |
| `vercel-react-best-practices` | `.agents/skills/vercel-react-best-practices/SKILL.md` | React/Next.js |
| `vercel-react-view-transitions` | `.agents/skills/vercel-react-view-transitions/SKILL.md` | Animaciones/transiciones |
| `find-skills` | `.agents/skills/find-skills/SKILL.md` | Descubrir skills extra |

No commitear configs MCP con secretos. Usar variables de entorno locales para tokens.

## Reglas De Oro

1. No agregar `console.log` en `src/actions`, `src/lib` ni backend.
2. Toda API privada debe validar sesión antes de leer body, DB, AI keys o archivos.
3. No usar `any` ni `as any` en archivos tocados salvo frontera inevitable con `TECH_DEBT`.
4. Usar `src/lib/date-utils.ts` para Argentina UTC-3. No reimplementar offsets.
5. No usar números mágicos para estados de reparación. Crear/usar constantes.
6. Stock concurrente siempre con transacciones y verificación optimista.
7. Fire-and-forget siempre loggea errores. Prohibido `.catch(() => {})`.
8. No agregar código a archivos de más de 300 líneas sin dividir responsabilidad.
9. Tests obligatorios para dinero, fechas, estados, stock, AFIP, AI fallback e impresoras.
10. Cerebro AI no debe mezclar marcas ni exponer precios internos.

## Estados De Reparación

Usar constantes compartidas, no números directos:

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

Nota crítica: `PAUSED` es `4`. No tratarlo como listo o entregado.

## Arquitectura De Datos

Entidades principales:

- `Branch`: sucursales, prefijos de tickets, aislamiento operativo.
- `User`: roles `ADMIN`, `VENDOR`, `TECHNICIAN`.
- `Customer`: clientes asociados a ventas/reparaciones.
- `Repair`: dispositivo, diagnóstico, estado, técnico, garantía e historial.
- `RepairStatusHistory`: auditoría de transición de estados.
- `Product`, `ProductStock`: productos y stock por sucursal.
- `SparePart`, `SparePartHistory`: repuestos e historial de movimientos.
- `Sale`, `SaleItem`, `SalePayment`, `SaleInvoice`: ventas, pagos, factura.
- `CashShift`, `Expense`: caja, cierres y gastos.
- `RepairKnowledge`, `RepairEmbedding`: wiki y RAG de Cerebro.

## Cerebro AI

Cerebro combina:

- Chat técnico con Groq.
- Fallback por OpenRouter.
- Wiki técnica colaborativa.
- RAG con embeddings Xenova.
- Búsqueda híbrida semántica + keyword.
- Schemáticos con límite de contexto.

Reglas críticas:

- Priorizar wiki/RAG sobre conocimiento general.
- No mezclar contexto entre marcas/plataformas.
- Detectar iOS/Android antes de mencionar ICs específicos.
- No mencionar precios internos.
- No usar `maxRetries` con Groq free tier.
- Procesar lotes con límites pequeños para evitar 429/OOM.

## POS, Caja y AFIP

Las áreas de dinero son críticas:

- Checkout debe mantener venta, pagos, stock y factura consistentes.
- AFIP debe fallar de forma visible, sin secretos en logs.
- Cierres de caja deben calcular gastos, efectivo, digital, ventas modificadas y premios con tests.
- Facturas A/B/C y consumidor final deben salir de datos reales, no hardcode.

## Stock y Reparaciones

Reglas de consistencia:

- Transferencias multi-sucursal con `$transaction`.
- Consumo y devolución de repuestos con historial.
- Nada de autorización por nombre de sucursal. Usar `branchId` y permisos.
- Toda transición de reparación registra historial.

## Frontend y UX

El sistema se usa en mostrador y taller, muchas veces desde celular. La UI debe ser densa, clara y operativa.

- Tablas grandes necesitan alternativa mobile.
- KPIs admin deben usar patrón visual uniforme.
- Recharts debe montarse con guard de cliente y contenedores con tamaño mínimo.
- No agregar polling manual si puede resolverse con SWR o un `usePolling` reutilizable.
- Componentes con muchos estados deben migrar a `useReducer` o dividirse.

## Deploy

- Docker debe usar `node:20-slim`, no Alpine.
- Prisma Client se genera en build time.
- Migraciones o `db push` corren en runtime según estrategia de deploy.
- Build Next usa `output: "standalone"`.
- Backups viven en filesystem con volumen persistente en Dokploy.

## Roadmap Funcional

Pendiente funcional declarado en README histórico:

- Integración con transportistas para seguimiento de envíos entre sucursales.
- Exportación avanzada a PDF/Excel con plantillas.
- Cámara/OCR para escaneo directo de piezas.

Antes de avanzar con eso, revisar [docs/technical-debt-roadmap.md](./docs/technical-debt-roadmap.md), especialmente P0.

## Contribución

Formato de commits preferido:

```bash
fix(cerebro): descripcion corta en minusculas
feat(pos): descripcion corta en minusculas
refactor(repairs): descripcion corta en minusculas
perf(admin): descripcion corta en minusculas
```

Scopes comunes: `cerebro`, `admin`, `repairs`, `pos`, `vendor`, `technician`, `statistics`, `deploy`.

La regla práctica: cambios chicos, verificables y con causa clara. Si se arregla deuda del roadmap, marcar el item correspondiente.

## Licencia

Software privado de MACCELL. Uso y redistribución no autorizados están prohibidos.
