# Cerebro GPU Embeddings Design

## Objetivo

Acelerar la indexación inicial y posterior del RAG de Cerebro usando las dos RTX 3090 del host Tailscale `100.71.184.125`, sin trasladar PDFs ni abrir acceso externo a PostgreSQL.

## Arquitectura

- El servidor MACCELL conserva `/mnt/data2`, la base RAG y la extracción/chunking de PDFs.
- El host GPU ejecuta dos instancias BGE-M3, una por RTX 3090, detrás de un balanceador privado.
- Los workers MACCELL envían lotes de texto por HTTP sobre Tailscale y reciben vectores normalizados de 1024 dimensiones.
- Cada petición lleva un secreto interno. El servicio escucha solo en la IP Tailscale.
- Si el servicio remoto no responde, el worker usa el encoder CPU actual para no detener consultas ni sincronización.
- Los hashes y `index_schema_version` mantienen el proceso incremental e idempotente.

## Flujo

1. El worker descubre un PDF y valida su hash.
2. Extrae texto nativo; solo renderiza páginas que requieren OCR.
3. Fragmenta por página y envía los textos al endpoint GPU en lotes.
4. El servicio GPU produce embeddings BGE-M3 normalizados.
5. MACCELL valida cantidad, dimensiones y valores finitos antes de insertar.
6. PostgreSQL guarda páginas, chunks y vectores en una transacción.

## Operación inicial

La instancia `llama-server` existente usa ambas GPU. Se detendrá de forma reversible durante la carga inicial para liberar VRAM y se iniciará otra vez al terminar. No se eliminarán contenedores, volúmenes ni configuración.

## Seguridad

- Ninguna contraseña o URL de base se instala en el host GPU.
- El endpoint se enlaza a Tailscale y requiere `Authorization: Bearer`.
- Los logs no almacenan textos, vectores, secretos ni datos del CRM.
- El cliente fija timeout, valida respuestas y aplica fallback CPU.

## Éxito verificable

- Las mismas entradas generan vectores válidos de 1024 dimensiones.
- Una GPU y luego ambas responden a health checks autenticados.
- El worker MACCELL usa GPU y sigue funcionando si el endpoint se interrumpe.
- La indexación aumenta documentos READY sin mezclar marcas ni modificar los PDFs.
- La IA existente vuelve a estado healthy al finalizar.

