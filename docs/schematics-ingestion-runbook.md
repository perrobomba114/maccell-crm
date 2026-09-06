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

## Incidente conocido: archivos invisibles por propietario `root`

En la tanda de `Iphone 17 pro max`, los archivos sí estaban físicamente en `/mnt/data2`, pero habían sido creados como `root:root`. FileBrowser usa otro usuario —en la corrección realizada, UID/GID `1000:1000`— y por eso no podía listarlos aunque la ruta existiera. No se solucionó subiendo una segunda copia: se corrigió propietario y permisos sobre las carpetas afectadas.

Antes de repetir una carga:

```sh
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i filebrowser
docker exec <contenedor-filebrowser> id
find /mnt/data2/<marca>/<modelo> -printf '%u:%g %m %p\n' | head -100
```

Si el UID/GID real confirmado es `1000:1000`, corregir sólo la tanda o modelo afectado:

```sh
chown -R 1000:1000 /mnt/data2/<marca>/<modelo>
find /mnt/data2/<marca>/<modelo> -type d -exec chmod 755 {} +
find /mnt/data2/<marca>/<modelo> -type f -exec chmod 644 {} +
```

No usar `chmod 777`, no hacer `chown -R` sobre todo `/mnt/data2` y no tocar carpetas ajenas a la tanda. El cierre exige comprobar que FileBrowser muestra `Pdf` y `Pcbe`, que el contenedor del CRM lee un PDF y un PCBE, y que el catálogo/indexador sigue viendo las mismas rutas. Si la carpeta aparece en FileBrowser pero el CRM no la puede leer, revisar primero el mount del contenedor antes de volver a transferir archivos.

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
