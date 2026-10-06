# Normalización contra SCRAPING — 2026-10-06

## Alcance y fuente

Biblioteca compartida `/mnt/ESQUEMATICO`, disco de 4 TB, expuesta por Filebrowser en `/esquematicos` y por CRM en `/app/upload/schematics/sources`. Se conservaron CURSO, COMICS y las descargas locales. La decisión del usuario fue mantener **carpetas separadas por código regional completo**.

Se contrastaron los catálogos locales de `/Users/David/Desktop/SCRAPING/captures/catalog`: 72.781 referencias PDF y 28.088 referencias PCB. Se calcularon los hashes de los 17.862 archivos descargados, con 4.725 contenidos distintos, contra los publicados y los conservados en staging/exclusiones del servidor. Una referencia de catálogo no acredita que exista una descarga válida.

## Cambios físicos y de identidad

- 5.385 archivos reorganizados, con 5.257 referencias del catálogo reconciliadas y 128 archivos multimedia acompañando a sus modelos.
- 419 asociaciones de códigos Samsung documentadas en `scripts/data/schematic-samsung-reference.json`, con procedencia y excepciones explícitas. Las asociaciones ambiguas no se resuelven por suposición.
- Carpetas como `pdf/Samsung/A02 SM-A022F`, `A02s SM-A025F`, `A10 SM-A105F` y `A10 SM-A105M`. Los códigos sin sufijo conocido conservan su familia.
- Motorola conserva códigos XT y variantes; se corrigieron cinco PDF de Moto C Plus que habían quedado en Moto C. Xiaomi, Huawei, Honor, LG y Realme conservaron las variantes documentadas y normalizaron la presentación.
- El árbol del CRM respeta los nombres completos de las carpetas canónicas.
- Las rutas se reconciliaron preservando IDs, SHA, páginas, vectores e historial. Un control detectó 59 PDF incluidos como auxiliares en el primer manifiesto: se restauraron los enlaces y se completó la reconciliación antes de publicar nuevos activos. El reconciliador ahora rechaza cualquier movimiento que omita una identidad del catálogo; se comprobó con un manifiesto negativo contra producción, sin mutaciones.
- Dos alias erróneos del RAG que asociaban SM-A025F a A02 se respaldaron y retiraron. La generación de alias reconoce la raíz `pdf`, A02s y familias iPhone, y excluye staging/revisión.

A022 corresponde a A02 y A025 a A02s, contrastado con [Samsung A02](https://www.samsung.com/ar/support/model/SM-A022MZBJUYO/) y [Samsung A02s](https://www.samsung.com/pk/support/model/SM-A025FZBFMEB/).

## Recuperación y límites comprobados

- 87 PCBE nuevos publicados y decodificados con geometría. Un archivo adicional sin geometría permanece en staging.
- 189 PDF recuperados, únicos por SHA frente al catálogo publicado. Se comprobó su lectura y se revisó su texto para identificar el modelo.
- 98 PDF tienen identidad sustentada por contenido; 91 quedan visibles en `pdf/Por revisar/Identidad pendiente`, sin emparejamiento automático y excluidos del RAG.
- 10.343 nombres locales contienen el mismo catálogo de 6.416.326 bytes; otros 318 nombres repiten otro catálogo y tres descargas de iPhone 16 repiten un tercero. No son 10.664 placas distintas recuperables y no se incorporaron como placas utilizables. El catálogo anterior ya contenía 363 copias del primer catálogo, todas marcadas `unsupported`. Se apartaron en `pcbe/Por revisar/Catalogos de descarga`, conservando sus IDs y excluyéndolas del lector del CRM.
- Diez archivos BRD/BV/CAD (seis contenidos distintos) ya estaban en el servidor; el parser actual no devuelve geometría para ellos. Se conservaron sus rutas y se incluyeron en pendientes, sin renombrarlos a PCBE.
- Se conservaron las 9.505 identidades del catálogo anterior. Después de incorporar 276 activos, el catálogo físico contiene 9.781 entradas. El lector del CRM presenta menos resultados porque filtra formatos no soportados y agrupa duplicados de contenido dentro del mismo modelo.

## Auditoría y navegación

Estado operativo y backups: `/var/lib/maccell/upload/.library-maintenance/2026-10-06-reference-normalization`. Se conservan el manifiesto original, tres fases de reconciliación complementarias, `effective-manifest.json`, recibos, hashes y backups de metadatos. Las correcciones finales de nueve archivos se reflejan en el manifiesto efectivo; no se debe interpretar una fase intermedia como el estado final.

`.CATALOGO` en Filebrowser contiene `ARCHIVOS.csv`, `RECUPERADOS.csv`, `PENDIENTES.csv`, `REFERENCIA-SCRAPING.csv`, `REFERENCIA-SAMSUNG.json` y `DESCARGAS-REPETIDAS.csv`. Las instrucciones quedan unificadas en `AGENTS.md` en la biblioteca, con normas para nuevas incorporaciones. Estos índices son una fotografía de la tanda y deben actualizarse en la siguiente.

Comprobaciones realizadas: SHA de los 5.385 movimientos y 276 incorporaciones; ninguna identidad original perdida; ningún archivo del catálogo ausente; permisos del lote compatibles con UID/GID 1000. Filebrowser mostró CURSO y CATALOGO, y abrió y mostró el PDF de 11 páginas A02 SM-A022F. La prueba dentro del contenedor confirmó búsqueda por código completo, variantes separadas en el árbol, lectura de los 189 PDF y geometría de los 87 PCBE nuevos. No se contó como validación del visor autenticado del CRM: no había sesión de navegador disponible.

Validaciones de código: build, TypeScript, ESLint puntual, 23 tests Node de árbol/inventario, 16 tests del organizador, 18 tests de inventario RAG más tres funciones adicionales y ocho tests de alias. La indexación técnica terminó con los 276 activos recuperados en `indexed`, sin fallos. Los PDF recuperados suman 1.407 páginas. La indexación técnica y RAG se registran separadamente en los logs y auditorías de esta tanda; no inferir su finalización por la presencia física de archivos.

## Cierre operativo verificado

CRM y Compose RAG desplegados en `082ca02b23b06470d2fc62ca26ffd015e8ea9869`; el CRM sirve la versión `1791310702`. La auditoría final encontró 9.781 entradas coincidentes entre catálogo y SQL, ninguna ruta ausente y ninguna página técnica con hash desactualizado. Se conservaron las 9.505 identidades previas.

Los 98 PDF recuperados con identidad confirmada están `READY` en RAG, con 374 fragmentos y sus 374 embeddings; los 91 pendientes de identidad están excluidos. Se abrieron dos PDF por el endpoint del worker con respuesta parcial válida. Una consulta real de embeddings y recuperación devolvió diez resultados para SM-A022F, sin A025/A02s, y diez para SM-J200F. La ingesta secuencial habitual volvió a funcionar y mostró procesamiento sin fallos en la comprobación posterior al despliegue.

`.CATALOGO/ESTADO-INDEXACION.json` conserva estas verificaciones y `.library-history/2026-10-06-reference-normalization` contiene las auditorías finales y el manifiesto efectivo. La finalización de esta tanda no acredita que estén descargadas todas las referencias del proveedor ni resuelve los archivos señalados para revisión.
