# MACCELL CRM

ERP/CRM para ventas, caja, reparaciones, stock por sucursal, facturación AFIP/ARCA y asistencia técnica Cerebro.

Next.js 15 App Router, React 19, TypeScript, Tailwind 4/shadcn, PostgreSQL y Prisma 6. La lógica de servidor vive en Server Actions y rutas API del mismo proyecto. Docker genera una aplicación standalone.

## Empezar

Requisitos: Node >=20, npm y PostgreSQL de desarrollo configurado mediante `DATABASE_URL`. Prepará las variables locales sin publicar credenciales.

```bash
npm ci --legacy-peer-deps
npx prisma generate
npm run dev
```

El servidor usa HTTP en el puerto 3000. `npm run dev:https` es una alternativa para pruebas que requieren certificados locales.

No sincronices esquema ni ejecutes seeds automáticamente: confirmá que la base sea la de desarrollo y elegí la operación correspondiente. El contenedor de producción aplica las migraciones existentes al iniciar.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm test` | Tests de `src/__tests__` con Node test runner + tsx |
| `node --import tsx --test src/__tests__/<archivo>.test.ts` | Prueba puntual |
| `npx tsc --noEmit` | Type-check |
| `npx eslint <archivos>` | Lint acotado |
| `npm run lint` | Lint del proyecto |
| `npm run build` | Build; actualiza `public/version.txt` |
| `npm run start` | Servidor standalone ya generado |
| `npx prisma generate` | Prisma Client |

El build omite errores de tipos y ESLint por configuración actual. Verificación de código, UI y despliegue: [AGENTS.md](AGENTS.md).

## Navegación

| Tema | Entrada |
| --- | --- |
| Estructura, reglas, comandos y verificación | [AGENTS.md](AGENTS.md) |
| Uso de agentes, referencias actuales e históricas | [Agent tooling](docs/agent-tooling.md) |
| Biblioteca PDF/PCBE e índices | [Arquitectura](docs/schematics-architecture.md) |
| Nuevas tandas de esquemáticos | [Ingesta](docs/schematics-ingestion-runbook.md) |
| Workbench del técnico | [Esquemáticos](docs/schematics-technician.md) |
| Cerebro RAG V2 | [Runbook](docs/cerebro-rag-runbook.md) |
| Inferencia local y visión | [Inferencia](docs/cerebro-local-inference.md) |
| Uploads persistentes | [Almacenamiento](docs/uploads-storage.md) |
| Pendientes para corroborar | [Deuda técnica](docs/technical-debt-roadmap.md) |

Los runbooks incluyen snapshots e incidentes fechados; verificá en vivo los servicios, montajes y proveedores antes de operar. Las variables de facturación, IA, workers y almacenamiento deben revisarse en el módulo correspondiente y en la configuración del entorno.

## Infraestructura

`Dockerfile`: Node 20 slim, generación de Prisma y worker técnico durante build. `scripts/start-with-technical-worker.sh`: migraciones, importación complementaria, worker opcional y servidor. Las imágenes usan `upload/`; la biblioteca técnica usa el montaje operativo documentado en su runbook.

El deploy del CRM se gestiona mediante `dokploy_maccell`; la guía antigua de Easypanel es histórica.

Software privado de MACCELL.
