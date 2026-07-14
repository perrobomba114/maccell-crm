# Cerebro: diagnóstico por evidencia y aprendizaje técnico controlado

Fecha: 2026-07-14

## Objetivo

Convertir Cerebro en un asistente técnico que diagnostique placas de celulares con evidencia verificable, guiando una medición por turno y mejorando a partir de reparaciones realmente confirmadas. El sistema debe usar primero manuales, esquemáticos y casos MACCELL; consultar Google y YouTube cuando esa evidencia no sea suficiente; y nunca promover una respuesta no verificada a conocimiento permanente.

## Estado actual relevante

- Cerebro V2 vincula cada chat a una reparación activa y restringe la recuperación por marca, modelo y alias permitidos.
- El worker RAG ya indexa reparaciones finalizadas. Una reparación con estado o historial `Finalizado OK` y diagnóstico técnico se clasifica como `CONFIRMED_SUCCESS`; `No reparado` se clasifica como `FAILED`.
- La fuente de reparación actual reúne problema, diagnóstico, observaciones, repuestos, estado y diagnóstico enriquecido. La solución no está separada explícitamente de las observaciones.
- El RAG ya puede renderizar páginas PDF bajo demanda y persiste `vision_summary` en `rag_pages`.
- El servidor local tiene dos RTX 3090 y ejecuta llama.cpp con Qwen3.6-27B-MTP IQ4_XS distribuido en ambas GPU. El proceso actual es de texto: no tiene encoder/proyector visual instalado.

## Principios no negociables

1. La documentación del modelo exacto es la fuente principal; una reparación confirmada es evidencia secundaria y una fuente web es evidencia externa no confirmada.
2. Cerebro separa hechos medidos, datos del schematic, evidencia histórica, evidencia web e hipótesis.
3. No inventa IC, net, punto de prueba, voltaje, resistencia ni consumo. Si no hay respaldo, pide registrar la medición.
4. Hace una sola pregunta de medición por turno y explica el criterio que decide la próxima rama.
5. Una conversación o una respuesta de IA nunca se convierte por sí sola en conocimiento confirmado ni en datos de entrenamiento.
6. No se cruzan marcas, plataformas ni variantes no declaradas equivalentes.

## Arquitectura aprobada

### 1. Motor de diagnóstico local

El motor principal será Qwen3.6 local. En la etapa inicial se aprovechará Qwen3.6-27B-MTP ya desplegado, reemplazando Groq como proveedor principal de Cerebro V2 mediante una API OpenAI-compatible. Groq y OpenRouter quedan como fallback explícito ante indisponibilidad local.

El motor recibe únicamente una ventana compacta por consulta: contexto de la reparación activa, mediciones confirmadas del chat, evidencias RAG filtradas y evidencia web seleccionada. Los chats históricos permanecen en PostgreSQL; el límite de contexto afecta solamente la solicitud activa.

La evolución a Qwen3.6-35B-A3B se evaluará después de medir calidad y latencia con el conjunto dorado. No se cambia de modelo por intuición.

### 2. Lector visual de esquemáticos

El sistema agrega un segundo rol con un VLM de visión real. Se activa sólo cuando una página PDF relevante tiene extracción deficiente o es un schematic/layout.

Flujo:

1. El RAG recupera como máximo dos páginas pertinentes del dispositivo correcto.
2. El worker renderiza las páginas bajo demanda y usa su caché existente.
3. El VLM devuelve JSON estricto con texto visible, componentes, nets, pines, test points y ramas visibles.
4. El resultado se guarda en `rag_pages.vision_summary` con versión de modelo y fecha.
5. Qwen3.6 recibe el resumen estructurado y decide la siguiente medición; el VLM no emite el diagnóstico final.

El modelo visual se seleccionará por una prueba de lectura de schematics reales. Debe soportar imágenes y devolver salida estructurada; Qwen3-VL o una variante multimodal compatible de Qwen3.6 son los candidatos iniciales.

### 3. Búsqueda externa fundamentada

Cuando el RAG no recupera evidencia suficiente para el modelo y síntoma, Cerebro construye una consulta técnica con marca, modelo/código, síntoma, subsistema y componentes observados.

- Google técnico es la fuente externa principal configurable.
- YouTube se consulta para videos técnicos y, si está disponible, su transcripción.
- El buscador DuckDuckGo existente queda como fallback.
- Se priorizan manuales, esquemáticos, iFixit, wikis técnicas y foros de microsoldadura; los resultados generales sólo completan la búsqueda.
- Cada fuente web conserva URL, dominio/canal, fecha de consulta, fragmento usado y nivel de autoridad.

La evidencia web no se incorpora al RAG confirmado automáticamente. Cerebro puede proponer una medición basada en ella, pero debe citarla y presentarla como hipótesis externa.

