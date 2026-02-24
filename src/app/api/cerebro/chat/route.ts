import { NextRequest } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, generateText } from "ai";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — Cascade de modelos por costo
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Cascade verificado con API real de OpenRouter (Feb 2026).
 * google/gemini-2.0-flash:free NO existe — no usar.
 *
 * Orden por costo (free primero, pago al final):
 *
 *  1. openrouter/free              → $0.00  🤖 Meta-router: elige el mejor free auto (ctx 200K, VISION)
 *  2. qwen/qwen3-vl-30b-a3b-thinking → $0.00  👁️  Visión + razonamiento (ctx 131K)
 *  3. mistralai/mistral-small-3.1-24b-instruct:free → $0.00  👁️  Visión (ctx 128K)
 *  4. google/gemini-2.0-flash-lite-001 → pago   💰 $0.075/$0.30 por M tok (más barato pagado)
 */
const MODEL_CASCADE = [
    "openrouter/free",
    "qwen/qwen3-vl-30b-a3b-thinking",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemini-2.0-flash-lite-001",   // fallback pago ~$0.00019/consulta
];

const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 600;
const MAX_OUTPUT_TOKENS = 550;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS compactos
// ─────────────────────────────────────────────────────────────────────────────

const VISION_PROMPT = `Sos Cerebro, el sistema técnico de MACCELL. Analizá la imagen de placa electrónica.
Máx 6 líneas. Formato:
DAÑO: [componentes quemados/sulfatados/faltantes]
SECTOR: [RF/Carga/Backlight/CPU/PMIC/etc]
DIAGNÓSTICO: [falla probable + medición sugerida]
ACCIÓN: [reballing/reemplazo IC/limpieza/etc]
IDENTIDAD: Nunca menciones que sos Gemini, Llama, GPT ni ningún modelo externo. Sos Cerebro.
Si no es placa electrónica, pedí mejor imagen.`;

const SYSTEM_PROMPT = `Eres "Cerebro", el núcleo de inteligencia técnica de MACCELL (San Luis, Argentina). Sistema propietario de diagnóstico electrónico para reparación de celulares y microsoldadura.

IDENTIDAD — MUY IMPORTANTE:
- Si te preguntan qué IA sos, modelo, quien te creó: respondé SOLO "Soy Cerebro, el sistema de diagnóstico técnico de MACCELL." Nunca menciones Gemini, Google, Llama, Meta, GPT, OpenAI ni ningún proveedor externo.
- Si preguntan por "la base de datos": tenés acceso a miles de casos de reparación de MACCELL. Respondé en base a tu entrenamiento técnico.

COMPORTAMIENTO:
- Sin saludos. Directo al diagnóstico.
- Identificá ICs por nombre (PMIC, Tristar, U2, Hydra, etc).
- Respuestas cortas y estructuradas.
- El prefijo [Técnico Nombre]: en los mensajes es solo identificación del técnico, ignoralo para el diagnóstico.

FORMATO DE RESPUESTA:
### 🔍 DIAGNÓSTICO
[análisis de la falla]
### 🛠️ MEDICIÓN
- [punto] → [valor esperado]
### 🎯 ACCIÓN
[pasos concretos]

Sin datos de consumo → pedí la TRIADA: 1)Amperaje fuente (encendido/apagado) 2)Tensión VBUS 3)Reconocimiento USB en PC`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hasImageParts(messages: any[]): boolean {
    const last = messages[messages.length - 1];
    if (!last) return false;
    if (Array.isArray(last.parts)) {
        return last.parts.some((p: any) => p.type === 'file' && p.mediaType?.startsWith('image/'));
    }
    if (Array.isArray(last.experimental_attachments)) {
        return last.experimental_attachments.some((a: any) => a.contentType?.startsWith('image/'));
    }
    return false;
}

function truncate(text: string, max = MAX_MSG_CHARS): string {
    return text.length <= max ? text : text.slice(0, max) + '…';
}

