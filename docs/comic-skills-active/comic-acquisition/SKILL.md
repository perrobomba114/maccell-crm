# Adquisición de cómics MARVEL

## Responsabilidad

Descargar sólo elementos de `comic_request_items` cuyo `workflow_status='needs_download'` y cuyo estado de pedido sea descargable (`faltante`, `descarga_pendiente`, `parcial` o `identificar`). Procesar lotes pequeños, como máximo 12 por ciclo.

## Flujo

1. Leer la cola SQL; nunca escanear `PEDIDO.md`.
2. Reutilizar identidad, año, volumen y número ya registrados. No inventar metadatos.
3. Buscar únicamente en los canales y fuentes autorizados por la configuración vigente. No consultar Internet para ordenar.
4. Descargar al buffer temporal de Hermes y validar extensión, firma básica, tamaño y SHA-256.
5. Antes de copiar, comprobar si el nombre ya existe en `/mnt/COMICS/99 - PEDIDO/FALTANTES/telegram-worker`. Si el SHA coincide, registrar el archivo como ya recibido; si difiere, marcar `needs_review` y no sobrescribir.
6. Copiar al staging persistente, verificar SHA remoto y escribir manifiesto de procedencia.
7. Sólo después de todo lo anterior, actualizar el item a `staged`, limpiar el buffer y registrar el resultado.

## Límites

Esta skill no mueve archivos a series finales, no modifica nombres editoriales, no borra duplicados y no marca `complete`. Un bloqueo de autenticación, almacenamiento o fuente se registra en `last_error` y no detiene los candidatos independientes.
