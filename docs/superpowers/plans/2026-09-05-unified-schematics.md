# Unified schematics implementation plan

**Goal:** Unificar PDF y PCB/PCBE con navegación recíproca y evidencia recuperable en Cerebro.
**Architecture:** Índice versionado por archivo con páginas/ubicaciones y componentes reales, persistido localmente y en PostgreSQL. Reutilizar identidad verificada y servicios RAG existentes.
**Tech Stack:** Next.js 15, React 19, TypeScript, PostgreSQL, PDF.js, Poppler/Tesseract.
**Spec:** docs/superpowers/specs/2026-09-05-unified-schematics-design.md

## Constraints
Trabajar en main. Sin datos ni pistas inventados. No mezclar modelos/revisiones. Archivos nuevos menores de 300 líneas. Mantener archivos originales e índices vigentes ante error. Autenticar APIs privadas.

- [x] Integrar ramas por ancestry; baseline `npm test`: 332 pasan.
- [x] Índice común: `src/lib/schematics/unified-index.ts` define `TechnicalIndex` version 1, assetId, sha256, pages [{page,text,source,boxes:[{text,x,y,width,height}]}], components [{id,name,kind,pads}], nets [{id,name}]. `index-store.ts` lee índices vigentes; `scripts/index-technical-library.ts` extrae y persiste por archivo con estado/reintentos y sincroniza DB. Tests de hash, palabras exactas y límites de coordenadas.
- [x] Visores: ampliar `pdf-reader.tsx`, `pdf-panel.tsx`, `workbench.tsx` para cajas persistidas, centrado, elección/autoapertura de documento compatible y selección recíproca. API references devuelve matches y boxes. Tests selección ambigua y aislamiento.
- [x] Cerebro: retrieval común desde índice DB, contrato BOARD y enlaces verificados de biblioteca en fuentes. Preservar retrieval PDF/REPAIR actual y fallback independiente. Tests aislamiento, exactitud y caída de embeddings.
- [x] Operación: estado de índice y procesamiento administrativo reanudable en API/UI; soporte `.pcb` sujeto a firma real. Procesar biblioteca real y comprobar cobertura/errores.
- [ ] Revisar cambios, ejecutar `npm test`, `npx tsc --noEmit`, ESLint tocados, `git diff --check`, build aislado y QA navegador. Publicar main y verificar commit/deploy con dokploy_maccell.

## Execution ledger
Ruling: ramas de documentación se fusionaron conservando contenido actual; el merge de Claude no cambió archivos porque su contenido ya había sido superado.

Validación previa a publicación: 358/358 pruebas, TypeScript sin errores, ESLint tocados sin errores, diff-check limpio y build completo. QA local OCR/API/SQL y navegador desktop/móvil pasa. Fixture temporal eliminado. Indexación de corpus completo continúa en worker; ninguna identidad real fue inventada ni validada automáticamente.
