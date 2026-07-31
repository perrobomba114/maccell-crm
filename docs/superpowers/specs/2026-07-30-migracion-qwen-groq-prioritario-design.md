# Migración a Qwen 3.6 Groq prioritario

## Contexto

MACCELL usa Groq en la mejora de informes técnicos y como parte de la cadena de modelos de Cerebro V2. Producción también dispone de un servidor OpenAI-compatible en `http://100.71.184.125:8000/v1` con `Qwen3.6-35B-A3B-Q4_K_M` para texto y visión.

Groq anunció la baja de `llama-3.3-70b-versatile` para el 16 de agosto de 2026 y recomienda `qwen/qwen3.6-27b` como reemplazo. Qwen 3.6 27B admite texto, imágenes y razonamiento configurable.

## Objetivo

Usar `qwen/qwen3.6-27b` en Groq como modelo principal de texto y visión, manteniendo los modelos actuales y el servidor Qwen local como fallbacks ordenados. La migración no debe exponer razonamiento interno ni alterar los controles de coherencia, grounding o aislamiento de marcas.

## Orden definitivo de proveedores

### Chat de texto de Cerebro V2

1. Groq `qwen/qwen3.6-27b`, recorriendo todas las claves configuradas.
2. Groq `moonshotai/kimi-k2-instruct`, recorriendo todas las claves configuradas.
3. Qwen local `100.71.184.125`, usando el modelo configurado por entorno.
4. OpenRouter, únicamente si se configura una clave en el futuro.

### Análisis visual de Cerebro V2

1. Groq `qwen/qwen3.6-27b`, recorriendo todas las claves configuradas.
2. Groq Llama Scout, usando `CEREBRO_VISION_MODEL` o su valor actual por defecto.
3. Qwen local `100.71.184.125`, usando el modelo de visión configurado por entorno.
4. OpenRouter, únicamente si se configura una clave en el futuro.

### Mejora del informe al terminar una reparación

1. Groq `qwen/qwen3.6-27b`, recorriendo todas las claves configuradas.
2. Qwen local `100.71.184.125`, usando el modelo de texto configurado por entorno.

La mejora del informe no utilizará Kimi, Llama Scout ni OpenRouter. Si Groq y el servidor local fallan, conservará el error recuperable actual y nunca reemplazará el texto original.

## Semántica de prioridad

La prioridad será por modelo y luego por clave. Con 19 claves Groq, el sistema probará Qwen con las 19 antes de pasar al siguiente modelo. No se permitirá el orden actual de “Qwen y fallback por cada clave”, porque podría seleccionar Kimi o Llama Scout antes de agotar Qwen en las demás claves.

El orden se construirá en una función pura y testeable. Las rutas consumirán esa configuración en lugar de repetir bucles o identificadores de modelo.

## Configuración de Qwen Groq

Para Qwen se aplicará configuración específica del proveedor:

- `reasoningEffort: "default"`;
- `reasoningFormat: "hidden"`;
- `temperature: 0.6`;
- `topP: 0.95`;
- `maxRetries: 0`;
- sin razonamiento visible en el texto final.

Los límites de salida seguirán adaptados al producto:

- mejora de informe: 500 tokens como máximo;
- chat técnico: 900 tokens como máximo;
- extracción visual: 700 tokens como máximo.

La mejora de informe continuará sin streaming porque el modal espera una respuesta breve y completa. El chat mantendrá su transporte actual hacia la interfaz.

Kimi, Llama Scout, Qwen local y OpenRouter no recibirán opciones exclusivas de Qwen Groq que sus APIs puedan rechazar. La configuración específica se aplicará al modelo Qwen mediante un adaptador o middleware acotado.

## Componentes

### Catálogo y construcción de modelos

El catálogo central declarará:

- Qwen 3.6 Groq como modelo principal de texto y visión;
- Kimi como fallback textual Groq;
- Llama Scout como fallback visual Groq;
- los identificadores y etiquetas que se guardan como metadata.

Un constructor generará configuraciones en orden `modelo → claves`. Agregará después el modelo local y finalmente OpenRouter cuando corresponda.

### Mejora de informes

La ruta autenticada conservará:

- el prompt técnico y comprensible;
- el reporte del vendedor como contexto;
- el informe del técnico como única autoridad del trabajo realizado;
- el validador que bloquea acciones inventadas;
- el texto original ante cualquier fallo.

La ejecución intentará primero todas las claves Groq con Qwen. Solo si todas fallan llamará al servidor Qwen local. La respuesta informará el modelo y proveedor realmente usados sin exponer claves o URLs internas.

### Chat y visión

Cerebro V2 construirá cadenas independientes para texto y visión con el orden definido. El grounding posterior, el RAG, el aislamiento de marca y la supresión de mediciones no respaldadas permanecerán sin cambios.

## Manejo de errores

- Cada fallo pasa al siguiente candidato sin mostrar secretos ni prompts completos.
- No habrá reintentos internos del SDK; la rotación explícita de claves y modelos será la única estrategia.
- Una caída del servidor local no bloqueará un resultado Groq ya obtenido.
- La metadata reflejará el candidato que realmente respondió.
- Si se agotan todos los candidatos, se devolverá el error sanitario actual del flujo correspondiente.

## Pruebas automatizadas

Las pruebas cubrirán:

- Qwen Groq aparece primero en texto y visión;
- todas las claves Qwen aparecen antes de Kimi o Llama Scout;
- Kimi es el primer fallback Groq de texto;
- Llama Scout es el primer fallback Groq de visión;
- Qwen local aparece después de los candidatos Groq;
- OpenRouter queda al final cuando está configurado;
- la mejora de informe intenta Groq Qwen antes del local;
- las opciones de razonamiento pertenecen solo a Qwen Groq;
- no quedan usos activos de `llama-3.3-70b-versatile`;
- el caso de coherencia “se pegó módulo / marco doblado” sigue pasando.

## Verificación en producción

Después del despliegue se realizarán verificaciones sin escritura:

1. Mejora de informe con “se pegó módulo / marco doblado”.
2. Generación textual directa con Qwen Groq desde la configuración del contenedor productivo.
3. Análisis visual directo con Qwen Groq y una imagen técnica de prueba.
4. Ausencia de razonamiento interno o etiquetas `<think>` en las respuestas.

Los tests automatizados demostrarán el orden de routing y las pruebas directas demostrarán que el modelo productivo acepta texto y visión. No se llamará al endpoint del chat porque persiste mensajes; no se alterarán sesiones, reparaciones ni diagnósticos existentes.

## Fuera de alcance

- Eliminar Kimi o Llama Scout.
- Cambiar el modelo alojado en `100.71.184.125`.
- Modificar RAG, embeddings, prompts técnicos o reglas de coherencia.
- Activar o configurar OpenRouter.
- Migrar código legado sin llamadas activas, salvo retirar referencias obsoletas necesarias para que las verificaciones de modelos sean inequívocas.

## Criterios de aceptación

- Texto y visión seleccionan Qwen 3.6 Groq como primera opción.
- Los fallbacks respetan exactamente el orden aprobado.
- Se prueban todas las claves del modelo prioritario antes de cambiar de modelo.
- El razonamiento de Qwen no aparece en la interfaz ni se guarda en diagnósticos.
- Los controles de coherencia y grounding continúan activos.
- Tests, TypeScript, lint, whitespace y build pasan.
- Las tres pruebas funcionales en producción producen respuestas válidas con Qwen Groq y no escriben datos de negocio.
