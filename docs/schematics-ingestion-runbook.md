# Runbook: subir y sincronizar PDF/PCBE desde SCRAPING

Este runbook es la guía humana de la skill [`schematic-library-ingestion`](../.agents/skills/schematic-library-ingestion/SKILL.md). Aplica a las tandas nuevas de PDF, PCBE y PCB descargadas desde SCRAPING.

## Fuentes y destinos confirmados

- Fuente: carpeta local de descargas de SCRAPING, que debe descubrirse en cada tanda.
- Almacenamiento físico del servidor: `/mnt/data2`.
- FileBrowser: publica ese mismo almacenamiento; no es otra copia.
- Aplicación CRM: `sistema.maccell.com.ar`.
- Montaje conocido en la aplicación: `/mnt/data2` se monta como `/app/upload/schematics/sources`.
- Manifiesto de adquisición: `/mnt/data2/Pcbe/Catalog.json` (no es el snapshot consumido por el CRM),
  `/mnt/data2/pdf/<MARCA>/<MODELO COMERCIAL>/` y
  `/mnt/data2/pcbe/<MARCA>/<MODELO COMERCIAL>/`.
- La especificación completa está en
  [`docs/superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md`](superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md).
- El catálogo y los índices técnicos se resuelven mediante `SCHEMATICS_ROOT` y PostgreSQL. Comprobar la variable y los mounts actuales antes de modificar datos.

## Orden correcto

1. Subir a `.incoming-scraping/<lote>`.
2. Calcular SHA-256 y generar manifiesto.
3. Comparar contra toda la biblioteca.
4. Normalizar una única carpeta por marca/modelo bajo `pdf/` y `pcbe/`.
5. Mover sólo archivos nuevos y conservar colisiones con variante.
6. Actualizar catálogo.
7. Ejecutar/revisar worker técnico.
8. Ejecutar/revisar vectores RAG.
9. Verificar FileBrowser, búsqueda y navegación PDF/PCBE.
10. Conservar el manifiesto y limpiar staging sólo con aprobación.

## Regla de ubicación Samsung y corrección del incidente

La forma canónica para Samsung es:

```text
/mnt/data2/pdf/SAMSUNG/<modelo-comercial>/<archivo>.pdf
/mnt/data2/pcbe/SAMSUNG/<modelo-comercial>/<archivo>.pcbe
```

Durante la transición, el lector acepta las rutas históricas y conserva el origen en `sourceRelativePath`; no se deben crear nuevas tandas con el formato histórico. En el incidente del 05/09/2026 una normalización inicial calculó destinos `Samsung ...` relativos a `/mnt/data2` y dejó cientos de carpetas sueltas visibles en FileBrowser. Se detuvo el worker, se movieron únicamente esas carpetas con reporte SHA-256 y se verificaron propietario `1000:1000`, directorios `755` y archivos `644`. Para futuras tandas, ejecutar y conservar el reporte de `scripts/normalize-schematic-library.py`; luego usar `scripts/rewrite-schematic-catalog-after-normalization.mjs`. No corregirlo con renombrados manuales sin reporte.

## Diagnóstico de `202 Accepted` al abrir un PDF

FileBrowser puede devolver `202 Accepted` en `/api/raw` cuando el usuario tiene permiso para listar pero no para descargar/servir el archivo inline. La corrección aplicada fue habilitar `download` y `share` para el usuario operativo mediante la CLI del mismo contenedor, reiniciar el servicio y validar el PDF desde la vista web. Si vuelve a ocurrir, comprobar en este orden: permiso efectivo del usuario, propietario/UID de la ruta, permisos `755/644`, montaje `/mnt/data2` y recién después el catálogo. No volver a subir el PDF por este síntoma.

## Auditoría incremental realizada sobre SCRAPING/downloads

La auditoría de la carpeta local actual encontró:

- 1.984 archivos con extensiones PDF/PCBE/PCB.
- 1.956 hashes únicos; 28 archivos son duplicados exactos dentro de la propia descarga.
- 1.425 hashes locales ya existen en `.incoming-scraping` del servidor.
- 1.427 hashes locales ya existen en la biblioteca publicada.
- 529 hashes no existen ni en publicado ni en staging: 74 PCBE y 456 PDF, unos 0,677 GiB.
- Los 93 assets del árbol local `bulk` no aportan hashes nuevos en esta comparación.
- `.DS_Store` y `manifest-bulk.json` quedaron fuera del conjunto de assets.