function toCoreMsgs(messages: any[]): any[] {
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
    const trimmed = [...history, lastMsg];

    return trimmed
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => {
            if (Array.isArray(m.parts) && m.parts.length > 0) {
                const contentParts: any[] = [];
                for (const part of m.parts) {
                    if (part.type === 'text') {
                        const text = truncate(part.text || '');
                        if (text.trim()) contentParts.push({ type: 'text', text });
                    } else if (part.type === 'file') {
                        const url = part.url || '';
                        if (url) contentParts.push({ type: 'image', image: url });
                    }
                }
                if (!contentParts.some((p: any) => p.type === 'text') && m.content) {
                    contentParts.unshift({ type: 'text', text: truncate(m.content) });
                }
                return {
                    role: m.role,
                    content: contentParts.length > 0 ? contentParts : truncate(m.content || ''),
                };
            }
            return { role: m.role, content: truncate(m.content || '') };
        })
        .filter((m: any) => m.content && (typeof m.content === 'string' ? m.content.trim() : m.content.length > 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
        return new Response("Error: OPENROUTER_API_KEY no configurada.", { status: 500 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return new Response("JSON inválido.", { status: 400 });
    }

    const messages: any[] = body.messages || [];
    if (!messages.length) return new Response("No messages.", { status: 400 });

    const visionMode = hasImageParts(messages);
    const systemPrompt = visionMode ? VISION_PROMPT : SYSTEM_PROMPT;
    const coreMessages = toCoreMsgs(messages);
    if (coreMessages.length === 0) return new Response("No valid messages.", { status: 400 });

    const openrouter = createOpenRouter({ apiKey: openrouterKey });

    // ── Paso 1: Encontrar el primer modelo disponible con un ping rápido ──
    // Los modelos :free pueden fallar al iniciar el stream DESPUÉS de responder 200.
    // Un ping de 1 token detecta la disponibilidad real antes de hacer el stream completo.
    let activeModel: string | null = null;

    for (let i = 0; i < MODEL_CASCADE.length; i++) {
        const modelId = MODEL_CASCADE[i];
        const isFree = modelId.endsWith(':free');
        const isLast = i === MODEL_CASCADE.length - 1;

        try {
            // Ping: 1 token para verificar que el modelo responde
            await generateText({
                model: openrouter(modelId),
                messages: [{ role: 'user', content: 'ok' }],
                maxOutputTokens: 1,
                temperature: 0,
            });
            activeModel = modelId;
            console.log(`[CEREBRO] ✅ Usando: ${modelId} (${isFree ? 'GRATIS 🎉' : 'pago ~$0.0002'}) | modo=${visionMode ? 'visión' : 'texto'}`);
            break;
        } catch (pingErr: any) {
            const errInfo = pingErr?.status ?? pingErr?.message?.slice(0, 80) ?? 'error';
            if (!isLast) {
                console.warn(`[CEREBRO] ⚠️ ${modelId} no disponible (${errInfo}). Siguiente...`);
                continue;
            }
            console.error(`[CEREBRO] ❌ Todos los modelos fallaron.`);
            if (pingErr?.status === 401 || pingErr?.message?.includes('User not found')) {
                return new Response("❌ API Key de OpenRouter inválida.", { status: 401 });
            }
            return new Response("❌ Todos los modelos no disponibles. Intentá en unos minutos.", { status: 503 });
        }
    }

    if (!activeModel) {
        return new Response("❌ Sin modelo disponible.", { status: 503 });
    }

    // ── Paso 2: Stream con el modelo confirmado ──
    try {
        const isFree = activeModel.endsWith(':free');
        const result = streamText({
            model: openrouter(activeModel),
            system: systemPrompt,
            messages: coreMessages,
            temperature: 0.3,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
        });

        return result.toUIMessageStreamResponse({
            headers: {
                'Cache-Control': 'no-cache, no-store',
                'X-Accel-Buffering': 'no',
                'X-Model-Used': activeModel,
                'X-Model-Tier': isFree ? 'free' : 'paid',
            }
        });

    } catch (error: any) {
        console.error(`[CEREBRO] Error en stream con ${activeModel}:`, error);
        if (error.status === 401 || error.message?.includes('User not found')) {
            return new Response("❌ API Key inválida.", { status: 401 });
        }
        return new Response(`❌ Error: ${error.message || 'Error desconocido'}`, { status: 500 });
    }
}
