# Ubicación canónica de cómics MARVEL

## Responsabilidad

Es la única skill que puede mover un medio desde staging hacia el árbol editorial. Trabaja con `/mnt/COMICS/catalog/marvel_library.sqlite` y con evidencia física actual.

## Precondiciones

- El origen existe y tiene manifiesto o procedencia verificable.
- El SHA-256 del origen está calculado.
- La identidad de `comic_request_items` o de la fila editorial correspondiente permite resolver serie, número y destino; año/volumen sólo son obligatorios cuando distinguen series o ediciones con el mismo título y número.
- Si algún dato esencial es ambiguo, dejar `needs_review` y no mover.
- `metadata_status='needs_metadata'` nunca es por sí solo un bloqueo de ubicación. Páginas, fecha, autores, editorial, URL y otros campos de enriquecimiento se completan después.

## Reglas de incorporación

- Resolver el destino contra la taxonomía vigente: universo, bloque regular/evento y serie.
- Mantener el formato de carpeta `Vol. NN` cuando el catálogo lo requiera.
- Mantener nombres de archivo existentes cuando ya sean correctos; no usar `ComicInfo.xml`.
- No sobrescribir. Si el destino existe, comparar SHA: igual significa `duplicate`/archivo ya ubicado; distinto significa `needs_review`.
- Crear manifiesto de operación antes de mover, ejecutar el movimiento, comprobar origen ausente, destino presente, tamaño y SHA, y recién entonces actualizar SQLite.

## Estados

Tras la copia verificada: `files.location_status='located'` y solicitud `workflow_status='located'`, aunque `metadata_status='needs_metadata'`. Sólo cuando identidad, destino, integridad y los metadatos editoriales mínimos estén verificados se permite `metadata_status='complete'` y `workflow_status='complete'`.

`99 - PEDIDO/FALTANTES` es staging, no destino editorial final.
