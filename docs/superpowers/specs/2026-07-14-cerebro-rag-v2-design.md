# Cerebro RAG V2 - Diseño

**Fecha:** 2026-07-14
**Estado:** aprobado para planificación
**Alcance:** reemplazo completo del Cerebro AI actual por un asistente técnico unificado con RAG independiente

## 1. Objetivo

Construir un único chat técnico para usuarios `ADMIN` y `TECHNICIAN`, capaz de responder de forma directa usando reparaciones históricas, Wiki, manuales de servicio, schematics, PCB layouts y adjuntos. El sistema debe recuperar exclusivamente información compatible con la marca y el modelo consultados, citar cada evidencia y permitir abrir el PDF en la página utilizada.

El RAG nuevo se construirá en paralelo. La base principal de MACCELL será una fuente de solo lectura y no recibirá tablas vectoriales, cargas de indexación ni modificaciones de reparaciones.

## 2. Decisiones de producto

- Cerebro es exclusivamente técnico; no responde consultas comerciales, administrativas, de stock ni de precios.
- Acceso exclusivo para administradores y técnicos. Los vendedores reciben `403`.
- Existe un solo chat, sin modos Directo/Mentor.
- Las respuestas son completas y directas, no un cuestionario guiado.
- El chat acepta imágenes, capturas, PDF, manuales y schematics.
- Los adjuntos se indexan automáticamente con autoridad inicial baja.
- Un adjunto vinculado a una reparación exitosa puede adquirir mayor autoridad.
- Se elimina la Wiki lateral, el panel separado de schematics, el contador global de tokens y el event bus basado en `window.dispatchEvent`.

## 3. Evidencia del problema actual

La auditoría read-only de producción encontró:

- 3.308 reparaciones en la base principal.
- 1.870 documentos en `repair_embeddings`, pero solo 1.166 con vector.
- 1.347 reparaciones históricas elegibles ausentes del índice.
- 688 artículos Wiki, de los cuales solo 2 están indexados.
- 706 documentos sin diagnóstico estructurado y 735 sin solución estructurada.
- Mezcla de casos exitosos, no reparados e incompletos sin autoridad explícita.
- Marcas y modelos no normalizados.
- Columna `vector` sin dimensión obligatoria.
- Ausencia de índice HNSW/IVFFlat.
- Extensión `vector` registrada, pero librería `$libdir/vector` ausente en el contenedor `postgres:15`.

El índice actual no se reparará en el lugar. Permanecerá disponible durante la construcción y el rollback de V2.

## 4. Biblioteca documental existente

La biblioteca está en `/mnt/data2` y File Browser la publica como `disco-1-8tb-B`.

- 1.814 PDF.
- 10,68 GB.
- Marcas: Samsung, Xiaomi, Motorola, Huawei, LG e iPhone.
- Nombres y carpetas contienen marca, modelo y tipo documental.
- Ejemplos de tipos: schematic completo, manual de servicio, troubleshooting, PCB layout, block diagram, parts list y aportes técnicos.

`/mnt/data2` vive actualmente sobre `/dev/md0p1`, RAID1 formado por dos NVMe de 512 GB. La biblioteca se montará read-only en los servicios de RAG y en la aplicación; no se duplicarán los PDF en PostgreSQL.

## 5. Arquitectura

### 5.1 Servicios

1. **Base MACCELL principal**
   - Fuente canónica de reparaciones, estados, observaciones, repuestos y Wiki.
   - Acceso del RAG mediante usuario `rag_reader` con permisos `SELECT` limitados.

2. **`maccell-rag-db`**
   - PostgreSQL independiente con pgvector instalado y verificado.
   - Volumen independiente en `/var/lib/maccell/rag-postgres`.
   - Vector con dimensión fija según la versión activa del modelo.

3. **`maccell-rag-worker`**
   - Descubrimiento, extracción, OCR selectivo, normalización, fragmentación y embeddings.
   - Biblioteca montada `/mnt/data2:/library:ro`.
   - Caché de páginas renderizadas en `/var/lib/maccell/rag-pages`.
   - Procesamiento limitado por lotes y reanudable.

4. **Aplicación MACCELL**
   - Chat, búsqueda y visor PDF autenticado.
   - Conexión separada mediante `RAG_DATABASE_URL`.
   - Feature flag para activar V2 y volver al Cerebro anterior.

### 5.2 Hardware

El servidor dispone de 28 CPU Intel Xeon E5-2680 v4, 123 GiB de RAM y no tiene GPU de cómputo. La indexación se ejecutará en CPU, como trabajo de fondo con límites explícitos para no degradar Dokploy, PostgreSQL principal ni el CRM.

## 6. Modelo de datos RAG

### `rag_documents`

