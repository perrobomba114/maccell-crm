# Esquemáticos del técnico

La biblioteca se abre desde Taller → Esquemáticos o desde una reparación. El acceso contextual conserva la orden y prefiltra marca/modelo; un técnico sólo puede escribir en el cuaderno de sus reparaciones asignadas. El administrador tiene acceso a todas.

## Consulta
- La biblioteca busca por modelo, alias, marca y código de placa; tiene filtros de archivo y paginación de 40 resultados.
- Estrella: favoritos del usuario en este navegador. Recientes conserva los últimos 12 archivos.
- Placa/PDF/Dividido conservan los visores montados: alternar la vista no pierde zoom ni página.
- El enlace «Abrir esta vista» y «Copiar enlace» incluyen placa, PDF, componente, red, página y orden. La última selección se recupera al volver sin parámetros.
- Inspector se abre como panel lateral en tablet y como panel inferior en móvil.
- Las referencias de una capa oculta activan sus capas al centrar.

## Identidad técnica
Una carpeta compartida no acredita compatibilidad. El administrador valida marca, modelo, código de placa y revisión en el Inspector de cada archivo. Sólo se sincronizan las referencias de archivos con identidad validada y compatible. Los documentos aún sin validar se pueden abrir y consultar individualmente; no se inventan códigos ni revisiones. Las identidades se asocian al archivo vigente.

## Búsqueda y OCR
La búsqueda textual funciona sin el servicio vectorial. La semántica exige relevancia mínima y versión vigente del archivo y del texto de la página. Si no hay evidencia suficiente, la interfaz lo indica. Los resultados siempre incluyen archivo y página; OCR se identifica como tal.

«Reconocer página» extrae texto de la página actual conservando el PDF. Usa Poppler/Tesseract del servidor, valida el número real de páginas y limita el trabajo. Ver `schematics-ocr.md` para dependencias e indexación. El índice semántico debe actualizarse con el script de vectores después de incorporar o reconocer documentación; los fragmentos antiguos se rechazan mientras tanto y la búsqueda textual sigue disponible.

## Cuaderno
Abrir esquemáticos desde la tarjeta de reparación habilita el cuaderno. Permite notas o mediciones con componente, pad, valor y unidad. Acepta coma decimal. Distingue «Medido en placa» y «Valor documentado»: este último requiere PDF y página real, y compatibilidad validada cuando se asocia a otra placa. Guarda autor, fecha de Argentina y enlace de consulta. Las consultas se deduplican por orden, archivo y autor.

## Validación local
`npm test` enumera recursivamente todos los tests, sin depender del glob del shell.

Pruebas de integración opt-in, restringidas a la DB local localhost:5434 y aplicación localhost:3000:

```sh
SCHEMATICS_QA_LOCAL=1 node scripts/test-schematics-integration.mjs
SCHEMATICS_QA_LOCAL=1 node scripts/test-schematics-ocr.mjs
```

Crean registros sintéticos, comprueban APIs y eliminan únicamente sus fixtures en `finally`. No ejecutar contra producción.

Para compilar sin interferir con el servidor de desarrollo:

```sh
MACCELL_BUILD_DIR=.next-schematics-check npm run build
```

Las migraciones son aditivas. Consultar el commit y estado del deploy para verificar la versión publicada.

## Pantalla completa y navegación
- «Ampliar» ocupa el viewport y solicita pantalla completa al navegador cuando está disponible. Biblioteca e Inspector se cierran al entrar y pueden reabrirse.
- «Ocultar controles» o **H** activa «Sólo documento». **H** o el botón flotante vuelve a mostrar las herramientas. **Esc** sale de la vista ampliada.
- PCBE y PDF: arrastrar para mover, rueda para zoom, **Shift + rueda** para desplazamiento horizontal. Con el área de dibujo enfocada: **+ / −**, **0** para ajustar y flechas para mover. En PCBE, **F** centra la selección.
- PDF: botones para ajustar al ancho o ver la página completa. El zoom conserva el punto bajo el cursor y la resolución de renderizado se limita para evitar canvases excesivos.

## Índice técnico unificado (2026-09-05)

El contenedor ejecuta un worker independiente junto a Next.js, después de las migraciones. Procesa automáticamente los archivos pendientes del catálogo y reanuda tras reinicios. El original se conserva; cada índice contiene SHA-256, versión de extractor, fingerprint físico y ubicaciones reales. Los `.pcb` se importan como placa únicamente si el parser reconoce su contenido; la extensión sola no acredita compatibilidad.

Biblioteca → Índice técnico muestra progreso y permite al administrador reintentar pendientes. Inspector/Estado del PDF permite reindexar un archivo. OCR manual actualiza inmediatamente las cajas de la página; un índice parcial queda en cola para completar el documento. Dos escritores no pueden reemplazar silenciosamente OCR reciente: un conflicto reencola la extracción. Archivos modificados requieren recatalogación y nueva validación de identidad.

La apertura de un archivo busca su contraparte en ambas direcciones. Solo abre automáticamente un único par con identidad compatible validada; los demás candidatos se muestran para elección. Un clic localiza la referencia en el otro visor, activa su capa, acerca el PDF a texto legible y permite recorrer múltiples apariciones. Cajas que contienen varias referencias requieren elegir. Los PDFs híbridos combinan texto nativo y OCR de las imágenes; las lecturas OCR deben cotejarse visualmente.

Cerebro combina su RAG existente de PDF/reparaciones con el índice técnico de bibliotecas verificadas. Placas aportan componentes y redes, sin inferir mediciones. Fuentes BOARD/PDF incluyen enlaces internos a componente/página. El índice de biblioteca funciona por palabras y referencias incluso si no están disponibles los embeddings; conserva los límites de contexto y la prioridad de evidencia documentada.

Operación manual dentro del contenedor:

```sh
node scripts/technical-worker.cjs --retry-failed
```

El modo continuo usa `--watch`. Para generar el ejecutable local: `node scripts/build-technical-worker.mjs`; luego ejecutar con `node --env-file=.env scripts/technical-worker.cjs`. No usar `--force` salvo que se desee volver a extraer toda la biblioteca.

Verificaciones de esta integración: 358 pruebas unitarias iniciales finales, TypeScript, ESLint, build aislado, fixture OCR con coordenadas, APIs autenticadas/aislamiento, recuperación SQL real BOARD/PDF y navegación navegador desktop/móvil (390 px sin overflow). Las identidades de las fixtures son sintéticas y no certifican compatibilidad de documentos reales.
