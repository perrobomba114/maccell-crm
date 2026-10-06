---
name: schematic-library-ingestion
description: Ingesta segura de PDF, PCBE y PCB descargados desde SCRAPING hacia la biblioteca MACCELL en /mnt/ESQUEMATICO, con deduplicación por SHA-256, normalización, catálogo, índice técnico y sincronización RAG.
---

# Ingesta de PDF y PCBE de MACCELL

Usar esta skill cuando haya nuevos archivos de esquemáticos, boardviews o PCBE en SCRAPING/SCRAPING DOWNLOADS, cuando se deba ordenar `/mnt/ESQUEMATICO`, o cuando haya que comprobar que el índice técnico y el RAG los procesaron.

## Invariantes

- La biblioteca física existente es `/mnt/ESQUEMATICO` en el servidor MACCELL. No inventar otra carpeta ni cambiar el volumen.
- El lugar lógico de publicación debe verificarse con Dokploy y `SCHEMATICS_ROOT` antes de importar. En la configuración actual, el volumen de `/mnt/ESQUEMATICO` se monta en el contenedor como `/app/upload/schematics/sources`; el catálogo y sus índices pueden vivir fuera del volumen físico. No asumir rutas: comprobarlas.
- FileBrowser expone el mismo almacenamiento. Si una carpeta no aparece, verificar montaje y permisos antes de copiar de nuevo.
- Los archivos de `Iphone 17 pro max` ya quedaron invisibles una vez porque la transferencia los dejó como `root:root`; FileBrowser corre con otro UID y no podía listarlos. Toda tanda debe cerrar con una auditoría de propietario, grupo y permisos.
- `.incoming-scraping` es staging, no biblioteca publicada. No borrarlo hasta cerrar la auditoría de la tanda.
- Nunca se sobrescribe un archivo existente. La identidad física es `SHA-256 + tamaño`; el nombre no es identidad.
- Un duplicado exacto se registra y no se vuelve a copiar. Un mismo nombre con distinto hash se conserva con sufijo de variante y se informa para revisión.
- No marcar una pareja PDF/PCBE como compatible sólo porque comparte carpeta, marca o modelo. La identidad requiere evidencia técnica y validación desde el Inspector.
- No eliminar `FIRMWARE FRP` ni ninguna otra carpeta durante una tanda sin confirmar primero que está vacía, fuera del catálogo y aprobada por el usuario.
- No guardar contraseñas, claves SSH ni tokens en esta skill, scripts, manifests o logs.

## Estructura canónica

La regla vigente está en [`docs/schematic-library-AGENT.md`](../../../docs/schematic-library-AGENT.md), instalada también como único `/mnt/ESQUEMATICO/AGENTS.md`.

```text
/mnt/ESQUEMATICO/pdf/<Marca>/<Modelo>/<archivo>.pdf
/mnt/ESQUEMATICO/pcbe/<Marca>/<Modelo>/<archivo>.pcbe
/mnt/ESQUEMATICO/pdf/<Marca>/<Modelo>/<imagen-o-video>
```

Consolas y Laptop-PC conservan su nivel de plataforma y fabricante. Para Apple usar `pdf/iPhone/14 Pro Max/` y `pcbe/iPhone/14 Pro Max/`, con modelo completo y marca APPLE en el catálogo; iPad tiene su raíz propia. No crear árboles históricos `Samsung/<modelo>/Pdf`, `Apple/iPhone` ni carpetas `VIP/FREE`. Respetar los nombres canónicos existentes, variantes y modelos compartidos. Conservar códigos técnicos del origen en el archivo; no inventar un modelo por un código.

Para reorganización usar `scripts/organize-schematic-library.py` y `scripts/reconcile-schematic-paths.mjs`, con manifiesto SHA-256 y respaldo previo. Los scripts `normalize-schematic-library.py` y `rewrite-schematic-catalog-after-normalization.mjs` son históricos: no usar; no reconcilian las referencias RAG V2.