- Identidad UUID.
- `source_type`: `REPAIR`, `WIKI`, `PDF`, `CHAT_ATTACHMENT`.
- `source_id` o ruta relativa.
- SHA-256 y versión de contenido.
- Marca/modelo originales y normalizados.
- Familia de modelo.
- Tipo documental.
- Autoridad: `CONFIRMED_SUCCESS`, `TECHNICAL_DOCUMENT`, `INCOMPLETE`, `FAILED`, `UNVERIFIED_ATTACHMENT`.
- Estado de indexación: `PENDING`, `RUNNING`, `READY`, `PARTIAL`, `FAILED`, `RETRYING`.
- Metadatos JSON serializables sin PII ni precios.

### `rag_pages`

- Documento y número de página.
- Texto extraído.
- Método: texto nativo u OCR.
- Ruta relativa de la imagen renderizada.
- Estado y error acotado.

### `rag_chunks`

- Documento y página de origen.
- Sección, síntoma y componentes detectados.
- Texto normalizado.
- Contador de tokens.
- `tsvector` para búsqueda textual.
- Embedding con dimensión fija.
- Autoridad heredada y metadatos de filtrado.

### `rag_ingestion_jobs`

- Tipo de trabajo, progreso, intentos y timestamps.
- Cursor reanudable.
- Error descriptivo y no sensible.

### `rag_feedback`

- Consulta, usuario, fragmento y valoración útil/incorrecta.
- No almacena prompts completos ni datos sensibles.

### `rag_model_versions`

- Modelo, dimensión, estrategia de fragmentación y versión del índice.
- Permite crear una versión nueva sin mezclar embeddings incompatibles.

## 7. Reconstrucción de reparaciones históricas

1. Leer reparación, problema, diagnóstico, estado actual, historial de estados, observaciones y repuestos.
2. Excluir clientes, teléfonos, correos, precios, costos y datos de caja.
3. Normalizar marca, modelo y alias mediante diccionario versionado.
4. Inferir el resultado real usando estado actual e historial, no números mágicos aislados.
5. Clasificar autoridad:
   - Éxito confirmado.
   - Entregada después de éxito confirmado.
   - Incompleta o sin confirmación.
   - No reparada o fallida.
6. Construir documento técnico con campos `PROBLEMA`, `DIAGNOSTICO`, `SOLUCION`, `REPUESTOS` y `EVIDENCIA`.
7. Generar SHA-256 para indexación idempotente.
8. Indexar el documento sin modificar la reparación fuente.

Orden de autoridad acordado:

1. Reparaciones exitosas confirmadas.
2. Documentación técnica de la biblioteca.
3. Casos incompletos como antecedentes.
4. Casos fallidos solo como evidencia de métodos que no funcionaron.

## 8. Ingesta de PDF

1. Recorrer recursivamente `/library`.
2. Detectar PDF nuevos o modificados por ruta, tamaño, mtime y SHA-256.
3. Interpretar marca, modelo, familia y tipo usando carpetas y nombre.
4. Extraer texto página por página.
5. Aplicar OCR solo a páginas con texto insuficiente.
6. Renderizar páginas técnicas para recuperación multimodal.
7. Clasificar secciones: power, charging, display, RF, audio, camera, PMIC, layout, disassembly y otras.
8. Fragmentar por sección/página y subdividir bloques excesivamente grandes conservando solapamiento.
9. Extraer referencias exactas de componentes, líneas, test points y valores.
10. Generar embeddings en lotes pequeños.
11. Guardar siempre archivo y página de origen.
12. Marcar el documento `READY`, `PARTIAL` o `FAILED`.
13. Reanudar desde el último cursor después de un reinicio.

Los PDF originales permanecen en el filesystem. PostgreSQL almacena texto, metadatos, hashes, referencias y embeddings.

## 9. Embeddings y recuperación

El candidato inicial es `BAAI/bge-m3` por soporte multilingüe, 1.024 dimensiones y documentos largos. Antes de la indexación completa se comparará contra un conjunto de 50-100 consultas reales. La versión activa queda registrada y nunca comparte columna/índice con otra dimensión.

Flujo de consulta:

1. Detectar y normalizar marca, modelo, síntoma y componentes.
2. Aplicar filtro obligatorio de marca.
3. Aplicar filtro exacto de modelo o familia compatible explícita.
4. Ejecutar búsqueda textual, coincidencia de códigos y búsqueda vectorial.
5. Fusionar resultados con scores normalizados.
6. Aplicar autoridad y reranking.
7. Entregar al LLM solo fragmentos compatibles.
8. Conservar evidencia y citas.

Reglas:

- Cero mezcla entre marcas.
- Los modelos compatibles deben estar declarados; no se infieren por similitud textual solamente.
- Si no existe modelo exacto, se identifica explícitamente el uso de una referencia de familia.
- Un caso fallido nunca se presenta como solución confirmada.
- Ningún resultado puede incluir precios.

## 10. Chat técnico unificado

Usuarios permitidos: `ADMIN` y `TECHNICIAN`.

Cada respuesta contiene:

1. Diagnóstico probable.
2. Evidencia MACCELL.
3. Evidencia documental.
4. Mediciones con componente, línea, herramienta y valor esperado.
5. Intervención sugerida.
6. Fuentes navegables.

