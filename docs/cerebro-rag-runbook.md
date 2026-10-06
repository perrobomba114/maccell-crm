# Cerebro RAG V2 — Runbook operativo

## Alcance

Cerebro V2 es un asistente exclusivamente técnico para usuarios `ADMIN` y `TECHNICIAN`. Usa una base PostgreSQL/pgvector aislada, el histórico de reparaciones en modo solo lectura y la biblioteca PDF montada como solo lectura desde `/mnt/ESQUEMATICO`.

## Recursos Dokploy

- Proyecto: `Zfo4YNibjFdb3eqmD1enP`
- Entorno: `ct2CisxOIkYdaQcSguWyh`
- Aplicación MACCELL: `Jy-KdfLzVGln7_RK0R44Y`
- PostgreSQL principal: `cZ6DmTbyOXf3CZGKWa_9b`
- PostgreSQL RAG: `R3jmUz97PkAUaWdNAUpon`
- Compose worker/ingesta: `RO-s6cmzXRltuohAZpOrQ`

No guardar contraseñas, tokens ni certificados en este documento.

## Servicios y código responsable

| Capa | Función | Código/configuración |
| --- | --- | --- |
| CRM Next.js | Permisos, chat, recuperación híbrida, consultas RAG y proxy PDF | `src/lib/cerebro-v2`, `src/app/api/cerebro-v2` |
| PostgreSQL principal `maccell` | Operación comercial y reparaciones; fuente del lector RAG | `prisma/schema.prisma`, `prisma/migrations` |
| PostgreSQL `maccell-rag-db` | Documentos, versiones, páginas, chunks/vector, jobs, alias, chats y feedback | `services/cerebro-rag-worker/src/cerebro_rag/schema.sql`, `migrations.py`; migraciones adicionales en ese servicio |
| `worker` Python/FastAPI | API interna de embeddings BGE-M3 y PDF/páginas, puerto 8080 | `services/cerebro-rag-worker/src/cerebro_rag/server.py`, `embeddings.py`, `page_renderer.py` |
| `ingestion-sequential` | Inventario PDF, extracción/OCR, chunks, versiones por SHA e indexación | `cli.py`, `pdf_inventory.py`, `indexer.py`, `document_versions.py` |
| `repair-sync` | Lee reparaciones incrementales, evalúa calidad e indexa versiones RAG cada 300 segundos | `repair_sync.py`, `repair_cursor.py`, `repair_indexer.py`, `repair_quality.py` |
| Índice técnico Node | Catálogo físico, PCBE, componentes/redes y jobs técnicos; separado del embedding PDF | `scripts/index-technical-library.ts`, `technical-worker-queue.ts`, `src/lib/schematics` |
| MinIO | Destino S3 local de backups Dokploy; no almacena embeddings ni sustituye la biblioteca | recurso `maccell-backup-minio` |

Compose CPU: `infra/cerebro-rag/docker-compose.yml`. El perfil `maintenance-indexing` declara `ingestion-0` a `ingestion-8`; su presencia en el archivo no significa que estén ejecutándose. `technical-indexer` también está declarado y debe verificarse separadamente. Las variantes GPU y de inferencia local están en `infra/cerebro-rag-gpu` y `infra/cerebro-local-ai`; su existencia en Git no acredita que estén activas.

### Conexiones y almacenamiento

- CRM: `DATABASE_URL` para Prisma; `RAG_DATABASE_URL` para el pool `pg` de `rag-db.ts`; `RAG_WORKER_URL` (default interno `http://maccell-rag-worker:8080`) y `RAG_INTERNAL_API_SECRET` para el worker.
- Python: `SOURCE_DATABASE_URL` para lectura de reparaciones, `RAG_DATABASE_URL` para persistencia RAG y `INTERNAL_API_SECRET` para endpoints internos. No intercambiar secretos o URLs por el parecido de los nombres.
- Worker: `/mnt/ESQUEMATICO` → `/library:ro`; `/var/lib/maccell/rag-pages` → `/page-cache`; `/var/lib/maccell/rag-models` → `/model-cache`.
- CRM: `/var/lib/maccell/upload` → `/app/upload`; `/mnt/ESQUEMATICO` → `/app/upload/schematics/sources`.
- RAG: volumen `postgres-copy-open-source-pixel-9km3at-data` → `/var/lib/postgresql/data`. Principal: bind `/var/lib/maccell/postgres_data` → `/var/lib/postgresql/data`.

### Flujo de consulta

Next.js autoriza al usuario, solicita un embedding de 1.024 dimensiones por `/internal/embed`, consulta RAG con búsqueda vectorial/keyword y filtros de marca/modelo/alias, selecciona evidencia y usa el routing de generación. El modelo de embeddings y el modelo que redacta la respuesta son funciones diferentes. Los PDFs/páginas se entregan por el proxy autorizado del CRM y los endpoints internos del worker.

Los originales PDF, catálogo, índices técnicos y documentos RAG no son intercambiables. Una corrección de identidad/catálogo no exige automáticamente reextraer PDFs o reconstruir embeddings.

### Snapshot de lectura MCP — 2026-09-29

Verificado mediante `dokploy_maccell`, sin cambios en producción:

