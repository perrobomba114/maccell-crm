# Biblioteca de esquemáticos, PCBE y Cerebro RAG

Este documento describe el flujo real de los archivos técnicos en MACCELL. La
biblioteca no tiene una única fuente lógica: el archivo físico, el catálogo, el
índice técnico y el RAG cumplen funciones diferentes y deben reconciliarse por
ruta relativa y SHA-256. La estructura física canónica y sus reglas completas
están documentadas en
[`docs/superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md`](superpowers/specs/2026-09-08-biblioteca-esquematicos-estructura-canonica-design.md).

## Flujo de datos

```text
/mnt/data2 (producción)
        │ montaje: /app/upload/schematics/sources
        ▼
discoverPhysicalAssets()
        │ hechos físicos: ruta, tamaño, SHA-256, tipo
        ▼
catalog.json + schematics.assets
        │ identidad de dispositivo y estado del archivo
        ▼
technical-worker (scripts/index-technical-library.ts)
        │ páginas, componentes, redes, OCR y jobs
        ▼
schematics.pages / technical_indexes / index_jobs
        │ fuente técnica del Workbench
        ▼
RAG V2 (maccell-rag-worker → maccell-rag-db)
        │ rag_documents → rag_pages → rag_chunks + embeddings 1024
        ▼
Cerebro AI
```

Durante una carga masiva, `catalog.json` puede quedar temporalmente atrasado
respecto de `schematics.assets`. La biblioteca combina ambas fuentes para que
los activos que el worker ya descubrió no queden ocultos mientras se actualiza
el snapshot JSON. Por eso `1215/21561` significa **1.215 índices técnicos
actuales sobre 21.561 activos del inventario**; no significa que sólo existan
1.215 archivos.

Cuando el inventario técnico ya es mayor que el snapshot JSON, prevalece ese
inventario para evitar sumar registros históricos que sólo quedaron en
`Catalog.json`. Si todavía es menor durante una ingesta, se conserva el
snapshot completo hasta que el worker alcance la misma fotografía física.

## Responsabilidad de cada capa

| Capa | Fuente de verdad | Qué puede hacer | Qué no debe hacer |
| --- | --- | --- | --- |
| Archivos físicos | `/mnt/data2` | Conservar PDF, PCBE y PCB reales | No mover, borrar ni sobrescribir durante una ingesta normal |
| Catálogo | `catalog.json` y `schematics.assets` | Exponer identidad, tipo, tamaño, hash y estado | No inventar archivos que no existen en el montaje |
| Índice técnico | `schematics.pages`, `technical_indexes`, `index_jobs` | Extraer texto, OCR, componentes y redes | No conservar una entrada como vigente si cambia la ruta o el SHA |
| RAG V2 | `rag_documents`, `rag_pages`, `rag_chunks` | Recuperar evidencia textual por marca/modelo y hash | No mezclar marcas ni aceptar documentos con SHA obsoleto |
| Workbench | `/technician/schematics` | Abrir PCBE y PDF y navegar referencias | No vincular automáticamente un PDF de imagen, layout o caso de reparación como esquemático |

## Reglas de identidad y vinculación

- La marca y el modelo se derivan de la identidad declarada y del camino
  físico; el nombre de una carpeta por sí solo no prueba una equivalencia
  eléctrica.
- Un PDF sólo es contraparte automática del PCBE si su nombre lo clasifica como
  esquemático/circuit diagram y pasa la identidad de dispositivo. Un archivo
  `image.pdf`, `boardview`, `PCB layer`, layout o repair case queda como
  documentación independiente.
- La vista del árbol es virtual y estable: `PDF/PCBE → Marca → Modelo comercial →
  Placas/Esquemáticos/Casos de reparación/Accesorios/Documentos`. Esto no mueve
  archivos físicos ni cambia sus rutas históricas.
- Las consolas y marcas nuevas se agrupan por la identidad observada; no deben
  agregarse condiciones por modelo individual.

## Indicadores que deben coincidir

Una sincronización completa exige verificar, para la misma fotografía del
montaje:

1. cantidad y SHA-256 de archivos físicos;
2. cantidad de activos vigentes del catálogo/base;
3. `index_jobs` y `technical_indexes` actuales por SHA;
4. documentos y páginas RAG vigentes por ruta + SHA;
5. una búsqueda real que devuelva el PDF/página esperados para varios modelos y
   una consola.

Los contadores de la interfaz son indicadores, no una prueba de sincronización.
Un estado como `1215/21561` debe investigarse junto con los estados de jobs y
los documentos RAG antes de declarar la biblioteca operativa.

## Operación segura

- Las nuevas tandas se incorporan con el runbook
  `docs/schematics-ingestion-runbook.md` y la skill de ingesta.
- La publicación física final usa `pdf/<MARCA>/<MODELO COMERCIAL>` y
  `pcbe/<MARCA>/<MODELO COMERCIAL>`; `/app/upload/schematics/sources` es el
  mount de compatibilidad que consume el CRM.
- El worker técnico usa concurrencia acotada y refresco de inventario espaciado;
  nunca se debe iniciar un escaneo completo por cada carga de página.
- No ejecutar `scripts/index-schematics-vectors.mjs` para RAG V2: ese script
  pertenece al índice legado `schematics.chunks`, mientras Cerebro V2 consulta
  `rag_documents/rag_pages/rag_chunks` mediante `maccell-rag-worker`.
- Una reorganización física requiere staging, manifiesto SHA-256, backup de
  catálogo, reporte de conflictos y verificación posterior. La reorganización
  visual del Workbench no reemplaza esa reconciliación.

## Estado conocido al 2026-09-08

- Producción usa el servicio `MACCELL CRM` y un worker RAG separado en
  Dokploy; el montaje operativo esperado es `/mnt/data2`.
- Antes de `7078034`, la página mostraba `492 placas`, `3314 PDF` y `3806
  archivos`, aunque el índice técnico ya reportaba `1215/21561`.
- `7078034` hizo visibles los activos del inventario técnico; la corrección
  posterior evita sumar las entradas históricas que sólo existen en el JSON.
- El problema de vinculación de un PDF `image` como esquemático está cubierto
  por clasificación de roles y pruebas de regresión.
- La normalización visual de marca/modelo está implementada con heurísticas
  genéricas y pruebas para Samsung, Apple y PlayStation.
- La cobertura física completa, la reconciliación total del catálogo y la
  cobertura RAG deben seguir verificándose en producción; no se consideran
  terminadas sólo porque el contenedor esté verde.
