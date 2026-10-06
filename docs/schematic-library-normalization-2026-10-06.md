# Normalización de biblioteca — 6 de octubre de 2026

Se reorganizó la biblioteca real compartida por MACCELL CRM y Filebrowser,
con acceso SSH al servidor `maccell`. No se creó otra biblioteca ni se
regeneraron las bases.

## Resultado físico y referencias

- Volumen: `/mnt/data2`; Filebrowser lo monta en `/srv/disco-1-8tb-B` y CRM en
  `/app/upload/schematics/sources`. Ambos leen como UID/GID 1000.
- Inventario original: 9.665 archivos, aproximadamente 33,44 GiB, sin incluir
  staging oculto ni respaldos anteriores.
- Publicación: 8.053 PDF, 1.460 archivos de placas (incluidos 10 BRD/BV/CAD
  auxiliares que no son PCBE), 138 imágenes/videos y 14 auxiliares archivados.
- Catálogo CRM: 9.503 activos, con los mismos IDs y SHA-256. PostgreSQL conserva
  además filas históricas: no se eliminaron para igualar contadores.
- Se reubicaron las referencias de 7.196 documentos RAG y 793 alias iniciales;
  los ajustes posteriores se aplicaron sobre los mismos IDs.
- Los 9.665 contenidos se verificaron por SHA-256. Cada ajuste posterior tuvo
  su propio manifiesto, hash, backup, actualización transaccional y comprobación.
- Filebrowser pudo leer los 9.503 activos con su propio usuario, sin errores.
- Se verificó entrega HTTP de PDFs por el worker RAG para diez grupos,
  incluyendo consolas y notebooks, y lectura de cabeceras de placas de siete
  marcas/plataformas.

La raíz visible quedó con `pdf`, `pcbe`, `media`, `Backups`, `AGENT.md` y
`AGENTS.md`. Las carpetas históricas vacías o que sólo contenían `.DS_Store`
se archivaron con manifiesto. Las colisiones conservan sufijos de procedencia;
ningún archivo distinto fue sobrescrito. Las 3.268 repeticiones de hash del
catálogo original no se borraron indiscriminadamente: pueden tener IDs,
historial o identidades comerciales diferentes.

## Conservación comprobada antes de reanudar la ingesta

| Datos | Antes | Después de las migraciones |
| --- | ---: | ---: |
| `schematics.pages` | 143.579 | 143.579 |
| `schematics.technical_indexes` | 9.702 | 9.702 |
| Consultas históricas de esquemáticos | 14 | 14 |
| `rag_pages` | 177.145 | 177.145 |
| `rag_chunks` | 215.609 | 215.609 |
| Chats RAG | 44 | 44 |

Estos conteos son una fotografía; la ingesta reanudada puede aumentarlos.
No constituyen prueba de cobertura de extracción de toda la biblioteca.

## Identidades y formatos sin evidencia suficiente

344 archivos quedaron en carpetas `Por revisar`; 85 están en `General`.
Son categorías explícitas, no modelos inventados ni parejas eléctricas.
Se conservaron títulos y procedencia para resolverlos con evidencia técnica.
Se corrigieron 37 asignaciones de marca heredadas en archivos que estaban en
carpetas de consolas pero eran material de otra plataforma sin marca resuelta.

El catálogo conserva sus 9.140 activos `ready` y 363 `unsupported` previos.
La organización no convierte formatos no soportados, archivos bloqueados o
documentos incorrectos en archivos válidos. Esos contenidos permanecen
conservados, sin afirmar que el visor pueda interpretarlos.

## Regla para nuevas incorporaciones

[AGENT de la biblioteca](schematic-library-AGENT.md), instalado en
`/mnt/data2/AGENT.md` y referenciado por `/mnt/data2/AGENTS.md`, es la norma
vigente. También se actualizaron la skill de ingesta y la entrada del repositorio.

El lector del CRM ahora conserva el modelo completo de las rutas canónicas,
incluidos los modelos compartidos y variantes. Los materiales de revisión o
generales no producen coincidencias automáticas entre dispositivos.

Comprobaciones de código: 157 pruebas del módulo de esquemáticos, 9 regresiones
Python del organizador, TypeScript, ESLint de archivos afectados, build y
`git diff --check`. La simulación de una segunda aplicación del plan final no
generó cambios adicionales.

## Evidencia y recuperación

En `/var/lib/maccell/upload/.library-maintenance/`:

- `2026-10-06-normalization`: inventario, journal, catálogo y filas anteriores,
  recibo de reconciliación, manifiesto final y verificaciones.
- `2026-10-06-refinement`, `2026-10-06-shared-models` y
  `2026-10-06-taxonomy`: manifiestos y backups de las correcciones de nombres.

Los manifiestos también están en `/mnt/data2/.library-history/`. No contienen
credenciales. Los backups de filas están restringidos en el volumen del CRM.
Para reversión se recorren las tandas en orden inverso, siguiendo el AGENT.

La apertura visual en las sesiones de usuario de MACCELL y Filebrowser requiere
login: las dos pestañas de Chrome disponibles mostraron la pantalla de acceso.
La lectura desde los contenedores y las pruebas internas del servicio se
verificaron por separado; no se presentan como una prueba visual autenticada.
