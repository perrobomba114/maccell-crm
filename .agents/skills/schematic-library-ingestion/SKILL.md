---
name: schematic-library-ingestion
description: Ingesta segura de PDF, PCBE y PCB descargados desde SCRAPING hacia la biblioteca MACCELL en /mnt/data2, con deduplicación por SHA-256, normalización, catálogo, índice técnico y sincronización RAG.
---

# Ingesta de PDF y PCBE de MACCELL

Usar esta skill cuando haya nuevos archivos de esquemáticos, boardviews o PCBE en SCRAPING/SCRAPING DOWNLOADS, cuando se deba ordenar `/mnt/data2`, o cuando haya que comprobar que el índice técnico y el RAG los procesaron.

## Invariantes

- La biblioteca física existente es `/mnt/data2` en el servidor MACCELL. No inventar otra carpeta ni cambiar el volumen.
- El lugar lógico de publicación debe verificarse con Dokploy y `SCHEMATICS_ROOT` antes de importar. En la configuración actual, el volumen de `/mnt/data2` se monta en el contenedor como `/app/upload/schematics/sources`; el catálogo y sus índices pueden vivir fuera del volumen físico. No asumir rutas: comprobarlas.
- FileBrowser expone el mismo almacenamiento. Si una carpeta no aparece, verificar montaje y permisos antes de copiar de nuevo.
- Los archivos de `Iphone 17 pro max` ya quedaron invisibles una vez porque la transferencia los dejó como `root:root`; FileBrowser corre con otro UID y no podía listarlos. Toda tanda debe cerrar con una auditoría de propietario, grupo y permisos.
- `.incoming-scraping` es staging, no biblioteca publicada. No borrarlo hasta cerrar la auditoría de la tanda.
- Nunca se sobrescribe un archivo existente. La identidad física es `SHA-256 + tamaño`; el nombre no es identidad.
- Un duplicado exacto se registra y no se vuelve a copiar. Un mismo nombre con distinto hash se conserva con sufijo de variante y se informa para revisión.
- No marcar una pareja PDF/PCBE como compatible sólo porque comparte carpeta, marca o modelo. La identidad requiere evidencia técnica y validación desde el Inspector.
- No eliminar `FIRMWARE FRP` ni ninguna otra carpeta durante una tanda sin confirmar primero que está vacía, fuera del catálogo y aprobada por el usuario.
- No guardar contraseñas, claves SSH ni tokens en esta skill, scripts, manifests o logs.

## Estructura canónica

La biblioteca física se organiza así:

```text
/mnt/data2/
  Iphone/
    Iphone 17 pro max/
      Pdf/
      Pcbe/
  Samsung/
    Samsung s23 ultra/
      Pdf/
      Pcbe/
  ...
```

#### Regla crítica para Samsung

Toda carpeta de modelo Samsung debe quedar debajo de `/mnt/data2/Samsung/<modelo>`. Nunca se debe construir el destino como `/mnt/data2/<modelo>`: eso deja carpetas `Samsung ...` sueltas en la raíz y FileBrowser las muestra como modelos separados. En el catálogo, la ruta equivalente siempre empieza por `sources/Samsung/<modelo>/`.

Para una reorganización masiva ya auditada se usan los scripts versionados `scripts/normalize-schematic-library.py` y `scripts/rewrite-schematic-catalog-after-normalization.mjs`. El primero calcula SHA-256, evita sobrescrituras, conserva variantes y genera un reporte; el segundo actualiza catálogo/DB desde ese reporte. No repetir un `mv` manual ni regenerar el catálogo desde cero.

La normalización solicitada por MACCELL es: primera letra del nombre en mayúscula y resto en minúscula, conservando números, guiones y la información técnica necesaria. No convertir automáticamente nombres técnicos a un modelo inventado. Los nombres de archivos deben mantener componentes, board-code y revisión cuando existan; sólo se normaliza la presentación, no se elimina información.

## Flujo obligatorio