Para Samsung usar el diccionario auditado `scripts/data/schematic-samsung-reference.json` mediante `scripts/schematic-reference.py`: modelo comercial más código completo, con carpetas separadas por variante regional (`A02 SM-A022F`, `A02 SM-A022M`). No completar sufijos desconocidos. A025 corresponde a A02s; A022 a A02. La referencia de SCRAPING sirve para resolver nombres, pero sus descargas pueden contener otro documento: validar contenido y hash antes de publicar. Los PDF sin identidad comprobable van a `pdf/Por revisar/Identidad pendiente`, visibles para revisión y excluidos de ingesta RAG; los boardviews sin geometría permanecen en staging.

## Flujo obligatorio

### Regla incremental: comparar antes de transferir

Nunca se debe ejecutar `rsync` sobre todo `downloads/` como primera acción. La carpeta local contiene árboles históricos (`pdf`, `pcbe` y `bulk`) y el servidor conserva tanto la biblioteca publicada como `.incoming-scraping`. Las tres fuentes se comparan por SHA-256 y se toma la unión de hashes:

| Resultado del hash | Acción |
| --- | --- |
| Ya publicado en `/mnt/ESQUEMATICO` | Omitir; no copiar ni recatalogar por segunda vez |
| Ya presente en `/mnt/ESQUEMATICO/.incoming-scraping` | Omitir la transferencia; continuar desde ese staging y completar su proceso |
| No existe en publicado ni staging | Candidato nuevo; subir sólo este archivo |
| Hash repetido dentro de la fuente local | Conservar una sola copia y registrar todas las rutas de origen |
| Mismo nombre con hash distinto | No sobrescribir; crear variante y revisión |

Los conteos de archivos no son suficientes: una misma tanda puede tener nombres distintos con el mismo contenido y el staging puede contener una copia que todavía no aparece en el catálogo. El criterio de "ya está" siempre es el hash, separado en publicado y staging.

### 1. Descubrir la fuente y el destino real

En el equipo local localizar la carpeta de la tanda sin suponer un nombre:

```sh
find /Users/David/Desktop -maxdepth 2 -type d \( -iname '*scrap*' -o -iname '*download*' \) -print
```

En el servidor usar el acceso autorizado por el usuario:

```sh
ssh maccell@100.127.204.5
find /mnt/ESQUEMATICO -maxdepth 2 -type d -print | sort | head -200
```

Antes de copiar, comprobar en Dokploy que el servicio `MACCELL CRM` conserve el volumen de `/mnt/ESQUEMATICO` y obtener `SCHEMATICS_ROOT` del contenedor. Si el volumen o la variable cambiaron, detenerse y documentar el cambio; no crear un destino alternativo.

### Permisos y visibilidad en FileBrowser

Después de crear una tanda, identificar el UID/GID real con el que corre FileBrowser; en la corrección de `Iphone 17 pro max` fue `1000:1000`. No asumirlo si el contenedor cambió:

```sh
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i filebrowser
docker exec <contenedor-filebrowser> id
```

Auditar sólo las rutas nuevas o reorganizadas, no aplicar permisos indiscriminadamente a todo el servidor:

```sh
find /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max' \( ! -user 1000 -o ! -group 1000 \) -print
find /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max' -type d -printf '%u:%g %m %p\n'
find /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max' -type f -printf '%u:%g %m %p\n'
```

Si la auditoría confirma que la tanda es propiedad incorrecta y el UID/GID verificado de FileBrowser es `1000:1000`, corregir sólo las rutas afectadas:

```sh
chown -R 1000:1000 /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max'
find /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max' -type d -exec chmod 755 {} +
find /mnt/ESQUEMATICO/Iphone/'Iphone 17 pro max' -type f -exec chmod 644 {} +
```

No usar `chmod 777`, no cambiar permisos de `/mnt/ESQUEMATICO` completo y no hacer `chown` sobre carpetas no pertenecientes a la tanda. Luego comprobar desde FileBrowser que aparecen `Pdf` y `Pcbe`, y comprobar desde el contenedor de la aplicación que puede leer un archivo de cada carpeta.

