# OCR de esquemáticos

El OCR se ejecuta localmente y conserva el PDF original. Cada petición autenticada procesa entre una y tres páginas y guarda texto, número de página, origen `ocr` y SHA-256 del PDF usado.

El contenedor de producción necesita `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-eng` y `tesseract-ocr-spa`. La imagen del proyecto instala esos paquetes. `SCHEMATICS_OCR_LANGUAGES` acepta códigos separados por `+` y por defecto usa `spa+eng`. Si falta uno de los idiomas solicitados, el endpoint utiliza los disponibles y lo declara con `languageFallback`; si no queda ninguno, rechaza el trabajo con un error explícito.

El endpoint es `POST /api/schematics/:id/ocr` con `{ "pages": [1] }`. No se deben enviar lotes completos por HTTP; la API limita la operación a tres páginas para mantener acotados CPU, memoria y tiempo.
