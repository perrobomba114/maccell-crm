# Esquemáticos del técnico — implementación

Objetivo: implementar todas las mejoras aprobadas en la revisión del módulo local.
Arquitectura: conservar el visor PCBE/PDF; aislar carga, biblioteca y estado del banco de trabajo. Identidad técnica conservadora y búsqueda documental con evidencia. Persistencia de mediciones en servidor vinculada a orden y autor; preferencias personales separadas.

## Contratos y restricciones
- Preservar todos los archivos locales previos; trabajar en rama codex/schematics-technician-workflow sin publicar.
- Roles ADMIN/TECHNICIAN y autorización por reparación para notas; sin cambios de estados ni importes.
- No inventar revisiones ni compatibilidad por coincidencia de nombre. OCR explícito y verificable por página.
- Archivos menores de 300 líneas; tipos estrictos y errores visibles.
- Diseño operativo con tokens del CRM, panel Inspector accesible en escritorio/tablet/móvil.

## Entregables
- [x] Visor: Inspector funcional, foco activa capa, preservación de vistas, carga PCBE cancelable en worker, listados completos, PDF con búsqueda/estado OCR.
- [x] Catálogo y búsqueda: identidad marca/modelo/placa/revisión, alias y paginación; búsqueda exacta disponible sin worker, semántica con umbral y deduplicación; OCR con índice por página.
- [x] Reparaciones: acceso contextual, documentos consultados, mediciones con unidad/origen/autor y recuperación; recientes/favoritos/enlaces a componente y página.
- [x] Validación: regresiones, TypeScript, lint, diff, build, navegador escritorio y móvil; revisión final.

## División de archivos
- Controlador local: components/schematics (excepto repair-notebook), workbench page, carga worker, preferencias, pruebas UI.
- Especialista catálogo: lib/schematics identity/catalog/search/OCR; API catalog/search/references/OCR; scripts import/index; pruebas backend. Contrato publicado por mensaje antes de integración.
- Especialista reparaciones: lib/schematics repair-notes; API repairs notes; components/schematics/repair-notebook; acceso desde active-repair-card; migración aditiva y pruebas. No editar workbench.

## Validación de comportamiento
Pruebas de identidad cruzada/variantes y ausencia de relevancia, autorización de notas, finitud/unidades y fuente, apertura por URL y selección en capa oculta. Navegador: alternar Placa/PDF y confirmar zoom, Inspector a 1024 y 390 px, búsqueda y navegación a referencias, favoritos y reapertura. OCR se prueba sobre fixture y se etiqueta como texto reconocido, nunca como medición.

## Registro
- Diseño aprobado por el usuario: “implementar todo”, sobre la revisión inmediatamente anterior.
- Línea base: npm test ejecuta solo 17 pruebas por expansión del glob del shell; ampliar ejecución en validación para incluir todos los tests.
- Se continúa en checkout visible para preservar el módulo no versionado existente; rama aislada sin commit/push automático.

## Cierre verificado
- 328 pruebas aprobadas; TypeScript y ESLint sin errores; build de producción y git diff --check correctos.
- Integración HTTP local y OCR real sobre PDF sintético aprobados; datos temporales retirados.
- Navegador: placa/PDF, zoom persistente, Inspector a 1024/390 px y medición con enlace al componente verificados.
- Migraciones aplicadas solo en PostgreSQL local. Sin commit, push ni despliegue.
- Sincronización entre documentos requiere identidad validada; índices semánticos históricos requieren reindexación para incorporar hashes de contenido.