Funciones:

- Adjuntar imágenes y PDF.
- Vincular conversación con una reparación.
- Copiar respuesta.
- Valorar fuentes.
- Abrir reparación citada.
- Abrir PDF en visor interno y saltar a la página exacta.
- Indexar adjuntos automáticamente con autoridad baja.

No existen modos de personalidad, panel lateral de Wiki ni administración de schematics dentro del chat.

## 11. Visor documental

- Ruta API autenticada para `ADMIN` y `TECHNICIAN`.
- Nunca expone la ruta física.
- Valida que la ruta resuelta permanezca dentro de `/library`.
- Soporta rango de bytes para PDF.
- Permite abrir documento y página citada.
- Biblioteca montada read-only.
- Rechaza vendedores con `403` y sesiones ausentes con `401`.

## 12. Seguridad

- Credenciales independientes para base principal read-only, RAG DB y worker.
- Autorización en cada route handler antes de leer body, DB o archivos.
- Validación de extensión, MIME, tamaño y ruta.
- Sin prompts completos ni datos personales en logs.
- Sin precios ni PII en documentos indexados.
- Sin operaciones de escritura desde el RAG hacia la base principal.
- Procesos de fondo con errores visibles y logs acotados.
- Secretos fuera del repositorio.

## 13. Manejo de errores

- Un PDF fallido no detiene el lote.
- OCR fallido produce documento parcial si existe texto útil.
- Embedding fallido se reintenta con backoff limitado.
- Jobs abandonados se recuperan mediante lease/heartbeat.
- Todos los cambios de estado son transaccionales en la base RAG.
- La respuesta del chat distingue falta de evidencia, indisponibilidad del RAG y fallo del proveedor LLM.
- No se hace fallback silencioso a resultados de otra marca.

## 14. Validación

Conjunto dorado de al menos 100 consultas reales con respuesta/fuente esperada.

Criterios:

- Contaminación entre marcas: 0%.
- Citas que abren archivo y página correcta: 100%.
- Documentos duplicados: 0%.
- Reparaciones exitosas por encima de casos fallidos: 100%.
- Recall@10: al menos 90%.
- MRR@10: al menos 0,75.
- Recuperación RAG p95: menos de 2 segundos.
- Reindexación reanudable e idempotente.
- Cero precios y PII en contexto.
- Sin sesión: `401`.
- Vendedor: `403`.

Pruebas obligatorias:

- Unitarias: normalización, parser de rutas, clasificación de autoridad, fragmentación y guards.
- Integración: pgvector, búsqueda híbrida, idempotencia y jobs.
- E2E: chat, adjuntos, citas y visor PDF.
- Regresión: aislamiento de marca, fallback del proveedor y reapertura de jobs.

## 15. Despliegue

El canal principal de operación será el MCP `dokploy_maccell`. SSH queda reservado para diagnósticos read-only del filesystem o del host que el MCP no exponga.

Recursos confirmados por MCP:

- Proyecto: `MACCELL CRM` (`Zfo4YNibjFdb3eqmD1enP`).
- Entorno: `production` (`ct2CisxOIkYdaQcSguWyh`).
- Aplicación: `MACCELL CRM` (`Jy-KdfLzVGln7_RK0R44Y`).
- PostgreSQL principal: `cZ6DmTbyOXf3CZGKWa_9b`.

El MCP se usará para crear y configurar servicios, variables, montajes, límites de recursos, backups, despliegues, logs, monitoreo y rollback. Las respuestas completas de endpoints que incluyen configuración sensible no se almacenarán en archivos ni se reproducirán en logs o documentación.

1. Backup de configuración y base principal.
2. Crear usuario read-only.
3. Desplegar `maccell-rag-db` y verificar pgvector.
4. Desplegar worker con límites de recursos.
5. Piloto con los dos PDF `SM-A405FN` y 50 reparaciones.
6. Construir y aprobar conjunto dorado.
7. Indexar biblioteca completa.
8. Reconstruir histórico.
9. Ejecutar búsqueda en modo sombra.
10. Activar V2 para administradores.
11. Activar V2 para técnicos.
12. Mantener rollback al Cerebro anterior durante estabilización.

## 16. Rollback y no destrucción

- Feature flag para volver al Cerebro anterior.
- Detener worker no afecta MACCELL.
- La base RAG puede reconstruirse sin modificar la base principal.
- No se elimina el índice viejo durante la estabilización.
- No se borran reparaciones, Wiki ni PDF originales.
- No se ejecutan migraciones destructivas en producción.
- La reversión operativa se ejecuta mediante MCP de Dokploy y feature flag; no mediante comandos Docker manuales.

## 17. Fuera de alcance

- Asistente comercial o administrativo.
- Acceso para vendedores.
- Consultas de precios, stock, ventas o clientes.
- Movimiento físico de la biblioteca durante esta implementación.
- Indexación inicial de videos MP4.
- Eliminación inmediata del Cerebro anterior.
