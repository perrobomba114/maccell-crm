# 🧠 Cerebro — Documentación Técnica Completa

> **Sistema de Inteligencia Artificial** integrado en el CRM de MACCELL para diagnóstico técnico de reparaciones de celulares. Esta documentación está destinada a programadores que necesiten entender, mantener o extender el sistema.

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Flujo Completo de una Consulta](#3-flujo-completo-de-una-consulta)
4. [Modelos de IA y sus Roles](#4-modelos-de-ia-y-sus-roles)
5. [RAG — Base de Conocimiento Semántico](#5-rag--base-de-conocimiento-semántico)
6. [Vision Router](#6-vision-router)
7. [API Route `/api/cerebro/chat`](#7-api-route-apicerebrochat)
8. [Frontend — componente CerebroChat](#8-frontend--componente-cerebrochat)
9. [Base de Datos](#9-base-de-datos)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Scripts de Mantenimiento](#11-scripts-de-mantenimiento)
12. [Cómo Extender Cerebro](#12-cómo-extender-cerebro)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (Técnico)                        │
│              Browser → https://maccell.app/admin/cerebro        │
└─────────────────────────┬───────────────────────────────────────┘
                          │  WebSocket / HTTP Stream
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (Vercel/Self-hosted)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/components/cerebro/cerebro-chat.tsx                │   │
│  │  • TextStreamChatTransport (@ai-sdk/react)              │   │
│  │  • Manejo de archivos/imágenes (FileReader → base64)    │   │
│  │  • Renderizado de mensajes con Markdown                 │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │ POST /api/cerebro/chat                │
│  ┌──────────────────────▼──────────────────────────────────┐   │
│  │  src/app/api/cerebro/chat/route.ts                      │   │
│  │  1. Parsea mensajes del SDK                             │   │
│  │  2. RAG: busca tickets similares en pgvector            │   │
│  │  3. Vision Router: ¿imagen es PCB?                      │   │
│  │  4. Llama a Ollama con el modelo correcto               │   │
│  │  5. Hace stream de la respuesta de vuelta               │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
┌─────────────────────┐   ┌──────────────────────────────────────┐
│   PostgreSQL        │   │   OLLAMA SERVER (Windows / RTX 3090) │
│   (pgvector)        │   │   IP: 100.110.53.47:11434            │
│                     │   │                                      │
│  repair_embeddings  │   │  ┌─────────────────────────────────┐ │
│  (vectores 768d)    │   │  │ deepseek-r1:14b  → Chat texto   │ │
│  ◄── búsqueda       │   │  │ llava:13b        → Vision PCB   │ │
│      coseno         │   │  │ llama3.2:1b      → Router (<1s) │ │
│                     │   │  │ nomic-embed-text → Embeddings   │ │
└─────────────────────┘   │  └─────────────────────────────────┘ │
                          └──────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Rol |
|---|---|---|---|
| Frontend | Next.js App Router | 15.x | SSR + API Routes |
| UI Chat | `@ai-sdk/react` `useChat` | 1.x | Hook de estado y streaming |
| Transport | `TextStreamChatTransport` | ai v4+ | Envío de mensajes al backend |
| DB principal | PostgreSQL + Prisma | 6.x | Datos de reparaciones |
| DB vectorial | pgvector (ext. de PG) | 0.7+ | Búsqueda semántica |
| LLM Chat | deepseek-r1:14b | via Ollama | Diagnóstico por texto |
| LLM Visión | llava:13b | via Ollama | Análisis de imágenes PCB |
| LLM Router | llama3.2:1b | via Ollama | Clasificador binario |
| LLM Embed | nomic-embed-text | via Ollama | Vectorización RAG |
| LLM Enhancer | llama3.1:8b | via Ollama | Mejora de diagnósticos |
| Infraestructura | Ollama + RTX 3090 | local | Sin costo de API |

---

## 3. Flujo Completo de una Consulta

### 3A. Consulta de texto (sin imagen)

```
TIPO: Técnico escribe "a23 no enciende, consumo 80mA"
                          │
                          ▼
              [cerebro-chat.tsx]
              sendMessage({ parts: [{ type: 'text', text: '...' }] })
                          │
                          ▼ POST /api/cerebro/chat
              [route.ts — Parseo]
              Extrae text de message.parts[].text
                          │
                          ▼
              [route.ts — RAG]
              findSimilarRepairs("a23 no enciende consumo 80mA", limit=3)
                • Vectoriza query con nomic-embed-text
                • Busca por coseno en repair_embeddings (pgvector)
                • Devuelve tickets similares si similarity > 0.72
                          │
              Si hay resultados:
              Inyecta en SYSTEM_PROMPT:
              "### BASE DE DATOS MACCELL — CASOS SIMILARES:
               [Caso 1 — Motorola A23 | Ticket: MAC1-170 | Similitud: 87%]
               DIAGNÓSTICO: Cortocircuito en línea PP_CPU_VDD..."
                          │
                          ▼
              [route.ts — Ollama deepseek-r1:14b]
              POST http://100.110.53.47:11434/api/chat
              { model: "deepseek-r1:14b",
                messages: [system, ...history(10), user],
                stream: true, temperature: 0.3 }
                          │
                          ▼ NDJSON stream de Ollama
              [route.ts — Stream adapter]
              Convierte NDJSON → texto plano
                          │
                          ▼ text/plain stream
              [cerebro-chat.tsx]
              TextStreamChatTransport recibe y actualiza UI en tiempo real
```

### 3B. Consulta con imagen

```
TIPO: Técnico sube foto de placa + "a12 error de pantalla"
                          │
                          ▼
              [cerebro-chat.tsx]
              FileReader.readAsDataURL(file) → base64 data URI
              sendMessage({ parts: [
                { type: 'text', text: 'a12 error de pantalla' },
                { type: 'file', file: { url: 'data:image/png;base64,...' } }
              ] })
                          │
                          ▼ POST /api/cerebro/chat
              [route.ts — Parseo]
              Extrae text de parts[0].text
              Extrae base64 de parts[1].file.url.split(',')[1]
                          │
                          ▼
              [route.ts — Vision Router]
              isElectronicBoard(base64)
                • usa llama3.2:1b (ultrarrápido ~1s)
                • pregunta: "Does this image show a PCB? YES or NO"
                          │
              ┌───────────┴───────────┐
              │ NO es PCB             │ SÍ es PCB
              ▼                       ▼
         Response inmediata:    [route.ts — Ollama llava:13b]
         "⚠️ Imagen no        POST .../api/chat
          técnica detectada"   { model: "llava:13b",
                                 messages: [
                                   system: VISION_PROMPT + "técnico indicó: ...",
                                   user: { content: text, images: [base64] }
                                 ],
                                 stream: true,
                                 temperature: 0,
                                 num_predict: 250,
                                 repeat_penalty: 1.5 }
                                        │
                                        ▼ stream de respuesta visual
```

---

## 4. Modelos de IA y sus Roles

### Configuración centralizada
**Archivo:** `src/config/ai-models.ts`

```typescript
export const OLLAMA_MODELS = {
    CHAT: "deepseek-r1:14b",        // Chat principal de diagnóstico
    VISION: "llava:13b",            // Análisis de imágenes de placas
    ROUTER: "llama3.2:1b",          // Clasificador binario (PCB sí/no)
    EMBED: "nomic-embed-text",      // Vectorización para RAG
    ENHANCER: "llama3.1:8b",        // Mejora automática de diagnósticos
    DEEP_REASONING: "deepseek-r1:14b", // Cron nocturno de enriquecimiento
}
```

### ¿Por qué estos modelos?

| Modelo | RAM GPU | Latencia | Fortaleza |
|---|---|---|---|
| `deepseek-r1:14b` | ~8GB | 3-8s | Razonamiento lógico, sigue estructura de respuesta |
| `llava:13b` | ~8GB | 5-15s | Visión + menos alucinación que llama3.2-vision |
| `llama3.2:1b` | ~1GB | <1s | Clasificación binaria rapidísima |
| `nomic-embed-text` | ~500MB | ~100ms | Embeddings de 768d, alta calidad semántica |
| `llama3.1:8b` | ~5GB | 2-5s | Instrucciones precisas, mejora de redacción |

---

## 5. RAG — Base de Conocimiento Semántico

### ¿Qué es RAG en Cerebro?

RAG (Retrieval-Augmented Generation) permite que Cerebro responda basándose en **reparaciones reales de MACCELL** en lugar de inventar respuestas genéricas.

**Sin RAG:** "El A23 podría tener un problema en el sistema de alimentación..."  
**Con RAG:** "Según Ticket #MAC1-170 (87% similar): El A23 con ese consumo tuvo cortocircuito en PP_CPU_VDD. Solución: reballing del PMIC."

### Archivos involucrados

```
src/actions/cerebro-rag.ts          ← Lógica de búsqueda semántica
scripts/index-repairs-full.js       ← Indexación inicial del historial
scripts/setup-pgvector.sql          ← Setup de la tabla vectorial
scripts/index-repairs.ts            ← Versión TypeScript del indexador
```

### Tabla `repair_embeddings` en PostgreSQL

```sql
CREATE TABLE repair_embeddings (
    id            TEXT PRIMARY KEY,
    "repairId"    TEXT UNIQUE NOT NULL,  -- FK lógica a repairs.id
    "ticketNumber" TEXT NOT NULL,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,         -- Documento completo indexado
    embedding     vector(768),           -- pgvector: nomic-embed-text output
    "createdAt"   TIMESTAMPTZ,
    "updatedAt"   TIMESTAMPTZ
);
-- Índice HNSW para búsqueda coseno en <10ms
CREATE INDEX repair_embeddings_hnsw_idx
    ON repair_embeddings USING hnsw (embedding vector_cosine_ops);
```

### ¿Qué se vectoriza?

Por cada reparación se construye un documento como este:

```
TICKET: MAC1-170
DISPOSITIVO: Motorola A23
SUCURSAL: San Luis Centro
ESTADO: Finalizado
FECHA INGRESO: 15/01/2025
TIEMPO DE REPARACIÓN: 3 día(s)
CONDICIÓN: INGRESÓ CON HUMEDAD/AGUA

PROBLEMA REPORTADO:
El equipo no enciende. Cliente dice que se cayó al agua.

DIAGNÓSTICO TÉCNICO:
Cortocircuito en línea PP_CPU_VDD. Se midió 000mV en escala de diodo.
Reballing del PMIC. El equipo funcionó correctamente.

OBSERVACIONES DEL TÉCNICO:
• Se limpió con ultrasonido antes de medir
• Se verificó batería: 3.85V OK

REPUESTOS USADOS:
• PMIC Motorola G Series (Qualcomm) x1
```

### Flujo de búsqueda RAG

```typescript
// 1. Vectorizar la pregunta del técnico
const embedding = await embedQuery("a23 no enciende consumo 80mA", "nomic-embed-text")

// 2. Búsqueda por similitud coseno en pgvector
const results = await pool.query(`
    SELECT "ticketNumber", "deviceBrand", "deviceModel", "contentText",
           1 - (embedding <=> $1::vector) AS similarity
    FROM repair_embeddings
    WHERE 1 - (embedding <=> $1::vector) >= 0.72  -- umbral de similitud
    ORDER BY embedding <=> $1::vector
    LIMIT 3
`, [vectorStr])

// 3. Formatear como contexto para el prompt
// → "### BASE DE DATOS MACCELL — CASOS SIMILARES: [Caso 1 — ...]"

// 4. Concatenar al SYSTEM_PROMPT antes de llamar a Ollama
```

---

## 6. Vision Router

### Problema que resuelve

Los modelos de visión grandes (llava:13b, llama3.2-vision) tienden a **alucinar**: si mandás el escudo de la AFA o el logo de Apple, el modelo dice que es una "placa electrónica con daños". Esto ocurre porque son modelos generativos que intentan ser "útiles" aunque no vean lo que el prompt describe.

### Solución: clasificador previo

Antes de llamar al modelo caro (llava:13b, ~8s), llamamos a un modelo ultrapequeño (`llama3.2:1b`, ~1s) que solo responde `YES` o `NO`:

```typescript
async function isElectronicBoard(base64Image: string): Promise<boolean> {
    // Llama a llama3.2:1b con temperature:0 y num_predict:5
    // Pregunta: "Does this image show a PCB? Answer ONLY YES or NO"
    // Si dice YES → continúa con llava:13b
    // Si dice NO  → devuelve mensaje inmediato sin llamar al modelo caro
    // Si hay error → falla abierta (deja pasar, no bloquea)
}
```

### Beneficios

- **Ahorro de VRAM**: llama3.2:1b usa ~1GB vs ~8GB de llava:13b
- **5-10x más rápido** para rechazos
- **Sin alucinaciones** en imágenes no técnicas
- **Fail-open**: si el router falla, el análisis continúa normalmente

---

## 7. API Route `/api/cerebro/chat`

**Archivo:** `src/app/api/cerebro/chat/route.ts`

### Endpoint

```
POST /api/cerebro/chat
Content-Type: application/json

{
  "id": "conversation-id",
  "messages": [
    {
      "role": "user",
      "parts": [
        { "type": "text", "text": "a23 no enciende" },
        { "type": "file", "file": { "url": "data:image/png;base64,..." } }
      ]
    }
  ],
  "trigger": "submit-message"
}
```

### Respuesta

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8

### 📂 REFERENCIA HISTÓRICA (Maccell DB)
- Se encontró coincidencia en Ticket #MAC1-170...

### 🔍 ANÁLISIS DE CONSUMO...
```

Stream de texto plano (compatible con `TextStreamChatTransport`).

### Lógica interna (pseudocódigo)

```
POST(req) {
  messages = await req.json().messages
  
  // 1. Mapear mensajes SDK → formato Ollama
  ollamaMessages = messages.map(m => {
    text = m.parts.filter(type='text').join()
           || m.content  // fallback
    images = m.parts.filter(type='file').map(extractBase64)
    return { role, content: text, images }
  }).filter(hasContent)
  
  history = ollamaMessages.slice(-10)  // últimos 10
  lastUser = history.reverse().find(role='user')
  hasImages = lastUser.images?.length > 0
  
  if hasImages:
    // Vision Router
    isPCB = await isElectronicBoard(lastUser.images[0])
    if !isPCB: return "⚠️ No es placa" (inmediato)
    
    // Visión con llava:13b (sin historial, solo imagen actual)
    messages = [
      { role:'system', content: VISION_PROMPT + userText },
      { role:'user', content: userText, images: lastUser.images }
    ]
  else:
    // RAG: buscar reparaciones similares
    ragContext = await findSimilarRepairs(lastUser.content)
    systemPrompt = SYSTEM_PROMPT + ragContext
    
    history.unshift({ role:'system', content: systemPrompt })
    messages = history
  
  // Llamar a Ollama y hacer streaming
  ollamaResponse = fetch(OLLAMA_URL/api/chat, { stream:true, ... })
  
  // Adaptar NDJSON → texto plano
  stream = ollamaResponse.body
    .parse each line as JSON
    .extract parsed.message.content
    .encode as UTF-8 bytes
  
  return Response(stream, { 'Content-Type': 'text/plain' })
}
```

---

## 8. Frontend — componente CerebroChat

**Archivo:** `src/components/cerebro/cerebro-chat.tsx`

### Hook principal

```typescript
const { messages, sendMessage, stop, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,  // del servidor (historial de DB)
    transport: new TextStreamChatTransport({ api: "/api/cerebro/chat" }),
    onFinish: async ({ message, messages }) => {
        // Guarda mensajes en DB (cerebroMessages)
        await saveMessagesToDbAction(conversationId, messages)
        // Genera título automático si es la primera vez
        if (messages.length === 2) await updateConversationTitleAction(...)
    },
    onError: (err) => toast.error(err.message)
})
```

### ¿Por qué `TextStreamChatTransport` y no `DefaultChatTransport`?

El backend devuelve **texto plano puro** (no el protocolo `0:"texto"\n` de Vercel). `TextStreamChatTransport` es el transport correcto para este caso:

| Transport | Formato esperado del backend |
|---|---|
| `DefaultChatTransport` | `0:"texto"\n` (Vercel Data Stream Protocol) |
| `TextStreamChatTransport` | texto plano (compatible con Ollama directo) |

### Envío de mensajes con imágenes

```typescript
// Las imágenes NO van como experimental_attachments
// Van dentro del array parts como type:'file'
const parts = [
    { type: 'text', text: userInput },
    { type: 'file', file: { name, type, url: base64DataURI } }
]
sendMessage({ parts })

// En route.ts, se extrae así:
// part.type === 'file' && part.file.url.startsWith('data:image')
```

**¿Por qué no `experimental_attachments`?**  
Con `TextStreamChatTransport`, el segundo argumento de `sendMessage` no se serializa en el body. Solo `parts` llega al servidor.

---

## 9. Base de Datos

### Modelos Prisma relacionados con Cerebro

```prisma
// Conversaciones de Cerebro (una por sesión de trabajo del técnico)
model CerebroConversation {
  id        String           @id
  userId    String
  title     String?          // Generado automáticamente por la IA
  messages  CerebroMessage[]
}

// Mensajes individuales (persisten entre sesiones)
model CerebroMessage {
  id             String @id
  conversationId String
  role           String  // 'user' | 'assistant'
  content        String
  mediaUrls      String[] // URLs de imágenes adjuntas
}

// Embeddings vectoriales para RAG (gestionado con SQL raw)
// Tabla: repair_embeddings (no en schema Prisma, se maneja con pg Pool directo)
```

### ¿Por qué `repair_embeddings` no está en Prisma?

Prisma no soporta nativo el tipo `vector(768)` de pgvector. Se usa `pg.Pool` con SQL directo para:
- INSERT/UPSERT de embeddings
- Búsqueda por similitud coseno (`<=>` operator de pgvector)
- CREATE INDEX HNSW

Todo lo demás usa el PrismaClient normal.

---

## 10. Variables de Entorno

```bash
# .env

# Base de datos PostgreSQL (misma DB del CRM)
DATABASE_URL="postgresql://user:pass@host:5432/maccell_db"

# Servidor Ollama (Windows con RTX 3090, acceso vía Tailscale)
OLLAMA_BASE_URL="http://100.110.53.47:11434"

# Nota: NO hay API keys de OpenAI ni Anthropic.
# Todo corre local en la red de MACCELL.
```

---

## 11. Scripts de Mantenimiento

### Setup inicial (una sola vez)

```bash
# 1. Habilitar pgvector en PostgreSQL
psql -d maccell_db -f scripts/setup-pgvector.sql

# 2. Descargar modelos en el servidor Ollama (PowerShell Windows)
ollama pull llava:13b
ollama pull llama3.2:1b
ollama pull nomic-embed-text

# 3. Indexar historial completo de reparaciones
node scripts/index-repairs-full.js
```

### Mantenimiento regular

```bash
# Indexar solo reparaciones nuevas (correr semanalmente o con cron)
node scripts/index-repairs-full.js --only-new

# Reiniciar toda la base vectorial (si se cambia el modelo de embeddings)
node scripts/index-repairs-full.js --reset

# Revisar un ticket específico
node scripts/index-repairs-full.js --ticket MAC1-170

# Ver cuántos vectores hay en la DB
psql -d maccell_db -c "SELECT COUNT(*) FROM repair_embeddings;"
```

### Opciones del script

| Flag | Descripción |
|---|---|
| *(sin flags)* | Indexa todas las reparaciones con diagnóstico |
| `--only-new` | Solo indexa las que no tienen embedding aún |
| `--reset` | Borra todo y reindexar completo |
| `--ticket X` | Indexa solo el ticket número X |

---

## 12. Cómo Extender Cerebro

### Agregar un nuevo modelo de IA

1. Descargar con `ollama pull new-model:7b` en el servidor Windows
2. Agregar en `src/config/ai-models.ts`:
   ```typescript
   NUEVO_ROL: "new-model:7b",
   ```
3. Usar en `route.ts`: `OLLAMA_MODELS.NUEVO_ROL`

### Cambiar el SYSTEM_PROMPT

Editar la constante `SYSTEM_PROMPT` en `src/app/api/cerebro/chat/route.ts`. El prompt usa markdown porque `deepseek-r1:14b` lo respeta en la salida.

**Estructura del SYSTEM_PROMPT actual:**
1. Descripción de rol y contexto
2. Protocolo de consulta a DB
3. Estructura obligatoria de respuesta (5 secciones con emojis)
4. Triada de ingreso MACCELL (para datos insuficientes)
5. Terminología técnica requerida

### Cambiar umbrales del RAG

En `src/app/api/cerebro/chat/route.ts`:
```typescript
const similarRepairs = await findSimilarRepairs(userQuery, 3, 0.72);
//                                                          ↑  ↑
//                                                    limit  min_similarity
```

- `limit`: cuántos casos similares inyectar (3 es un buen balance)
- `min_similarity`: umbral 0.72 = 72% de similitud coseno mínima

Si bajás el umbral (e.g. 0.60), el RAG es más "generoso" pero trae casos menos relevantes.

### Agregar otro endpoint de Cerebro (ej: Cerebro visual de esquemáticos)

1. Crear `src/app/api/cerebro/schematics/route.ts`
2. Importar los modelos desde `@/config/ai-models`
3. Usar un VISION_PROMPT específico para esquemáticos
4. El frontend puede usar otro `useChat` con `api: "/api/cerebro/schematics"`

---

## 13. Troubleshooting

### El chat no responde nada

1. **Verificar Ollama:** `curl http://100.110.53.47:11434/api/tags` — debe devolver lista de modelos
2. **Verificar que el modelo está descargado:** la respuesta debe incluir `deepseek-r1:14b`
3. **Verificar red Tailscale:** hacer ping al servidor desde la Mac
4. **Console del browser:** buscar errores en la pestaña Network → `/api/cerebro/chat`

### El chat responde pero ignora el mensaje del usuario

Síntoma: siempre responde con la "Triada de ingreso MACCELL" sin importar qué se escriba.

Causa probable: el campo `parts` del mensaje llega vacío al backend.

Debug:
```typescript
// Agregar en route.ts temporalmente:
console.log("BODY:", JSON.stringify(await req.json()).substring(0, 500))
```

### Las imágenes no se analizan

1. Verificar que `llava:13b` está descargado: `ollama list | grep llava`
2. Verificar que el Vision Router (`llama3.2:1b`) también está descargado
3. Revisar logs: buscar `[CEREBRO_ROUTER]` — si no aparece, la imagen no llega como `parts`

### El RAG no incluye casos similares

1. Verificar que pgvector está activo: `SELECT * FROM pg_extension WHERE extname='vector';`
2. Verificar que la tabla tiene datos: `SELECT COUNT(*) FROM repair_embeddings;`
3. Si está vacía: ejecutar `node scripts/index-repairs-full.js`
4. Verificar que `nomic-embed-text` está en Ollama: `ollama list | grep nomic`

### La respuesta se corta / trunca

El parámetro `num_predict: 1024` controla el máximo de tokens. Para respuestas más largas:
```typescript
// En route.ts
num_predict: hasImagesInLastMessage ? 250 : 2048,  // aumentar para texto
```

### El modelo de visión alucina en imágenes técnicas reales

El Vision Router dijo `YES` (es PCB) pero el modelo describe cosas incorrectas.

Opciones:
1. Mejorar la foto (más luz, más foco en el área dañada)
2. Ajustar `VISION_PROMPT` para ser más específico
3. Considerar subir a `llava:34b` si el hardware lo permite (requiere ~20GB VRAM)

---

## Estructura de Archivos

```
src/
├── app/
│   ├── api/cerebro/chat/
│   │   └── route.ts              ← API endpoint principal de Cerebro
│   ├── admin/cerebro/
│   │   └── page.tsx              ← Página de Cerebro para admins
│   └── technician/cerebro/
│       └── page.tsx              ← Página de Cerebro para técnicos
├── components/cerebro/
│   ├── cerebro-chat.tsx          ← Componente de chat (frontend)
│   └── cerebro-layout.tsx        ← Layout con sidebar de historial
├── actions/
│   ├── cerebro-actions.ts        ← Server actions (DB: conversations, messages)
│   └── cerebro-rag.ts            ← Búsqueda semántica con pgvector
└── config/
    └── ai-models.ts              ← Configuración centralizada de modelos

scripts/
├── setup-pgvector.sql            ← Setup inicial de pgvector (una vez)
├── index-repairs-full.js         ← Indexador completo de reparaciones
└── index-repairs.ts              ← Versión TypeScript del indexador

prisma/
└── schema.prisma                 ← Modelos: Repair, RepairEmbedding,
                                    CerebroConversation, CerebroMessage
```

---

## Diagrama de Decisión del Route

```
                    POST /api/cerebro/chat
                           │
                    Parsear mensajes
                    Extraer texto + base64
                           │
                   ┌───────┴───────┐
             ¿Tiene imágenes?
             │               │
            SÍ              NO
             │               │
     Vision Router          RAG
     llama3.2:1b    findSimilarRepairs()
             │               │
      ┌──────┴──────┐   Inyectar tickets
      │ NO es PCB   │   similares en prompt
      ▼             │             │
  Respuesta         SÍ           │
  inmediata         │             │
  "No es placa"     ▼             ▼
                llava:13b    deepseek-r1:14b
                VISION_PROMPT SYSTEM_PROMPT
                temp=0        temp=0.3
                num_pred=250  num_pred=1024
                repeat=1.5    repeat=1.1
                    │             │
                    └──────┬──────┘
                    Stream texto plano
                    → TextStreamChatTransport
                    → useChat() actualiza UI
```

---

*Documentación generada: Febrero 2026 | MACCELL CRM — Sistema Cerebro AI*
