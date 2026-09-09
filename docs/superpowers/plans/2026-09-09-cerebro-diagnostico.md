# Cerebro: diagnóstico y evidencia de banco

> **For agentic workers:** Use superpowers:subagent-driven-development to implement and review bounded tasks.

**Goal:** Corregir los 18 hallazgos de la auditoría y verificar el recorrido del técnico con evidencia real.

**Architecture:** Mantener CRM, RAG y biblioteca física actuales. Separar calidad de antecedentes, selección de evidencia y expediente/plan diagnóstico; generar texto y controles desde una sola decisión. Reutilizar metadata persistente del chat y el cierre técnico ya existente.

**Tech Stack:** Next.js 15, React 19, TypeScript, PostgreSQL/Prisma, Python worker.

**Spec:** `docs/auditoria-cerebro-2026-09-09.md`, aprobado por el usuario con “arreglemos todo”.

## Restricciones

- Biblioteca `/mnt/data2`; no crear repositorios documentales alternativos.
- No mezclar variantes; conservar identidad de origen.
- No inventar unidades, resultados, pines ni topología.
- No modificar tickets para fabricar evidencia; no considerar facturación como éxito técnico.
- Conservar OpenRouter/Groq/local y usar el mismo pipeline en evaluación y producción.
- Archivos de implementación menores de 300 líneas; rutas autenticadas; sin nuevos `any` ni `console.log` backend.
- Deploy y verificación únicamente con `dokploy_maccell`.

## Task 1: Calidad y sincronización histórica

**Files:** `services/cerebro-rag-worker/src/cerebro_rag/{authority,repairs,repair_indexer,repair_sync,repair_cursor}.py`, módulos auxiliares y tests relacionados.

**Interfaces:** `classify_authority` conserva firma; `RepairSource` conserva contrato; salida técnica mantiene campos etiquetados consumidos por TypeScript. Incorporar versión de política y resultado del último ciclo, sin alterar la fuente CRM.

- [x] Regresiones: nota administrativa rechazada; entrega tras No Reparado excluida; reapertura y último Finalizado OK aceptados; cambio de política reprocesa READY sin cambios de texto; caso con observaciones útiles y sin diagnosis no descartado indebidamente.
- [x] Ejecutar tests Python, confirmar fallos y corregir calidad/reclasificación.
- [x] Revisión de la sincronización incremental y cursor de nueva política, con cargas limitadas.

## Task 2: Recuperación exacta y antecedentes útiles

**Files:** `src/lib/cerebro-v2/{retrieval,resilient-retrieval,library-retrieval,repair-evidence,evidence-selection}.ts` y tests.

**Interfaces:** `retrieveTechnicalEvidence` conserva `{sources,unavailable}`. `summarizeRepairEvidence(content,title)` devuelve `{ticketNumber,symptom,rootCause,intervention,verification,outcome,caveat}`; outcome: `verified|reported|incomplete|unrepaired`. `selectEvidence` combina y deduplica fuentes priorizando hasta tres antecedentes pertinentes y documentos del paso actual.

- [x] Reproducir E7 Plus devuelto como E7 y mezcla de siete PDF/un caso.
- [x] Garantizar igualdad de identidad o alias explícito; no sobrescribir modelo real de la fuente.
- [x] Rechazar soluciones administrativas aunque su autoridad histórica sea CONFIRMED_SUCCESS.
- [x] Hacer búsqueda histórica independiente de embedding como fallback de lectura con límites; mantener aislamiento.
- [x] Comprobar deduplicación entre biblioteca y RAG, diversidad de fuentes y pertinencia del síntoma.

## Task 3: Expediente persistente y plan único

**Files:** `src/lib/cerebro-v2/{diagnostic-state,diagnostic-plan,diagnostic-response,diagnosis-service,provider-selection,prompt,grounding,guided-diagnosis,diagnostic-planner,types}.ts`, API chat, evaluador y tests.

**Interfaces:** Estado derivado de mensajes de usuario guardados, metadata y observaciones CRM; nunca de hipótesis del asistente. `diagnoseRepair` compartido por API y evaluador devuelve texto, fuentes, plan y estado. La próxima acción se valida y genera una sola tarjeta; el texto no contiene otra próxima medición.