Si el visor de FileBrowser muestra `202 Accepted` al abrir un PDF, no es una respuesta de indexación: en FileBrowser suele significar que el usuario puede listar pero no tiene permiso de descarga/lectura inline. Verificar el permiso efectivo del usuario con la CLI del mismo contenedor y activar `download` para el usuario autorizado; después recargar el visor y comprobar que aparecen `Cerrar`, `Descargar` e `Info`. Mantener además propietario `1000:1000`, directorios `755` y archivos `644` cuando ese sea el UID/GID confirmado del contenedor.

### 2. Copiar sólo a staging

La tanda se sube primero a un directorio temporal dentro de la biblioteca, por ejemplo `.incoming-scraping/<fecha-o-lote>`. Usar `rsync` con reanudación, sin borrar el origen ni usar `--delete`:

```sh
rsync -rlt --partial --progress --ignore-existing \
  "<SCRAPING_DOWNLOADS>/" \
  "maccell@100.127.204.5:/mnt/ESQUEMATICO/.incoming-scraping/<lote>/"
```

`--ignore-existing` sólo evita una copia repetida durante la transferencia; no reemplaza la auditoría por hash. Para archivos con el mismo nombre se debe comparar SHA-256 en el servidor. Si la auditoría generó una lista diferencial, `rsync` debe recibir esa lista o un directorio temporal que contenga únicamente los candidatos `new`; nunca se vuelve a transferir la carpeta completa.

### 3. Auditar extensiones y hashes

Aceptar únicamente `.pdf`, `.pcbe` y `.pcb` para revisión. Un `.pcb` no se convierte en PCBE renombrando la extensión: el parser debe reconocer el contenido.

Generar un manifiesto de la tanda con ruta relativa, tamaño, SHA-256 y tipo. Comparar el hash con toda la biblioteca publicada y clasificar cada entrada como:

- `new`: no existe el hash en la biblioteca.
- `duplicate_exact`: el hash ya existe; no copiar otra vez.
- `name_collision`: mismo nombre, hash diferente; conservar ambos con variante y revisión manual.
- `invalid_or_unsupported`: extensión permitida pero parser/PDF no legible; conservar en staging y no marcar como listo.

No se permite decidir duplicados con `basename` solamente. Para comparar una tanda ya subida se puede usar:

```sh
find /mnt/ESQUEMATICO/.incoming-scraping/<lote> -type f \
  \( -iname '*.pdf' -o -iname '*.pcbe' -o -iname '*.pcb' \) \
  -print0 | xargs -0 sha256sum > /mnt/ESQUEMATICO/.incoming-scraping/<lote>.sha256
```

El manifiesto se conserva hasta terminar la indexación.

Los archivos auxiliares como `.DS_Store`, `manifest-*.json`, capturas y catálogos de SCRAPING no son assets de la biblioteca. Se conservan en SCRAPING como evidencia, pero no se suben a `Pdf` ni `Pcbe`.

### 4. Clasificar y normalizar sin perder evidencia

Para cada archivo nuevo:

1. Resolver marca y modelo sólo cuando el nombre, el contenido o el catálogo fuente lo sustentan.
2. Crear o reutilizar una única carpeta canónica de marca/modelo.
3. Colocar PDF en `pdf/<Marca>/<Modelo>` y PCBE/PCB en `pcbe/<Marca>/<Modelo>`.
4. Mantener board-code, AP/BB, revisión y región en el nombre si aportan identidad.
5. No crear carpetas repetidas por mayúsculas, espacios, `VIP`, `FREE` o fuentes de descarga; esas etiquetas son metadatos o alias, no otro modelo.
6. Si la identidad es ambigua, dejar el archivo en staging o en una carpeta `Review` de la tanda y reportarlo; no adivinar.

El movimiento final se hace sólo después de que el manifiesto confirme que el destino no contiene otro hash. Si el hash ya existe, se registra como duplicado y se conserva una sola copia física.

### 5. Publicar la tanda revisada

Usar el contrato `PUBLICAR.json` documentado en `docs/schematic-library-AGENT.md`.
Crear el manifiesto al final de la subida, por escritura temporal y rename;
incluir responsable, evidencia real de identidad, origen, destino canónico,
SHA-256 y tamaño. No habilitar una tanda sólo por el nombre de sus archivos.

