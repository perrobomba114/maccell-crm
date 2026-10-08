# Normalización de iPhone — 2026-10-06

Preferencia confirmada: `pcbe/iPhone/14 Pro Max/` y `pdf/iPhone/14 Pro Max/`.
Las imágenes quedan con los PDF. iPad tiene raíz propia. El catálogo conserva
marca APPLE y nombre completo iPhone; no altera identidad eléctrica por presentación.

- 3.208 archivos reorganizados, 364 PCBE de iPhone; todos comprobados por SHA-256,
  tamaño y lectura final, sin faltantes ni modificaciones de contenido.
- 128 documentos recuperaron la carpeta de modelo desde su procedencia registrada.
- Los falsos modelos 18, 19 y 95 eran rangos de páginas: ahora material General.
- 63 contradicciones adicionales entre carpeta y nombre: 20 resueltas con hash o
  procedencia; 43 separadas en Por revisar, conservando la carpeta original en el
  nombre. No implican compatibilidad. Otro documento 14/14 Plus contra una carpeta
  14 Plus/14 Pro Max también queda en revisión.
- 1.030 directorios vacíos PDF/PCBE retirados; inventario de archivos idéntico antes
  y después. CURSO no se movió ni renombró; sus cargas siguieron activas.
- Las 9.503 identidades anteriores se conservaron. Durante la comprobación llegaron
  dos PDF nuevos de CURSO: catálogo 9.505, sin IDs anteriores eliminados.
- RAG: rutas de 2.045 documentos reconciliadas; 1.197 identidades de documento y
  8.365 etiquetas de fragmentos corregidas, manteniendo IDs y vectores.
- CRM y worker desplegados desde 3443da9b9b2ab1e6685f6bb807d957baedc027ed mediante
  Dokploy. Versión HTTP y contenedor 1791303699.
- Filebrowser verificado en navegador con la cuenta maccell: carpeta 14 Pro Max
  contiene sólo sus ocho archivos, sin los dos flex Pro que estaban mezclados.
- Funciones del CRM ejecutadas en producción: árbol iPhone con 72 modelos/categorías,
  búsqueda de PCBE iPhone 14 Pro Max y boardview decodificado con 25.248 geometrías.
- Diez muestras PDF servidas por RAG con HTTP 206 y cabecera %PDF, incluidas iPhone
  e iPad. El navegador CRM requiere login; no se verificó su recorrido autenticado.

Pruebas: 14 del organizador, 18 del inventario RAG, pruebas TypeScript de árbol e
inventario, ESLint pertinente, tipos y build. El guard nuevo rechaza contradicciones
modelo/nombre en carpetas canónicas para requerir revisión antes de importar.

Evidencia física: `/mnt/ESQUEMATICO/.library-history/2026-10-06-product-families/`.
Backups y recibos SQL: `/var/lib/maccell/upload/.library-maintenance/2026-10-06-product-families/`
y `2026-10-06-iphone-conflicts/`. No contienen secretos de conexión.

Pendiente real: identificar por contenido los documentos contradictorios apartados;
no se inventaron modelos para darlos por resueltos. Los duplicados históricos con
IDs propios conservan sus referencias y sufijos de origen.