### Regla incremental: comparar antes de transferir

Nunca se debe ejecutar `rsync` sobre todo `downloads/` como primera acción. La carpeta local contiene árboles históricos (`pdf`, `pcbe` y `bulk`) y el servidor conserva tanto la biblioteca publicada como `.incoming-scraping`. Las tres fuentes se comparan por SHA-256 y se toma la unión de hashes:

| Resultado del hash | Acción |
| --- | --- |
| Ya publicado en `/mnt/data2` | Omitir; no copiar ni recatalogar por segunda vez |
| Ya presente en `/mnt/data2/.incoming-scraping` | Omitir la transferencia; continuar desde ese staging y completar su proceso |
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
find /mnt/data2 -maxdepth 2 -type d -print | sort | head -200
```

Antes de copiar, comprobar en Dokploy que el servicio `MACCELL CRM` conserve el volumen de `/mnt/data2` y obtener `SCHEMATICS_ROOT` del contenedor. Si el volumen o la variable cambiaron, detenerse y documentar el cambio; no crear un destino alternativo.

### Permisos y visibilidad en FileBrowser

Después de crear una tanda, identificar el UID/GID real con el que corre FileBrowser; en la corrección de `Iphone 17 pro max` fue `1000:1000`. No asumirlo si el contenedor cambió:

```sh
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i filebrowser
docker exec <contenedor-filebrowser> id
```

Auditar sólo las rutas nuevas o reorganizadas, no aplicar permisos indiscriminadamente a todo el servidor:

```sh
find /mnt/data2/Iphone/'Iphone 17 pro max' \( ! -user 1000 -o ! -group 1000 \) -print
find /mnt/data2/Iphone/'Iphone 17 pro max' -type d -printf '%u:%g %m %p\n'
find /mnt/data2/Iphone/'Iphone 17 pro max' -type f -printf '%u:%g %m %p\n'
```

Si la auditoría confirma que la tanda es propiedad incorrecta y el UID/GID verificado de FileBrowser es `1000:1000`, corregir sólo las rutas afectadas:

```sh
chown -R 1000:1000 /mnt/data2/Iphone/'Iphone 17 pro max'
find /mnt/data2/Iphone/'Iphone 17 pro max' -type d -exec chmod 755 {} +
find /mnt/data2/Iphone/'Iphone 17 pro max' -type f -exec chmod 644 {} +
```

No usar `chmod 777`, no cambiar permisos de `/mnt/data2` completo y no hacer `chown` sobre carpetas no pertenecientes a la tanda. Luego comprobar desde FileBrowser que aparecen `Pdf` y `Pcbe`, y comprobar desde el contenedor de la aplicación que puede leer un archivo de cada carpeta.

Si el visor de FileBrowser muestra `202 Accepted` al abrir un PDF, no es una respuesta de indexación: en FileBrowser suele significar que el usuario puede listar pero no tiene permiso de descarga/lectura inline. Verificar el permiso efectivo del usuario con la CLI del mismo contenedor y activar `download` para el usuario autorizado; después recargar el visor y comprobar que aparecen `Cerrar`, `Descargar` e `Info`. Mantener además propietario `1000:1000`, directorios `755` y archivos `644` cuando ese sea el UID/GID confirmado del contenedor.

### 2. Copiar sólo a staging

La tanda se sube primero a un directorio temporal dentro de la biblioteca, por ejemplo `.incoming-scraping/<fecha-o-lote>`. Usar `rsync` con reanudación, sin borrar el origen ni usar `--delete`:

```sh
rsync -rlt --partial --progress --ignore-existing \
  "<SCRAPING_DOWNLOADS>/" \
  "maccell@100.127.204.5:/mnt/data2/.incoming-scraping/<lote>/"
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
find /mnt/data2/.incoming-scraping/<lote> -type f \
  \( -iname '*.pdf' -o -iname '*.pcbe' -o -iname '*.pcb' \) \
  -print0 | xargs -0 sha256sum > /mnt/data2/.incoming-scraping/<lote>.sha256