El worker `technical-indexer --watch --intake` publica sin sobrescribir, conserva
el staging y deja `resultado-<SHA>.json`. Sólo las entradas publicadas o ya
publicadas por un manifiesto se admiten como nuevos archivos del catálogo.
Los conflictos quedan `review`; corregir el manifiesto con evidencia antes de
reintentar. La descarga local no se transfiere automáticamente al servidor.

`import-schematics.ts` es una herramienta histórica de importación directa:
no usarla para saltar este circuito en producción. No editar `catalog.json` a mano.

### 6. Verificar el índice técnico

El único worker continuo de producción es `technical-indexer` del Compose RAG,
con `--watch --intake`, concurrencia 1 y advisory lock. El worker embebido del CRM
permanece desactivado. No iniciar otro worker ni un `--retry-failed` global como
preparación rutinaria. El escaneo se repite cada cinco minutos después del ciclo.

Verificar por cada asset:

- `schematics.assets`: ruta, tipo, modelo y SHA coinciden;
- `schematics.index_jobs`: `indexed` o `pending`, sin `failed` no explicado;
- `schematics.pages`: páginas PDF con el mismo SHA que el archivo;
- `.technical/<asset-id>.json`: índice vigente para el tamaño, mtime y SHA.

Archivos modificados físicamente deben recatalogarse. El worker invalida la identidad verificada cuando cambia el SHA; nunca se conserva una asociación antigua por comodidad.

### 7. Sincronizar RAG V2

Consultar `docs/cerebro-rag-runbook.md`. El proceso vigente es `ingestion-sequential` de `maccell-rag-worker`, con `rag_documents`, `rag_pages` y `rag_chunks` en la base aislada. No usar `scripts/index-schematics-vectors.mjs`: corresponde al índice legado.

Para un cambio de nombre sin cambios de contenido, reconciliar `relative_path`, `source_id` y alias manteniendo IDs, SHA, páginas y vectores; no reextraer ni borrar documentos. Para una tanda nueva, usar la ingesta incremental existente sin iniciar shards adicionales ni reiniciar cursores.

### 8. Verificación final

Una tanda sólo se considera terminada cuando se comprueba todo lo siguiente:

```text
transferencia completa
→ no hay duplicados exactos nuevos
→ no hay colisiones sin reporte
→ estructura canónica visible en FileBrowser
→ catalog.json/base de schematics actualizados
→ index_jobs sin fallos no explicados
→ páginas PDF con SHA vigente
→ technical_indexes completos o pendientes explícitos
→ chunks/vector embeddings presentes en RAG
→ búsqueda por modelo y componente devuelve archivo y página
```

Probar al menos un PDF y un PCBE de la tanda desde `sistema.maccell.com.ar`, y un componente común del PDF contra el PCBE. No usar `maccell.com.ar` para validar el CRM: ese dominio es el sitio público WordPress; el CRM está en `sistema.maccell.com.ar`.

## Qué nunca hacer

- No copiar directamente a una carpeta final sin staging, manifiesto y hash.
- No usar `mv` o `rm` sobre una colección grande antes de registrar el estado anterior.
- No usar `rsync --delete`.
- No sobrescribir un archivo porque "parece el mismo".
- No duplicar el modelo por `VIP`, `FREE`, `Schematic`, `Boardview` o por una diferencia de mayúsculas.
- No enlazar PDF y PCBE sólo por nombre de carpeta.
- No ejecutar indexación paralela sin el advisory lock del worker.
- No borrar `catalog.json`, `.index`, `.technical`, páginas ni vectores como método de reparación.
- No reportar "RAG listo" si sólo se copió el archivo físico.

## Evidencia que debe quedar en cada tanda

Guardar, sin credenciales:

- lote y fecha;
- origen local y destino confirmado;
- cantidad por extensión;
- cantidad `new`, `duplicate_exact`, `name_collision`, `locked` y `unsupported`;
- archivo de hashes;
- resumen del importador;
- resumen del worker técnico;
- resumen del indexador vectorial;
- verificación final de FileBrowser y búsqueda del CRM;
- conflictos que quedaron pendientes.

La respuesta al usuario debe separar claramente: archivos subidos, duplicados omitidos, archivos pendientes/no soportados, indexación técnica y estado del RAG.
