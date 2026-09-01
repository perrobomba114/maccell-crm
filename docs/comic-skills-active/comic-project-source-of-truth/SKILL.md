# Fuente de verdad del proyecto de cómics

## Alcance

Aplica únicamente a la biblioteca MARVEL de MACCELL. El SQLite canónico es `/mnt/COMICS/catalog/marvel_library.sqlite`. La raíz física es `/mnt/COMICS`.

## Fuentes válidas

- `comic_request_items`: cola durable de pedidos, identidad normalizada y `workflow_status`.
- `files`: relación del archivo físico con su ruta canónica, hash y ciclo de ubicación/verificación. `canonical_path` puede estar almacenado relativo a `/mnt/COMICS` y con separadores `\\`; al verificar se normaliza a una ruta POSIX bajo esa raíz.
- El árbol físico: existencia, ruta, extensión, tamaño y SHA-256.
- Manifiestos y reportes fechados: evidencia, nunca sustituto del catálogo.

No leer ni recrear `PEDIDO.md`. No usar `ComicInfo.xml` para ordenar. No tomar informes antiguos, memoria del agente ni nombres de carpetas como prueba suficiente de identidad editorial.

## Estados operativos

Para solicitudes: `needs_download` → `staged` → `located` → `complete`. `located` significa archivo verificado y destino resuelto; no exige completar todos los metadatos.

Estados alternativos: `documented_complete` (pedido documentado como conseguido, sin afirmar verificación física), `needs_review`, `blocked`, `corrupt`, `duplicate`, `not_applicable`.

Para archivos: `download_status` indica recepción; `location_status` indica ubicación (`located` o `wrong_location`); `metadata_status` indica completitud editorial (`complete` o `needs_metadata`). El ciclo de archivo también admite `downloaded`, `staged`, `verified`, `located`, `complete`, `missing` y `wrong_location`. No marcar `complete` sólo porque el archivo exista.

## Taxonomía física vigente

- `01 - TIERRA-616`
- `02 - UNIVERSO ULTIMATE`
- `03 - UNIVERSOS ALTERNATIVOS`
- `04 - MARVEL ZOMBIES`
- `90 - MATERIAL NO CRONOLOGICO`
- `99 - PEDIDO` sólo staging, reportes y auxiliares.

Las series regulares usan `YYYY.900 - Series regulares`; los eventos usan su bloque editorial, por ejemplo `1985.010 - Secret Wars II`. La clave numérica del nombre de archivo puede ser orden de lectura y no necesariamente número editorial.

## Reglas

- SQL primero; no repetir búsquedas externas si ya existe identidad o caché suficiente.
- No sobrescribir archivos ni resolver colisiones por intuición.
- No mover un archivo sin comparar origen, destino, tamaño y SHA-256.
- La falta de páginas, fecha, autores, editorial o URL no impide pasar de `staged` a `located`; sólo mantiene `metadata_status='needs_metadata'`.
- Una acción parcial debe dejar estado y error explicable en SQLite.