- Los cinco recursos del proyecto aparecen en estado Dokploy `done`.
- Contenedores Compose activos: `worker`, `ingestion-sequential`, `repair-sync` (Up 6 days). CRM y PostgreSQL RAG tienen una tarea Swarm actual `running`; las tareas antiguas `shutdown` son historial.
- Docker inspect confirma montaje `/library` de solo lectura en worker e ingesta, cachés persistentes y cero reinicios de esos dos contenedores.
- Logs de repair-sync muestran ciclos recientes `REPAIR_SYNC indexed=... skipped=...`, con registros nuevos indexados y sin fallo en la muestra de 15 líneas. No acredita el estado de toda la historia ni los permisos efectivos de cada tabla.
- Última muestra de ingesta: `FAILED 5762 type=RuntimeError ready=5600 failed=162` a las 21:33 UTC. Son contadores de esa ejecución, no conteos de documentos únicos en DB. No se observó `SUMMARY` en la muestra y no se comprobó cobertura completa.
- Worker: arranque Uvicorn en puerto 8080 y `ALIASES cataloged=793` en logs del 23 de septiembre; no se ejecutó una consulta autenticada de diagnóstico en esta auditoría.
- PostgreSQL principal tiene backup Dokploy habilitado hacia MinIO, retención configurada de 1 y ejecución del 29 de septiembre `done`. No se probó restauración ni se verificaron objetos S3. PostgreSQL RAG devuelve `backups: []`; no presupongas respaldo de chats/feedback por el backup del CRM.
- MCP oculta `env` y `composeFile`. Se verificaron servicios declarados en cache, procesos/mounts vía Docker y configuración local; URLs efectivas de DB, proveedores remotos/GPU y permisos SQL no quedaron verificados en vivo.

Revalidá el snapshot antes de operar. No uses los IDs efímeros de contenedor como instrucciones permanentes: resolvelos desde el appName/compose actual.

### Permisos de `repair-sync`

La lectura de `repairs`, estados, observaciones, repuestos e historial es
obligatoria y debe conservarse como acceso `SELECT` de solo lectura. La tabla
`repair_learning_records` es enriquecimiento opcional: si el rol todavía no
tiene `SELECT`, el worker debe emitir `REPAIR_SYNC_DEGRADED` y usar la consulta
sin ese bloque, sin detener la indexación principal.

La limpieza de versiones RAG asociadas a reparaciones activas también es
opcional. Si el rol no tiene permiso para retirar esas versiones, el worker
debe informar `optional=active_repair_retirement` y continuar con el cursor y
la indexación. `REPAIR_SYNC_FAILED` queda reservado para errores de lectura
obligatoria, cursor, escritura RAG o embeddings.

## Comprobaciones

1. Resolver los contenedores actuales del Compose y confirmar `worker`, `ingestion-sequential` y `repair-sync`; distinguir los shards de mantenimiento declarados de los activos.
2. Consultar logs de la ingesta activa: `INDEXED`/`FAILED` informan avance y `SUMMARY` el final; investigar fallos sin confundir esos contadores con cobertura única de DB.
3. Verificar en RAG que todos los embeddings tengan `vector_dims(embedding) = 1024`.
4. Verificar que las reparaciones se clasifiquen como `CONFIRMED_SUCCESS`, `INCOMPLETE` o `FAILED`.
5. Verificar el job `REPAIR_SYNC/main`: estado `READY`, cursor creciente y sin `error_message`. Un `REPAIR_SYNC_DEGRADED` opcional debe quedar explicado; no debe repetirse un `REPAIR_SYNC_FAILED` por `InsufficientPrivilege`.
6. Probar `/api/cerebro-v2/health`, sesiones, chat y página PDF con una sesión ADMIN/TECHNICIAN; sin sesión deben devolver `401`.
7. Confirmar que no existan rutas `/api/cerebro/knowledge`, `/schematics`, `/summarize`, `/tokens` ni `/chat`.

## Persistencia de chats

- `rag_chat_sessions` y `rag_chat_messages` son las únicas tablas consumidas por la interfaz nueva.
- Toda lectura, edición y eliminación está acotada por `user_id`.
- Las tablas antiguas del CRM no se migran ni se borran; quedan fuera del runtime y requieren autorización separada para una eliminación física.
- El identificador `(session_id, client_message_id)` hace idempotente cada turno.

## Recuperación y rollback

- La base principal no recibe escrituras del worker; su rol tiene `default_transaction_read_only=on` y permisos `SELECT` acotados.
- Detener `ingestion` o `repair-sync` no afecta al CRM ni elimina lo ya indexado.
- Para rollback, desplegar el commit estable anterior desde `main`. La base RAG aislada puede permanecer encendida. Conservá chats y feedback; una reconstrucción documental no justifica borrar toda la base.
- Antes de cambios de esquema, generar un backup nuevo. No restaurar sobre la base principal para resolver problemas del RAG.

## Rotación de secretos

Rotar por separado credenciales PostgreSQL, secreto interno del worker, claves Groq/OpenRouter y token del repositorio. La clave privada y certificado AFIP requieren una ventana coordinada porque su cambio puede interrumpir facturación.

## Calidad de antecedentes y cierres (2026-09-09)

La migración `20260909123000_grant_rag_reader_learning_records` completa el
`SELECT` sobre cierres técnicos del rol existente `rag_reader`, únicamente si
ese rol ya puede leer `repairs`. No crea usuarios ni concede escrituras.
Después del deploy, comprobar en logs de `repair-sync` que ya no aparezca
`permission_denied optional=repair_learning_records`.

La política de calidad 2 reinicia una vez el cursor histórico. Cada lote procesa
16 registros con límite de una CPU; el cursor se confirma entre lotes. No
reiniciar el job para acelerar la pasada. Esperar `REPAIR_SYNC indexed=...`
sin error para acreditar el fin de la pasada. El fingerprint de calidad vuelve
a evaluar aprobaciones/revocaciones aunque no cambie el texto técnico.
