# Cerebro RAG V2 — Runbook operativo

## Alcance

Cerebro V2 es un asistente exclusivamente técnico para usuarios `ADMIN` y `TECHNICIAN`. Usa una base PostgreSQL/pgvector aislada, el histórico de reparaciones en modo solo lectura y la biblioteca PDF montada como solo lectura desde `/mnt/data2`.

## Recursos Dokploy

- Proyecto: `Zfo4YNibjFdb3eqmD1enP`
- Entorno: `ct2CisxOIkYdaQcSguWyh`
- Aplicación MACCELL: `Jy-KdfLzVGln7_RK0R44Y`
- PostgreSQL principal: `cZ6DmTbyOXf3CZGKWa_9b`
- PostgreSQL RAG: `R3jmUz97PkAUaWdNAUpon`
- Compose worker/ingesta: `RO-s6cmzXRltuohAZpOrQ`

No guardar contraseñas, tokens ni certificados en este documento.

## Servicios

- `worker`: API interna de salud, embeddings BGE-M3 y render autenticado de páginas PDF.
- `ingestion`: reconstruye el histórico y luego indexa todo el inventario PDF. Es idempotente; después de un reinicio omite versiones `READY` con el mismo SHA-256.
- `repair-sync`: consulta la base principal en modo solo lectura cada cinco minutos y versiona reparaciones nuevas o modificadas mediante cursor `(effective_updated_at, id)`.
- `maccell-rag-db`: almacena documentos, páginas, chunks, embeddings de 1.024 dimensiones, jobs, chats V2 y feedback.

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

1. Confirmar que `worker`, `ingestion` y `repair-sync` estén activos en el Compose.
2. Consultar logs de `ingestion`: cada PDF informa `INDEXED`; el final informa `SUMMARY`.
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
- Para rollback, desplegar el commit estable anterior desde `main`. La base RAG aislada puede permanecer encendida.
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