Estos grupos se solapan; no se suman. El conjunto que debe transferirse es exclusivamente `hashes locales - hashes publicados - hashes staging`. Los 1.425 hashes ya presentes en staging no deben volver a subirse: deben continuar por clasificación, catálogo e indexación.

Este resultado es una fotografía de la auditoría actual. Antes de cada transferencia se debe regenerar el manifiesto porque pueden cambiar archivos, staging o la biblioteca.

## Procedimiento para no repetir la tanda

1. Generar el manifiesto local con ruta, tamaño y SHA-256.
2. Obtener el conjunto de hashes publicado y el conjunto de hashes de `.incoming-scraping`.
3. Calcular la diferencia, conservar las rutas locales de los hashes nuevos y revisar colisiones de nombre.
4. Transferir únicamente esa lista diferencial a un nuevo lote de staging.
5. Registrar en el manifiesto que los hashes omitidos ya estaban publicados o en staging.
6. No borrar el staging anterior: si contiene un hash de esta tanda, es evidencia de una transferencia ya realizada, no un motivo para duplicarlo.

Si no se puede obtener el manifiesto remoto o comparar hashes, la operación queda en modo análisis y no se permite copiar toda la carpeta como alternativa.

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
| Catálogo | `SCHEMATICS_ROOT/catalog.json` (inventario completo) y enriquecimiento en `schematics.assets` | worker técnico / `scripts/reconcile-schematic-library.ts` |
| Texto PDF | `schematics.pages` y `.index` | importador/worker |
| PCBE y referencias | `schematics.technical_indexes` y `.technical` | `scripts/technical-worker.cjs` |
| Embeddings | RAG V2: `rag_documents`, `rag_pages`, `rag_chunks` | `maccell-rag-worker` |

## Diagnóstico rápido

- FileBrowser no muestra una carpeta: comprobar que se creó bajo `/mnt/data2`, que el mount apunta al mismo volumen y que el usuario del contenedor tiene permisos. No volver a subirla a otra ruta.
- El catálogo ve el archivo pero el visor no: comprobar `relativePath`, `SCHEMATICS_ROOT`, existencia física y SHA.
- PDF visible pero sin búsqueda: comprobar `schematics.pages`, `.index` y el estado del worker.
- PCBE visible pero sin componentes: revisar que el parser reconozca el encabezado/geometría; renombrar `.pcb` a `.pcbe` no lo hace válido.
- PDF y PCBE no se vinculan: validar identidad desde Inspector; una carpeta común no alcanza.
- RAG no responde pero la búsqueda textual sí: revisar embeddings y `RAG_WORKER_URL`; no borrar el índice textual.
- FileBrowser muestra `202 Accepted`: revisar permiso `download` del usuario; listar carpetas no demuestra que el endpoint raw pueda servir el PDF.

## Cierre de una tanda

El cierre debe incluir los conteos de archivos nuevos, duplicados exactos, colisiones, bloqueados/no soportados, assets catalogados, trabajos técnicos indexados/pendientes y chunks vectoriales creados/cacheados. Si falta alguno de esos datos, la tanda queda abierta.

### Prioridad del CRM durante la indexación

Los nueve shards de ingesta RAG pertenecen al perfil Compose `maintenance-indexing` y no arrancan en un despliegue normal. Cada shard tiene un límite de un CPU. Activar únicamente el servicio necesario durante una ventana de mantenimiento; no iniciar todos los shards juntos mientras trabajan los técnicos.

El proceso web no inicia el worker técnico salvo que `SCHEMATICS_BACKGROUND_INDEXING=true`; cuando se habilita, usa concurrencia uno. La navegación por referencias de PDFs con texto nativo funciona bajo demanda, con coordenadas reales y caché por SHA-256, sin esperar a OCR ni embeddings. Los PDFs escaneados siguen necesitando OCR. El catálogo comparte lecturas concurrentes durante cinco segundos y se invalida al cambiar el inventario físico o la identidad de un archivo.
