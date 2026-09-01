# Verificación de la biblioteca MARVEL

## Modo predeterminado

Auditoría de sólo lectura. Las correcciones de estado deben ser explícitas, reproducibles y basadas en el árbol físico actual.

## Comprobaciones mínimas

1. Integridad SQLite: `PRAGMA integrity_check` y `PRAGMA foreign_key_check`.
2. Cada `files.canonical_path` debe resolverse como ruta relativa o absoluta, normalizando separadores `\\`/`/`, existir, ser un medio permitido y tener hash/tamaño comparables.
3. La raíz superior debe pertenecer a la taxonomía vigente; `99 - PEDIDO` sólo puede contener staging y auxiliares.
4. `location_status='located'` sólo si el archivo está físicamente en su ruta canónica.
5. `metadata_status='complete'` sólo si serie oficial, volumen, número, año editorial, idioma, universo y destino canónico están presentes o explícitamente no aplican; `needs_metadata` no invalida una ubicación ya verificada.
6. Los pedidos en `needs_download` no deben confundirse con los ya `staged`, `located` o `complete`.

## Resultado

Emitir conteos por estado, faltantes, colisiones, corruptos y rutas fuera de taxonomía. No convertir una carpeta vacía de `FALTANTES` en prueba de que todos los pedidos estén completos: la prueba es la correspondencia SQL + física + SHA.
