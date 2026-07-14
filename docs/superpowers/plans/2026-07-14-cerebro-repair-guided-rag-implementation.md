# Implementación: Cerebro por reparación y diagnóstico guiado

**Objetivo:** reemplazar el dispositivo manual por reparaciones autorizadas, ligar cada chat a una reparación real y hacer que el diagnóstico avance con evidencia exacta, opciones rápidas y resultados finales reutilizables por el RAG.

## 1. Autoridad de reparación

- Crear `src/lib/cerebro-v2/repair-context.ts` con estados activos, DTO seguro, alcance ADMIN/TECHNICIAN y carga autorizada.
- Crear `GET /api/cerebro-v2/repairs` con autenticación, búsqueda y límite.
- Probar estados, asignación y alcance por rol antes de integrar la ruta.

## 2. Identidad y alias seguros

- Extender normalización TypeScript y Python con identidad canónica, familia y alias explícitos.
- Cubrir `SAMSUNG SM-A125M`, `GALAXY A12` y `A12` sin admitir variantes no registradas ni marcas distintas.
- Cambiar retrieval para filtrar el conjunto de alias permitido antes del límite SQL.

## 3. Sesiones vinculadas y migración aditiva

- Agregar migración RAG para `repair_id`, `ticket_number` y metadatos JSON de mensajes.
- Cambiar el repositorio de chats para persistir el vínculo y el estado guiado.
- Cambiar creación de sesión a `{ repairId }`; resolver identidad únicamente en servidor.
- Mantener sesiones antiguas legibles, pero impedir nuevos diagnósticos sin reparación vinculada.

## 4. UX de selección operativa

- Sustituir marca/modelo editable por selector de reparaciones asignadas.
- Mostrar ticket, dispositivo, falla, estado, sucursal y técnico según rol.
- Crear chat desde la reparación elegida y presentar estados vacíos/errores accionables.
- Mantener historial, chat unificado y visor PDF dentro de Cerebro.

## 5. Contexto vivo y búsqueda técnica

- Construir contexto sin PII ni precios desde problema, diagnóstico, observaciones e imágenes.
- Inferir subsistemas y expandir la consulta con términos de alimentación, carga, batería, encendido y componentes.
- Rerankear por identidad, componentes y subsistema, conservando aislamiento de marca/modelo.

## 6. Diagnóstico guiado persistente

- Definir contrato de pregunta, opciones y respuesta estructurada.
- Generar una sola pregunta por turno con 2–4 opciones medibles y entrada libre.
- Validar en servidor que una opción corresponda a la última pregunta pendiente.
- Guardar pregunta/respuesta en metadatos del mensaje y restaurarla al reabrir el chat.
- Renderizar respuestas rápidas en el chat y permitir continuar con texto libre.

## 7. Respuestas fundamentadas

- Reforzar prompt con contexto de reparación, consulta expandida y fuentes exactas.
- Exigir página y fuente para valores técnicos; cuando no haya respaldo, pedir registrar la medición sin inventar rangos.
- Validar fuentes públicas contra la identidad autorizada.
- Usar hasta dos páginas visuales de extracción deficiente cuando el worker tenga una página renderizable.

## 8. Indexación final segura

- Exportar solo reparaciones finalizadas o fallidas útiles.
- Limpiar eventos administrativos, precios, teléfonos, emails e hipótesis descartadas.
- Clasificar éxito confirmado y fallo con autoridad correcta; omitir contenido técnico vacío.
- Mantener hash idempotente y la conexión principal en modo lectura.

## 9. Cierre y producción

- Ejecutar tests TypeScript y Python, `tsc`, lint de archivos tocados, `git diff --check` y build.
- Commit y push directos a `main` sin incluir PDFs ni `tmp/`.
- Desplegar aplicación y Compose RAG con Dokploy MACCELL.
- Verificar producción con una reparación real, `SM-A125M/GALAXY A12`, `IPHONE 8`, opciones guiadas, citas y visor de página.
