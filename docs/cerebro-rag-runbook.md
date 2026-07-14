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

- `worker`: API interna de salud, embeddings BGE-M3 y entrega autenticada de PDF.
- `ingestion`: reconstruye el histórico y luego indexa todo el inventario PDF. Es idempotente; después de un reinicio omite versiones `READY` con el mismo SHA-256.
- `maccell-rag-db`: almacena documentos, páginas, chunks, embeddings de 1.024 dimensiones, jobs y feedback.

## Comprobaciones

1. Confirmar que `worker` e `ingestion` estén activos en el Compose.
2. Consultar logs de `ingestion`: cada PDF informa `INDEXED`; el final informa `SUMMARY`.
3. Verificar en RAG que todos los embeddings tengan `vector_dims(embedding) = 1024`.
4. Verificar que las reparaciones se clasifiquen como `CONFIRMED_SUCCESS`, `INCOMPLETE` o `FAILED`.
5. Probar `/api/cerebro-v2/chat` y `/api/cerebro-v2/documents/:id` con una sesión ADMIN/TECHNICIAN; sin sesión deben devolver `401`.

## Recuperación y rollback

- La base principal no recibe escrituras del worker; su rol tiene `default_transaction_read_only=on` y permisos `SELECT` acotados.
- Detener el servicio `ingestion` no afecta al CRM ni elimina lo ya indexado.
- Para volver temporalmente al código anterior, seleccionar la rama estable en la aplicación MACCELL y desplegarla. La base RAG aislada puede permanecer encendida.
- Antes de cambios de esquema, generar un backup nuevo. No restaurar sobre la base principal para resolver problemas del RAG.

## Rotación de secretos

Rotar por separado credenciales PostgreSQL, secreto interno del worker, claves Groq/OpenRouter y token del repositorio. La clave privada y certificado AFIP requieren una ventana coordinada porque su cambio puede interrumpir facturación.
