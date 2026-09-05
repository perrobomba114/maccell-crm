# Biblioteca técnica unificada

Aprobado por David: implementar toda la integración y trabajar exclusivamente en main; integrar todas las ramas pendientes sin revertir mejoras actuales.

La biblioteca conserva archivos originales. Cada índice está versionado por SHA-256 y versión del extractor. PDFs: páginas, texto y cajas normalizadas (0..1) para referencias, incluyendo OCR con coordenadas cuando esté disponible. PCB/PCBE: componentes, pads, redes y coordenadas reales del parser; extensiones PCB solo se admiten si su contenido es decodificable. Ningún enlace entre archivos se presume por la carpeta: exige identidad técnica verificada y compatible.

Un worker CLI reanudable procesa archivos individualmente con registro persistido de estado, falla por archivo y no invalida índices vigentes ante fallos. Los índices locales se sincronizan a PostgreSQL para búsqueda exacta y recuperación por Cerebro; búsqueda semántica aprovecha el worker y versión de embeddings existentes. La búsqueda exacta sigue funcionando sin embeddings. Estados y reintentos son visibles en el visor con acceso administrativo para encolar.

El visor abre automáticamente el único documento compatible; si hay varios permite elegir. Selección en placa navega al PDF y centra su caja; selección en PDF centra placa y activa capa. Múltiples ocurrencias son navegables. Peticiones obsoletas se cancelan; sin referencia no se inventa una localización.

Cerebro recupera documentos y componentes del modelo exacto además de la evidencia existente. Cada fuente ofrece enlace a la mesa de trabajo. Evidencia OCR se distingue. El contexto continúa limitado a 8000 caracteres; nunca deriva mediciones de geometría.

Validación: tests de aislamiento, integridad, tokenización, coordenadas, selección, reindexado y fallbacks; archivos reales; TypeScript, ESLint, build, navegador desktop/mobile. Publicación en main y seguimiento terminal con dokploy_maccell.
