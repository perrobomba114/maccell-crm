# AGENT.md — biblioteca compartida de MACCELL y Filebrowser

Regla operativa desde el 6 de octubre de 2026. Esta guía corresponde al
almacenamiento físico `/mnt/ESQUEMATICO`; no es una base nueva ni otro catálogo.

El disco es `/dev/sdb1`, UUID `fa0a1b6a-f35b-49ab-820d-49d86c4d1d17`.
Antes de escribir, comprobar `findmnt -T /mnt/ESQUEMATICO`: debe
resolver a ese disco, nunca al RAID `/`. No usar `/mnt/data2` para cargas nuevas.

## Una biblioteca, una estructura

```text
/mnt/ESQUEMATICO/
  pdf/<Marca>/<Modelo>/<nombre técnico>.pdf
  pcbe/<Marca>/<Modelo>/<nombre técnico>.pcbe
  pcbe/<Marca>/<Modelo>/<nombre técnico>.pcb
  pdf/Consolas/<Fabricante>/<Modelo>/...
  pcbe/Consolas/<Fabricante>/<Modelo>/...
  pdf/Laptop-PC/<Marca>/<Modelo o placa>/...
  pcbe/Laptop-PC/<Marca>/<Modelo o placa>/...
  pdf/<Marca>/<Modelo>/<imagen o video>
  CURSO/<material de cursos>/...
  .incoming-scraping/<lote>/...
  .library-history/<lote>/...
  AGENT.md
  AGENTS.md
```

Las familias Apple se muestran separadas: `pdf/iPhone/14 Pro Max/` y
`pcbe/iPhone/14 Pro Max/`; para tabletas `pdf/iPad/<Modelo>/`. No repetir
`iPhone` dentro del nombre de la carpeta del modelo ni recrear `Apple/iPhone`.
El catálogo conserva fabricante `APPLE` y modelo completo `iPhone 14 Pro Max`.
`Apple/General` o `Apple/Por revisar` sólo contienen material transversal cuya
familia no está demostrada. Samsung, Motorola, Xiaomi, Huawei, Honor, LG y
Realme mantienen sus raíces. La familia de archivo es `pdf` o `pcbe`.
No crear variantes `Iphone`, `iPhone(VIP)`, `SAMSUNG` o `Redmi(VIP)`.

Antes de inferir un modelo del archivo, consultar la carpeta original registrada
en `sourceRelativePath`. Los números de capítulo o páginas (`95-101`,
`184-193`) no son modelos. NAND es una función de placa y se conserva en el
archivo; Intel/Qualcomm y región USA siguen distinguiendo variantes.

No hay un modelo por proveedor, `VIP`, `FREE`, serie de descarga o carpeta de
reparaciones. Un modelo compartido se nombra explícitamente, por ejemplo
`11 Pro + Pro Max`; no se adjudica el documento a uno solo.
Las variantes Core/s/Plus/Pro/Ultra/4G/5G y generaciones no se fusionan.
`General` se reserva para material sin un dispositivo único y nunca implica
compatibilidad entre archivos.

No adivinar identidades por palabras sueltas: “switch” en una reparación de
notebook no demuestra Nintendo Switch; un código de placa no demuestra un
modelo comercial. Si faltan pruebas, conservar el nombre técnico completo en
`Por revisar` bajo la marca o plataforma comprobada. Esa categoría conserva
acceso y búsqueda; no declara identidad ni compatibilidad eléctrica.

`CURSO` es una carpeta de cargas del usuario, visible en Filebrowser. No mover,
renombrar ni normalizar sus archivos como parte de una tanda de esquemáticos,
y no interrumpir subidas activas al reiniciar Filebrowser.

## Nombres, duplicados y nuevas entradas

1. Toda tanda entra en `.incoming-scraping/<fecha-lote>`.
2. Inventariar ruta, extensión, tamaño y SHA-256; comprobar que el archivo no
   cambie durante la lectura. Comparar publicado y staging antes de transferir.
3. Verificar contenido y formato. Nunca convertir PCB/BRD/BV a PCBE cambiando
   la extensión, ni declarar legible un PDF sólo por su nombre.
4. Reutilizar marca/modelo existentes. Normalizar espacios y presentación;
   conservar placa, revisión, región, AP/BB, función, componente y contexto.
   Si un código estaba sólo en la carpeta antigua, conservarlo en el nombre
   del archivo. No usar directorios terminados en `.pdf`.
