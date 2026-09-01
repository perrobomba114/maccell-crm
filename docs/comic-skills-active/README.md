# Flujo activo de cómics MARVEL

Estas son las únicas instrucciones activas para el proyecto de cómics. El catálogo operativo es `/mnt/COMICS/catalog/marvel_library.sqlite` en MACCELL (`maccell@100.127.204.5`).

Orden de autoridad:

1. El árbol físico y su SHA-256 prueban si un archivo existe y dónde está.
2. SQLite registra identidad editorial, solicitud, procedencia y estado.
3. `PEDIDO.md`, `ComicInfo.xml`, cachés viejos y resultados históricos no son fuentes activas.

La descarga sólo coloca archivos verificados en staging. La incorporación es la única operación que puede moverlos a una ubicación editorial final. Cada transición debe dejar evidencia en SQLite y, cuando corresponda, un manifiesto.

Skills activas:

- `comic-project-source-of-truth`: contrato del catálogo y estados.
- `comic-acquisition`: búsqueda/descarga controlada y staging.
- `comic-placement`: incorporación y ubicación canónica.
- `comic-verification`: auditoría física y de SQLite.

No consultar Internet para ordenar si la identidad ya está en SQLite. No inventar serie, volumen, número, año, idioma, universo o destino: usar `needs_review` cuando falte evidencia.
