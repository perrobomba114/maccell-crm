# 🧠 Cerebro — Documentación Técnica (Cloud Edition)

> **Sistema de Inteligencia Artificial** integrado en el CRM de MACCELL para diagnóstico técnico. 
> **Estado:** Migrado 100% a la nube vía OpenRouter (Gemini 2.0 Flash).

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (Técnico)                        │
│              Browser → https://maccell.app/admin/cerebro        │
└─────────────────────────┬───────────────────────────────────────┘
                          │  HTTP Stream (Plain Text)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (App Router)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/app/api/cerebro/chat/route.ts                      │   │
│  │  • Único punto de entrada                               │   │
│  │  • RAG: Búsqueda en pgvector local                      │   │
│  │  • Cloud Router: Envío a OpenRouter                     │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
               ┌──────────┴──────────┐
               │                     │
               ▼                     ▼
┌─────────────────────┐   ┌──────────────────────────────────────┐
│   PostgreSQL        │   │       OPENROUTER (API CLOUD)         │
│   (pgvector)        │   │   Modelo: Gemini 2.0 Flash           │
│                     │   │                                      │
│  repair_embeddings  │   │  • Mejor razonamiento técnico        │
│  (Búsqueda RAG)     │   │  • Visión de alta resolución         │
│                     │   │  • Latencia ultra baja               │
└─────────────────────┘   └──────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| **IA Engine** | **OpenRouter** | Proveedor de modelos en la nube |
| **Modelo Principal** | **Gemini 2.0 Flash** | Chat y Visión (Paid Tier) |
| **Transport** | **TextStreamChatTransport** | Streaming de texto plano al cliente |
| **DB Vectorial** | **pgvector** | Memoria técnica histórica |
| **Integración** | **Vercel AI SDK** | Tipado y control de streams |

---

## 3. Configuración y Variables de Entorno

Para que Cerebro funcione, el archivo `.env` debe tener:

```bash
# API Key secreta de OpenRouter
OPENROUTER_API_KEY="sk-or-v1-..."

# Modelo a utilizar
OPENROUTER_MODEL="google/gemini-2.0-flash-001"
```

---

## 4. Flujo de Visión (Placas Electrónicas)

Gemini 2.0 Flash maneja texto e imágenes de forma nativa. 

- **Detección técnica:** El `VISION_PROMPT` obliga al modelo a actuar como un experto en microsoldadura.
- **Multimodal:** Se pueden enviar varias imágenes y el modelo correlacionará el daño.
- **Sin Dependencias Locales:** Se eliminó Ollama. Todo el procesamiento ocurre en los servidores de Google vía OpenRouter.

---

## 5. RAG (Retrieval-Augmented Generation)

Cerebro consulta la base de datos de MACCELL antes de responder.

1. El servidor recibe la consulta del técnico.
2. Busca en la tabla `repair_embeddings` casos similares.
3. Si encuentra soluciones exitosas (similitud > 0.75), las inyecta en el prompt.
4. Gemini usa esa "experiencia previa" para dar un diagnóstico acertado.

---

## 6. Troubleshooting

### El chat no responde
Verifica `OPENROUTER_API_KEY` en el `.env`. El chat informará si la autenticación falla (Error 401).

### Error 500 en el backend
Revisa los logs de `npm run dev`. Puede ser un problema de conectividad con la base de datos PostgreSQL o con el servicio de OpenRouter.

---
*Documentación actualizada: Febrero 2026 | Cerebro Cloud Migration*
