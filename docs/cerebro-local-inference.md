# Cerebro: inferencia local, visión y LoRA

## Servicio GPU validado

El servidor de inferencia local expone una API OpenAI-compatible y debe declararse en el despliegue de MACCELL, sin publicar nuevas claves ni valores en el repositorio:

```dotenv
CEREBRO_LOCAL_AI_BASE_URL=http://100.71.184.125:8000/v1
CEREBRO_LOCAL_AI_MODEL=unsloth/Qwen3.6-27B-MTP-GGUF
CEREBRO_LOCAL_VISION_BASE_URL=http://100.71.184.125:8000/v1
CEREBRO_LOCAL_VISION_MODEL=unsloth/Qwen3.6-27B-MTP-GGUF
```

El host de la aplicación debe poder alcanzar esa dirección privada. Antes de habilitar las variables, comprobar desde el contenedor de MACCELL `GET /health` y `GET /props`; este último debe devolver `modalities.vision: true`.

Groq y OpenRouter permanecen como fallback: no se eliminan durante esta migración.

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

## LoRA

No se debe cargar ni entrenar un LoRA hasta contar con un lote revisado representativo (mínimo 300 casos completos, con evaluación de regresión y una comparación contra el modelo base). El adaptador se debe servir primero en sombra y promoverse únicamente si mejora casos técnicos sin empeorar aislamiento de marca, citas ni seguridad.

Cuando exista un adaptador GGUF validado, iniciar una instancia canaria con `--lora /ruta/al/adaptador.gguf`, probarla contra el set de evaluación y conservar el contenedor base como rollback. No se permite entrenar a partir de chats no revisados ni de contenido web.

## Investigación externa

Google y YouTube se consultan solo sin evidencia RAG suficiente. Configuración opcional:

```dotenv
GOOGLE_CUSTOM_SEARCH_API_KEY=...
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...
YOUTUBE_DATA_API_KEY=...
```

Los resultados se etiquetan como fuentes externas no verificadas: requieren corroboración con manual, schematic o medición antes de convertirse en un paso técnico.