```

El manifiesto se conserva hasta terminar la indexación.

Los archivos auxiliares como `.DS_Store`, `manifest-*.json`, capturas y catálogos de SCRAPING no son assets de la biblioteca. Se conservan en SCRAPING como evidencia, pero no se suben a `Pdf` ni `Pcbe`.

### 4. Clasificar y normalizar sin perder evidencia

Para cada archivo nuevo:

1. Resolver marca y modelo sólo cuando el nombre, el contenido o el catálogo fuente lo sustentan.
2. Crear o reutilizar una única carpeta canónica de marca/modelo.
3. Colocar PDF en `Pdf` y PCBE/PCB en `Pcbe`.
4. Mantener board-code, AP/BB, revisión y región en el nombre si aportan identidad.
5. No crear carpetas repetidas por mayúsculas, espacios, `VIP`, `FREE` o fuentes de descarga; esas etiquetas son metadatos o alias, no otro modelo.
6. Si la identidad es ambigua, dejar el archivo en staging o en una carpeta `Review` de la tanda y reportarlo; no adivinar.

El movimiento final se hace sólo después de que el manifiesto confirme que el destino no contiene otro hash. Si el hash ya existe, se registra como duplicado y se conserva una sola copia física.

### 5. Actualizar el catálogo de la aplicación

El importador de referencia es:

```sh
npx tsx scripts/import-schematics.ts <origen-de-la-tanda> <SCHEMATICS_ROOT>
```

El comando debe ejecutarse desde el checkout de MACCELL con sus dependencias y variables reales. Antes de ejecutarlo:

- confirmar que el origen está fuera del destino lógico;
- comprobar que la función de catálogo produce rutas relativas bajo la biblioteca;
- hacer una copia/backup del `catalog.json` y del estado de la base;
- no usar `--force` ni borrar el catálogo para "empezar de cero".

El importador calcula SHA-256, preserva identidades verificadas cuando el hash no cambia, genera `.index/<asset-id>.json` para PDF legibles y deja como `locked` o `unsupported` lo que no puede interpretar. El catálogo se escribe mediante archivo temporal y rename; no editar `catalog.json` a mano.

### 6. Indexar el índice técnico

El worker usa el catálogo y la base PostgreSQL. La operación normal es idempotente:

```sh
node scripts/technical-worker.cjs --retry-failed
```

En producción el worker continuo se inicia con `scripts/start-with-technical-worker.sh` y usa `--watch`. No lanzar dos workers manuales: el advisory lock de PostgreSQL evita escritores simultáneos, pero un segundo proceso sólo agrega ruido y puede dejar trabajos reintentables.

Verificar por cada asset:

- `schematics.assets`: ruta, tipo, modelo y SHA coinciden;
- `schematics.index_jobs`: `indexed` o `pending`, sin `failed` no explicado;
- `schematics.pages`: páginas PDF con el mismo SHA que el archivo;
- `.technical/<asset-id>.json`: índice vigente para el tamaño, mtime y SHA.

Archivos modificados físicamente deben recatalogarse. El worker invalida la identidad verificada cuando cambia el SHA; nunca se conserva una asociación antigua por comodidad.

### 7. Sincronizar embeddings del RAG

Después de que las páginas estén indexadas y sus SHA sean actuales, ejecutar el proceso semántico con las variables `DATABASE_URL`, `RAG_DATABASE_URL`, `RAG_INTERNAL_API_SECRET` y `SCHEMATICS_EMBEDDING_VERSION` reales:

```sh
node scripts/index-schematics-vectors.mjs
```

El proceso es idempotente por modelo, asset, SHA, página y fragmento. No borrar la tabla completa para incorporar una tanda. Si falla el worker de embeddings, dejar los documentos en búsqueda textual y reintentar; no declarar el RAG sincronizado sólo porque el catálogo físico existe.

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
