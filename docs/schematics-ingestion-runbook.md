# Runbook: subir y sincronizar PDF/PCBE desde SCRAPING

Este runbook es la guía humana de la skill [`schematic-library-ingestion`](../.agents/skills/schematic-library-ingestion/SKILL.md). Aplica a las tandas nuevas de PDF, PCBE y PCB descargadas desde SCRAPING.

## Fuentes y destinos confirmados

- Fuente: carpeta local de descargas de SCRAPING, que debe descubrirse en cada tanda.
- Almacenamiento físico del servidor: `/mnt/data2`.
- FileBrowser: publica ese mismo almacenamiento; no es otra copia.
- Aplicación CRM: `sistema.maccell.com.ar`.
- Montaje conocido en la aplicación: `/mnt/data2` se monta como `/app/upload/schematics/sources`.
- El catálogo y los índices técnicos se resuelven mediante `SCHEMATICS_ROOT` y PostgreSQL. Comprobar la variable y los mounts actuales antes de modificar datos.

## Orden correcto

1. Subir a `.incoming-scraping/<lote>`.
2. Calcular SHA-256 y generar manifiesto.
3. Comparar contra toda la biblioteca.
4. Normalizar una única carpeta por marca/modelo y separar `Pdf`/`Pcbe`.
5. Mover sólo archivos nuevos y conservar colisiones con variante.
6. Actualizar catálogo.
7. Ejecutar/revisar worker técnico.
8. Ejecutar/revisar vectores RAG.
9. Verificar FileBrowser, búsqueda y navegación PDF/PCBE.
10. Conservar el manifiesto y limpiar staging sólo con aprobación.

## Criterio de duplicado

El hash SHA-256 del contenido es la regla principal. El nombre, tamaño, modelo o carpeta no sustituyen al hash. Un archivo idéntico se omite; un archivo con el mismo nombre y otro contenido no se elimina ni se sobrescribe.

## Componentes del sistema

| Etapa | Fuente de verdad | Herramienta |
| --- | --- | --- |
| Archivos | `/mnt/data2` | FileBrowser/SSH |
| Catálogo | `catalog.json` o `schematics.assets`, según `SCHEMATICS_ROOT` | `scripts/import-schematics.ts` |
| Texto PDF | `schematics.pages` y `.index` | importador/worker |
| PCBE y referencias | `schematics.technical_indexes` y `.technical` | `scripts/technical-worker.cjs` |
| Embeddings | base RAG `schematics.chunks` | `scripts/index-schematics-vectors.mjs` |

## Diagnóstico rápido

- FileBrowser no muestra una carpeta: comprobar que se creó bajo `/mnt/data2`, que el mount apunta al mismo volumen y que el usuario del contenedor tiene permisos. No volver a subirla a otra ruta.
- El catálogo ve el archivo pero el visor no: comprobar `relativePath`, `SCHEMATICS_ROOT`, existencia física y SHA.
- PDF visible pero sin búsqueda: comprobar `schematics.pages`, `.index` y el estado del worker.
- PCBE visible pero sin componentes: revisar que el parser reconozca el encabezado/geometría; renombrar `.pcb` a `.pcbe` no lo hace válido.
- PDF y PCBE no se vinculan: validar identidad desde Inspector; una carpeta común no alcanza.
- RAG no responde pero la búsqueda textual sí: revisar embeddings y `RAG_WORKER_URL`; no borrar el índice textual.

## Cierre de una tanda

El cierre debe incluir los conteos de archivos nuevos, duplicados exactos, colisiones, bloqueados/no soportados, assets catalogados, trabajos técnicos indexados/pendientes y chunks vectoriales creados/cacheados. Si falta alguno de esos datos, la tanda queda abierta.
