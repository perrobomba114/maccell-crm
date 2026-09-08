# Especificación: estructura canónica de la biblioteca de esquemáticos

Fecha: 2026-09-08  
Estado: propuesta para revisión del usuario  
Alcance: biblioteca PDF/PCBE/PCB, catálogo, árbol del Workbench e integración
con el índice técnico y Cerebro RAG.

## Objetivo

Establecer una única forma oficial de organizar, identificar y consultar todos
los archivos técnicos de MACCELL, incluyendo móviles, consolas, notebooks,
PC, placas de video, monitores y TV. La interfaz, el catálogo, el worker
técnico y el RAG deben describir la misma identidad física sin depender de
nombres históricos, carpetas `VIP/FREE` o el orden en que se subieron los
archivos.

La estructura propuesta por el usuario es el objetivo funcional. Los conteos
del documento de referencia son informativos: antes de migrar se debe obtener
un inventario real con SHA-256 y no sobrescribir el catálogo con esos números.

## Estructura física canónica

La forma final esperada bajo el volumen existente `/mnt/data2` es:

```text
/mnt/data2/
├── Pcbe/
│   └── Catalog.json
├── Backups/
│   ├── Catalog.backup-<timestamp>.json
│   └── <database-backup>.sql.gz
├── pdf/
│   ├── SAMSUNG/<modelo-comercial>/
│   ├── iPhone/<modelo-comercial>/
│   ├── HUAWEI/<modelo-comercial>/
│   ├── Motorola/<modelo-comercial>/
│   ├── Xiaomi/<modelo-comercial>/
│   ├── HONOR/<modelo-comercial>/
│   ├── OPPO/<modelo-comercial>/
│   ├── Vivo/<modelo-comercial>/
│   ├── LG/<modelo-comercial>/
│   ├── Consolas/<fabricante>/<modelo-comercial>/
│   └── Laptop-PC/<tipo>/<modelo-comercial>/
└── pcbe/
    ├── SAMSUNG/<modelo-comercial>/
    ├── iPhone/<modelo-comercial>/
    ├── HUAWEI/<modelo-comercial>/
    ├── Motorola/<modelo-comercial>/
    ├── Xiaomi/<modelo-comercial>/
    ├── HONOR/<modelo-comercial>/
    ├── OPPO/<modelo-comercial>/
    ├── Vivo/<modelo-comercial>/
    ├── LG/<modelo-comercial>/
    ├── Consolas/XBOX/<modelo-comercial>/
    ├── Consolas/Nintendo/<modelo-comercial>/
    ├── Consolas/PlayStation/<modelo-comercial>/
    ├── Consolas/Steam-Deck/<modelo-comercial>/
    └── Laptop-PC/<tipo>/<modelo-comercial>/
```

Reglas:

- `pdf/` y `pcbe/` son familias físicas separadas.
- `Catalog.json` es un artefacto generado; nunca se edita manualmente.
- La migración conserva nombres técnicos, códigos de placa, revisiones y
  variantes que aporten identidad.
- `VIP`, `FREE`, `Schematic`, `Boardview`, `Repair Case` y carpetas de fuente
  no crean modelos comerciales nuevos; se convierten en metadatos o roles.
- No se borra ni sobrescribe ningún archivo. Un hash repetido es un duplicado
  exacto; un nombre repetido con hash distinto es una variante que se reporta.
- Durante la transición, el lector acepta las rutas antiguas y las traduce a
  la identidad canónica. Las rutas históricas se conservan en
  `sourceRelativePath`.

## Identidad única del activo

Cada entrada debe conservar como mínimo:

```json
{
  "id": "sha256-del-activo",
  "name": "nombre-real.ext",
  "kind": "pdf | pcbe | pcb",
  "family": "pdf | pcbe",
  "platform": "mobile | console | laptop-pc | other",
  "brand": "SAMSUNG",
  "brandKey": "samsung",
  "model": "Samsung A03 Core",
  "modelKey": "samsung-a03-core",
  "boardCode": "LLDM168C1-5",
  "relativePath": "pcbe/SAMSUNG/Samsung A03 Core/archivo.pcbe",
  "sourceRelativePath": "ruta-original/archivo.pcbe",
  "size": 123456,
  "sha256": "...",
  "role": "boardview | schematic | image | repair-case | manual | other",
  "status": "ready | pending | unsupported | conflict"
}
```

`family` describe dónde se abre el archivo. `role` describe qué significa.
Por lo tanto, un archivo `image.pdf` puede ser `family: pdf` pero no puede
presentarse como `role: schematic`. Un PDF de imagen, una capa PCB o un caso de
reparación no se vincula automáticamente como esquemático.

La pareja PDF-PCBE tendrá una identidad separada y sólo se marcará como
verificada cuando coincidan marca, modelo, placa/revisión y evidencia técnica.
Compartir carpeta o palabras parecidas no alcanza.