5. Mismo hash y misma identidad: no publicar otra copia nueva. Mismo nombre y
   otro contenido: conservar ambos con un sufijo estable registrado en el
   manifiesto. Nunca sobrescribir. Igual hash entre modelos distintos no
   demuestra que pueda borrarse una identidad.
6. Conservar todos los IDs y vínculos existentes. Las copias históricas con
   sufijo `[origen <identificador>]` preservan referencias; no borrarlas a mano.
7. Los manifiestos, temporales y respaldos van en `.library-history`; las
   capturas y videos van en `pdf/<Marca>/<Modelo>/`, junto a los PDF del
   mismo modelo. No crear una raíz `media` ni mezclar imágenes con placas.
8. Verificar UID/GID real de Filebrowser y acceso desde CRM. En el snapshot
   verificado ambos usan UID/GID 1000. Carpetas nuevas 755 y archivos nuevos
   644; no hacer `chmod/chown -R` sobre el disco entero.

## Contratos que deben seguir coincidiendo

- Filebrowser monta `/mnt/ESQUEMATICO` en `/srv/esquematicos`.
- CRM monta lo mismo en `/app/upload/schematics/sources` y usa
  `SCHEMATICS_ROOT=/app/upload/schematics`.
- `SCHEMATICS_ROOT/catalog.json` contiene el inventario publicado.
- PostgreSQL principal: `schematics.assets`, páginas, índices, jobs y
  consultas históricas. No reemplazar ni regenerar esa base.
- RAG separado: `rag_documents`, `rag_pages`, `rag_chunks`, alias y chats;
  el worker monta la biblioteca en `/library`.

Verificar siempre los mounts y las variables efectivas antes de operar: los
nombres e IDs de contenedores cambian. Una ruta del catálogo comienza con
`sources/`; una ruta RAG es relativa a `/mnt/ESQUEMATICO`, sin ese prefijo.

Para renombrar un archivo existente: actualizar su ruta en catálogo y
`schematics.assets`, y las referencias `relative_path/source_id` del documento
RAG y `source_path` de sus alias. Mantener el ID, hash, páginas, embeddings y
vínculos de reparación. Guardar `sourceRelativePath` como procedencia.
Una normalización de nombres no requiere OCR ni regenerar vectores.

## Herramientas y recuperación

Repositorio MACCELL:

- `scripts/organize-schematic-library.py`: plan, materialización por enlaces
  físicos verificados, commit, verify y rollback.
- `scripts/reconcile-schematic-paths.mjs`: audit, apply, verify y rollback de
  referencias; usa las conexiones existentes del contenedor, nunca URLs
  copiadas a comandos o documentación.
- `scripts/tests/test_organize_schematic_library.py`: regresiones de seguridad.

Los scripts `normalize-schematic-library.py` y
`rewrite-schematic-catalog-after-normalization.mjs` son históricos y no deben
usarse: corresponden a otra estructura y no reconcilian RAG V2.

Antes de aplicar: inventario real, plan revisado, snapshot del catálogo y filas
afectadas de ambas bases; detener sólo la ingesta de PDF y verificar que no
haya otro escritor técnico. Materializar destinos sin quitar originales,
reconciliar ambas bases y catálogo, verificar el recibo de reconciliación y
recién entonces retirar enlaces antiguos. No hacer `mv` masivo sin manifiesto.

La operación del 6 de octubre conserva su manifiesto y copias previas en
`/var/lib/maccell/upload/.library-maintenance/2026-10-06-normalization`,
con ajustes posteriores en `2026-10-06-refinement`, `2026-10-06-shared-models`
y `2026-10-06-taxonomy`
dentro del mismo directorio de mantenimiento.
Para revertir, recorrer esas tandas en orden inverso. Detener la ingesta,
ejecutar primero `rollback` físico con el
mismo manifiesto y después `rollback` del reconciliador con el mismo backup.
No sobrescribir un destino que haya sido modificado desde la migración.

## Cierre obligatorio

Comparar hashes y cantidades antes/después; comprobar que todos los IDs del
catálogo conservan su archivo, que los documentos RAG conservan IDs y páginas,
y que Filebrowser puede listar y leer. Abrir un PDF y un PCBE en MACCELL;
comprobar búsqueda de modelos y una consola. Reanudar la ingesta que estaba
activa. Un `200`, un contenedor saludable o un contador no reemplaza estas
verificaciones. Los archivos ambiguos o no soportados se informan, no se
inventan ni se eliminan.

No borrar staging, backups, originales únicos, bases, chats, feedback ni
historial como forma de ordenar. No usar `rsync --delete`. No guardar secretos.
