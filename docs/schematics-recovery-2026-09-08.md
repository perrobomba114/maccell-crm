# Recuperación de la biblioteca — 8 de septiembre de 2026

## Evidencia inicial verificada

- Montaje CRM: `/mnt/data2` → `/app/upload/schematics/sources`.
- Catálogo leído por el CRM: `/app/upload/schematics/catalog.json`, 3.806 entradas.
- `/mnt/data2/Pcbe/Catalog.json`: manifiesto de adquisición, 17.613 entradas. No es el catálogo consumido por el CRM y sus rutas usan otra raíz.
- Base técnica: 21.561 registros, 15.311 jobs fallidos: 10.662 sin geometría, 4.462 EACCES, 144 ENOENT y otros errores.
- Tres supuestas placas de Nintendo, PS5 e Infinix son idénticas: SHA-256 `5956ef96d806d0f7b6453d63eb73296b3486714921b7a1a00b81e9f2df1bffe7`. Contienen un catálogo DZKJ con 66.359 referencias `.pdf` y 9.197 `.pcb`, no las placas solicitadas.
- El inventario local de SCRAPING tiene 480 cabeceras XZZPCB y ninguna bajo las carpetas de consolas. No se debe copiar otra vez el mismo catálogo disfrazado de PCB.
- RAG: 6.788 PDF READY y 46 PENDING al inicio. El contador no demuestra vigencia ni cobertura física. Su inventario debe excluir staging y backups.

## Contrato operativo

`SCHEMATICS_ROOT/catalog.json` es el snapshot físico completo publicado atómicamente por el worker, con `inventoryComplete: true`. La base enriquece solamente los archivos de ese snapshot; nunca determina existencia comparando cantidades. Los registros históricos se conservan para trazabilidad, pero no deben inflar el árbol ni la cobertura.

La reconstrucción explícita es `scripts/reconcile-schematic-library.ts`, ejecutada con la raíz montada del CRM. Guarda respaldo del catálogo anterior antes de publicar. No copiar directamente el manifiesto de adquisición: sus rutas carecen del prefijo `sources/`.

La clasificación verifica contenido y conserva los archivos no compatibles con motivo visible. Una descarga con cabecera de catálogo no es una placa indexable. La recuperación exige una nueva fuente validada y conservar el original y sus hashes; cambiar la extensión o reiniciar el worker no la repara.

El árbol recibe todos los resultados, incluidos modelos después del antiguo corte de 5.000. Sólo monta hijos de carpetas abiertas. La identidad omite carpetas de función documental y reconoce fabricantes de consolas y computadoras.

## Respaldo y permisos

Respaldo operativo: `/app/backups/schematics-20260908/`, con `catalog.before.json` y `technical.before.json` (assets y jobs). El UID real del CRM y RAG es 1000; el catálogo y caches técnicos conservaban dueño 1001. Se corrigió únicamente el directorio de trabajo y las entradas de caches con ese dueño.

## Cierre requerido

Registrar inventario reconciliado por SHA, conteos por tipo y motivo de rechazo, estado terminal del deploy CRM/RAG y pruebas reales del árbol, PDF, PCBE compatible y búsqueda RAG. Las descargas inválidas deben permanecer explícitamente pendientes de recuperación; nunca declarar cobertura total por contenedor verde.

## Inventario reconciliado

La lectura completa confirmó 21.417 archivos físicos: 9.784 PDF y 11.633 archivos con extensión de placa. De estos últimos, 972 tienen cabecera XZZPCB y 10.661 contienen catálogos: 10.343 copias del hash `5956ef96…` y 318 del hash `01567353…`. No son 10.661 formatos de placa pendientes de un parser: falta recuperar sus documentos originales.

El manifiesto por ruta y SHA queda en `/mnt/data2/Backups/recovery-20260908/inventory-audit.json`. Todos los originales se conservan. El snapshot excluye 144 registros históricos de la base que ya no tienen archivo físico. Una cabecera XZZPCB o PDF aceptada no equivale a extracción técnica completa; el índice sigue verificando contenido, páginas y geometría.