## Contrato de `Catalog.json`

El catálogo maestro tendrá una única versión vigente, `generatedAt`,
`inventoryFingerprint`, `totalAssets`, contadores por `family/platform/brand`,
y la lista completa de activos. La escritura será atómica mediante archivo
temporal y rename.

El catálogo no debe conservar activos históricos que no estén en el inventario
físico vigente. Para evitar ocultar una tanda mientras el worker la procesa,
la aplicación puede combinar temporalmente el snapshot JSON con
`schematics.assets`, pero debe mostrar el estado de reconciliación y eliminar
la discrepancia cuando termine la importación.

## Árbol de la interfaz

El árbol inicial debe comenzar compacto, como en la referencia visual, y no
descargar los 21.000 activos al abrir la página:

```text
Todos
├── PDF
│   ├── Marca
│   │   └── Modelo comercial
│   │       ├── Esquemáticos
│   │       ├── Manuales
│   │       └── Casos de reparación
├── PCBE / PCB
│   ├── Marca
│   │   └── Modelo comercial
│   │       ├── Placas
│   │       └── Variantes
├── Consolas
│   └── Xbox / Nintendo / PlayStation / Steam Deck
└── Laptop y PC
    └── Laptop / Monitor-TV / Graphics card / PC Motherboard
```

El endpoint del árbol entrega un resumen compacto con conteos globales y
`children` bajo demanda. La lista de archivos se pagina. La búsqueda consulta
el índice, no realiza un escaneo remoto por cada tecla ni por cada apertura.
Al seleccionar un modelo se limpian las contrapartes anteriores y se abren
sólo los archivos compatibles de ese modelo.

## Flujo de migración segura

1. Descubrir las cinco fuentes actuales y el destino montado real.
2. Crear manifiesto de ruta, extensión, tamaño, SHA-256, marca, modelo, rol y
   clasificación.
3. Clasificar conflictos, duplicados y activos ambiguos sin moverlos.
4. Crear backup del catálogo y de la base antes de cualquier movimiento.
5. Copiar candidatos nuevos a `.incoming-scraping/<lote>` dentro del volumen.
6. Validar permisos, lectura desde la aplicación y lectura desde FileBrowser.
7. Publicar cada archivo en la ruta canónica sin sobrescribir.
8. Generar `Catalog.json` desde el inventario físico reconciliado.
9. Ejecutar el worker técnico con concurrencia acotada e idempotencia por
   `assetId + sha256`.
10. Sincronizar páginas, fragmentos y embeddings del RAG V2.
11. Repetir conteos y búsquedas reales en varios móviles, una consola y un
   equipo laptop/PC.
12. Mantener un reporte del lote hasta que no existan conflictos sin explicar.

No se usará `rsync --delete`, `mv` masivo, borrado del catálogo, borrado de
vectores ni dos workers manuales en paralelo.

## Contrato entre capas

```text
archivos físicos
  -> inventario SHA-256 y clasificación
  -> Catalog.json + schematics.assets
  -> índice técnico y páginas PDF
  -> pairing verificado PDF-PCBE
  -> RAG V2 con marca/plataforma aisladas
  -> árbol y Workbench del técnico
```

Cada capa debe poder informar `assetId`, SHA, ruta canónica y estado. Si una
capa está atrasada, se muestra pendiente; no se reemplaza la evidencia por
conocimiento general ni se declara el RAG sincronizado por tener el archivo
presente.

## Criterios de aceptación

- El árbol inicia cerrado/compacto y muestra conteos globales correctos.
- PDF, PCBE y PCB aparecen en sus familias y roles correctos.
- Un PDF `image.pdf` no se abre como esquemático.
- Un PCBE abre su contraparte PDF sólo cuando la pareja está verificada.
- Se encuentran consolas y equipos laptop/PC sin condiciones por modelo
  individual.
- Los conteos del catálogo, inventario, índice técnico y RAG pueden compararse
  para la misma fotografía.
- Una nueva tanda no obliga a cambiar código ni a reorganizar manualmente el
  árbol.
- La búsqueda no dispara escaneos completos ni degrada el servidor.
- Se prueban varios modelos de Samsung, iPhone, Motorola, Xiaomi, una consola
  y un equipo laptop/PC.
- La documentación de operación queda actualizada junto con el código.

## Fuera de alcance de esta especificación

- Inventar modelos comerciales cuando la evidencia sea ambigua.
- Eliminar carpetas antiguas sin manifiesto y backup.
- Cambiar el volumen `/mnt/data2` o crear un almacenamiento paralelo.
- Reindexar a ciegas toda la base de vectores como solución de emergencia.
- Resolver con el árbol visual un problema de permisos o de montaje.