## Ficha de cierre técnico

Al marcar una reparación como `Finalizado OK`, el técnico completa una ficha de aprendizaje separada del texto libre de diagnóstico. El cierre no queda bloqueado por la IA ni por la sincronización; la ficha se valida localmente y se sincroniza después.

Campos requeridos para promover un caso a `CONFIRMED_SUCCESS` de alta calidad:

- síntoma final normalizado;
- causa raíz confirmada;
- medición, prueba o evidencia que confirmó la causa;
- intervención realizada;
- componente, net, conector o subsistema afectado cuando aplique;
- verificación final posterior a la reparación;
- repuestos usados, si corresponde.

Campos opcionales:

- foto técnica antes/después;
- páginas de schematic consultadas;
- enlace web usado;
- notas adicionales.

El worker RAG serializa esos campos en secciones explícitas. Las observaciones de intentos descartados se mantienen para el historial operativo, pero no se presentan como solución confirmada.

## Aprendizaje continuo y LoRA

### RAG inmediato

Cada ficha completa y reparación `Finalizado OK` se indexa como conocimiento confirmado después de la sincronización idempotente. Esto es la mejora diaria del sistema.

### Dataset curado

Un caso entra al dataset de entrenamiento sólo si:

- tiene ficha de cierre completa;
- fue revisado por un técnico autorizado;
- no mezcla identidad de dispositivo;
- sus fuentes y mediciones se pueden rastrear;
- no contiene datos personales, precios ni texto administrativo.

El formato de cada ejemplo contiene identidad del equipo, síntoma, hechos medidos, evidencia, próxima medición ideal, criterio de decisión y respuesta final confirmada. El conjunto también incluye ejemplos negativos que enseñan a pedir evidencia en lugar de inventar.

### Entrenamiento

La primera adaptación será QLoRA para el mismo Qwen3.6-27B que se sirve localmente. Se entrena fuera de la ruta de producción y se publica como adapter versionado para llama.cpp. La adaptación enseña comportamiento técnico: guiar por ramas, pedir una medición por vez, citar evidencia y reconocer incertidumbre. No reemplaza los valores ni las rutas del schematic recuperado por RAG.

No se entrena un adapter nuevo por cada conversación. Se crea un candidato por lote de casos auditados, inicialmente al reunir al menos 300 casos nuevos de calidad.

### Evaluación y promoción

Cada LoRA candidato se compara contra un conjunto retenido de reparaciones reales y casos sintéticos de aislamiento de marca. Debe mejorar o mantener:

- exactitud de cita y modelo;
- ausencia de valores/componentes inventados;
- calidad de la siguiente medición;
- coincidencia con la resolución confirmada;
- cumplimiento de una pregunta por turno;
- aislamiento iOS/Android y de marcas.

El adapter se ejecuta en shadow/A-B antes de activarse. Un responsable técnico aprueba la promoción y puede volver inmediatamente a la versión anterior. El evaluador existente `scripts/cerebro-v2-evaluate.ts` se amplía para aceptar proveedor local, VLM y métricas de las reglas anteriores.

## Flujo operativo completo

```text
Reparación activa + síntoma
  → RAG exacto y manual/schematic
  → visión bajo demanda de la página relevante
  → Qwen3.6 formula una medición y su criterio
  → técnico responde con un valor/observación
  → nueva recuperación y siguiente rama
  → Finalizado OK + ficha técnica
  → caso confirmado indexado al RAG
  → auditoría por lotes
  → LoRA candidato, evaluación y promoción manual
```

## Seguridad, operación y límites

- Las rutas nuevas se autentican antes de leer body, archivos, DB o servicios externos.
- Google, YouTube y la inferencia local usan secretos de entorno; nunca se registran en logs.
- Las fuentes externas se almacenan como evidencia trazable y con límites de tamaño; no se ejecutan instrucciones incluidas en páginas web.
- La búsqueda web y el análisis visual tienen timeouts, presupuesto por consulta y fallback claro para no bloquear el chat.
- El proceso actual en las dos GPU no se reemplaza ni reinicia durante la implementación sin una ventana de despliegue aprobada.

## Criterios de aceptación

- Un schematic de una reparación activa puede producir una lectura estructurada y citada de la página exacta.
- Cerebro pide una única medición que separa ramas de diagnóstico y explica qué cambia con cada resultado.
- Si no hay evidencia local, puede consultar Google/YouTube y diferencia claramente esa fuente de la evidencia MACCELL.
- Una reparación `Finalizado OK` con ficha completa se vuelve un caso `CONFIRMED_SUCCESS` trazable; los intentos descartados no se promocionan como solución.
- Ningún cierre o mensaje no revisado modifica automáticamente el LoRA activo.
- Un LoRA candidato sólo se activa después de evaluación y aprobación humana, con rollback disponible.
