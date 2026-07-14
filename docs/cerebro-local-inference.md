# Cerebro: inferencia local y visión

## Servicio GPU validado

El servidor de inferencia local expone una API OpenAI-compatible y debe declararse en el despliegue de MACCELL, sin publicar nuevas claves ni valores en el repositorio:

```dotenv
CEREBRO_LOCAL_AI_BASE_URL=http://100.71.184.125:8000/v1
CEREBRO_LOCAL_AI_MODEL=Qwen3.6-35B-A3B-Q4_K_M
CEREBRO_LOCAL_VISION_BASE_URL=http://100.71.184.125:8000/v1
CEREBRO_LOCAL_VISION_MODEL=Qwen3.6-35B-A3B-Q4_K_M
```

El host de la aplicación debe poder alcanzar esa dirección privada. Antes de habilitar las variables, comprobar desde el contenedor de MACCELL `GET /health` y `GET /props`; este último debe devolver `modalities.vision: true`.

Groq y OpenRouter permanecen como fallback: no se eliminan durante esta migración.

El servicio reproducible vive en `infra/cerebro-local-ai/docker-compose.yml`. Usa el GGUF Q4_K_M y `mmproj-F16.gguf` del repositorio `unsloth/Qwen3.6-35B-A3B-GGUF`, distribuye el modelo entre las dos RTX 3090 y publica el puerto solo sobre Tailscale.

No habilitar speculative MTP en este servicio: la combinación de MTP e imágenes tiene regresiones conocidas en llama.cpp. Cerebro prioriza estabilidad multimodal, mantiene dos secuencias concurrentes con 32K de contexto total y desactiva el razonamiento interno del template; el razonamiento técnico queda estructurado por el prompt, la evidencia RAG y las preguntas guiadas, sin consumir la respuesta visible.

## Despliegue de la base de datos

La migración `20260714154000_add_repair_learning_records` es aditiva: crea la tabla de cierres técnicos y sus índices, sin actualizar ni borrar reparaciones existentes.

Procedimiento de producción:

1. Realizar y verificar un backup de PostgreSQL.
2. Ejecutar `npx prisma migrate deploy` desde el artefacto de la aplicación.
3. Confirmar que existe `repair_learning_records` y que el conteo de `repairs` no cambió.
4. Desplegar la aplicación y luego el worker RAG que contiene la consulta ampliada.
5. Comprobar un cierre técnico y su sincronización RAG antes de habilitar la revisión para LoRA.

No ejecutar `prisma db push` directamente en producción para este cambio.

## Evidencia y aprendizaje

- Un estado `Finalizado OK` por sí solo ya no promociona una reparación a evidencia confirmada en el RAG.
- El técnico debe completar síntoma, causa, medición/evidencia, intervención y verificación.
- Un administrador revisa el cierre por `POST /api/cerebro-v2/closure/review`.
- Solo los registros confirmados y revisados salen en `GET /api/cerebro-v2/lora-dataset` como JSONL.

## LoRA deshabilitado

Cerebro ejecuta el modelo base sin adaptadores. Los cierres técnicos revisados alimentan el RAG y el conjunto de evaluación, pero no se entrena ni se carga ningún LoRA en producción.

## Investigación externa

Google y YouTube se consultan solo sin evidencia RAG suficiente. Configuración opcional:

```dotenv
GOOGLE_CUSTOM_SEARCH_API_KEY=...
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...
YOUTUBE_DATA_API_KEY=...
```

Los resultados se etiquetan como fuentes externas no verificadas: requieren corroboración con manual, schematic o medición antes de convertirse en un paso técnico.