- [x] Pruebas: unidad ambigua conservada; valor del técnico no suprimido por faltar PDF; valor documental no atribuido al técnico; Android no recibe iOS; historial >8 mensajes conservado; pregunta contestada no se repite.
- [x] Separar entrada del vendedor, observación del técnico, antecedente e hipótesis; incluir condiciones y correcciones explícitas.
- [x] Quitar designadores/plataformas fijos de expansiones generales.
- [x] Preservar intervención/verificación al limitar contexto.
- [x] Conectar extracción visual a páginas de biblioteca con procedencia, usando rutas existentes y fallback visible.
- [x] Ejecutar la evaluación a través del mismo servicio que producción, excluyendo ticket actual.

## Task 4: Interfaz, antecedentes y cierre

**Files:** componentes `src/components/cerebro-v2/`, API cierre y API detalle técnico de evidencia, health y tests.

**Interfaces:** fuente pública con resumen técnico opcional; detalle de antecedente solo contiene datos técnicos y respeta rol/contexto; metadata incluye plan/expediente. Cierre usa `RepairLearningRecord` existente.

- [x] Tarjeta principal de comprobación; entrada libre y opciones coherentes; expediente con medidas/descartes; antecedentes con diferencias y detalle funcional; documentos bajo expansión.
- [x] Cierre accesible desde reparación/chat, con borrador verificable y confirmación técnica, revisión administrativa para entrenamiento.
- [x] Explicar servicios no disponibles y distinguir disponibilidad de configuración/operación.
- [ ] Pruebas de autorización y render, más navegador real desktop y móvil.

## Task 5: Validación e integración operacional

- [x] Baseline conocido: 474 tests pasan en `5ee8944`.
- [x] Ejecutar todos los tests TS y tests Python pertinentes; TypeScript, lint de cambios, diff check y build.
- [x] Revisar cambios completos y resolver hallazgos importantes.
- [ ] Verificar caso E7 y diversidad de marcas/síntomas usando datos existentes sin fabricar cierres.
- [ ] Integrar y desplegar según autorización vigente; comprobar commit y estado terminal en Dokploy MACCELL.
- [ ] Validar worker/política/cola y comportamiento servido; no dar la tarea por terminada con solo un push.

## Ledger

- Inicio: auditoría preservada; worktree `codex/cerebro-diagnostico`; baseline limpio salvo informe de auditoría.
- Ruling: ejecutar por subtareas sin otra ronda de aprobación, porque el usuario aprobó corregir la auditoría completa.
- Interfaces compartidas: Task 1 produce campos etiquetados para Task 2; Task 2 conserva fuente y produce resumen para Task 3/4; Task 3 produce plan/estado serializable para Task 4. Root mantiene `types.ts`, prompt e integración para evitar ediciones concurrentes.
- Autocoherencia: las regresiones de cada tarea ejercitan comportamiento público y se ejecutan antes de implementar; no se relajan para conservar los fallos de la auditoría.

## Evidencia de implementación y revisión

- Revisión independiente descubrió y corrigió pérdida de metadata de preguntas, deduplicación de respuestas diferentes, parser de etiquetas vacías, cuotas de antecedentes previas al recorte, variantes por prefijo y autorización de cierre sobre versión distinta.
- Los valores humanos se conservan con su observación y condiciones en el expediente; el texto libre no puede trasladarlos a otro punto. Las notas CRM sin autor verificado permanecen separadas.
- Regresión literal MAC1-00000241: falta de repuestos y toma del técnico se clasifican como sin reparación, nunca intervención exitosa.
- La política del worker contempla reaperturas y fingerprint de calidad; aprobar o revocar aprendizaje reclasifica incluso cuando el texto no cambia.
- Verificación local final: 545 tests TS pasan; 105 tests Python pasan, seis integraciones omitidas por requerir RAG externo; TypeScript y ESLint de cambios pasan; build de producción pasa. Certificados públicos del sistema usados mediante NODE_EXTRA_CA_CERTS para descargar fuentes, sin desactivar TLS.
- Migración de SELECT limitada al rol existente rag_reader probada dos veces en una transacción PostgreSQL local: lectura habilitada, permisos de escritura sin cambios y ROLLBACK.
- Estado pendiente de acreditación: commit servido, deploy terminal aplicación/worker, reindexación y recorrido real de técnico.
