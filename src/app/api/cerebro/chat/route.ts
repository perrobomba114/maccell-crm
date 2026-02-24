import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — Cascade multi-proveedor (sin pagar casi nada)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Cascade por proveedor — todos GRATIS, ordenados por velocidad:
 *
 *  GROQ (API key: GROQ_API_KEY en .env)
 *  1. meta-llama/llama-4-maverick-17b-128e-instruct  → 751 TPS 🔥 VISIÓN
 *  2. meta-llama/llama-4-scout-17b-16e-instruct      → ~500 TPS   VISIÓN
 *
 *  GOOGLE GEMINI directo (API key: GOOGLE_GENERATIVE_AI_API_KEY en .env)
 *  3. gemini-2.0-flash-exp                           → 237 TPS   VISIÓN (free: 15 RPM)
 *
 *  OPENROUTER (fallback final, API key: OPENROUTER_API_KEY en .env)
 *  4. openrouter/free                                → variable  VISIÓN
 *  5. google/gemini-2.0-flash-lite-001               → pago ~$0.00019/consulta
 *
 * Para obtener keys gratis:
 *  - Groq: https://console.groq.com (sin tarjeta)
 *  - Gemini: https://aistudio.google.com/apikey (sin tarjeta)
 */

const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 600;
const MAX_OUTPUT_TOKENS = 550;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
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

FORMATO DE RESPUESTA:
> 📊 **Base de datos MACCELL consultada:** analizando historial de reparaciones y manuales de esquemáticos...

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

    const modeLabel = visionMode ? 'VISIÓN' : 'TEXTO';

    // ── Cascade de intentos ──────────────────────────────────────────────────
    // Cada entrada: { label, model }
    // Construimos el array según las env vars disponibles

    type Attempt = { label: string; model: any };
    const attempts: Attempt[] = [];

    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Groq — ultrarrápido, gratis, sin tarjeta (IDs verificados vía API)
    if (groqKey) {
        const groq = createGroq({ apiKey: groqKey });

        if (visionMode) {
            // Llama 4 Maverick: 751 TPS con VISIÓN ✅
            attempts.push({ label: 'Groq/llama-4-maverick [751TPS VISIÓN 🔥]', model: groq('meta-llama/llama-4-maverick-17b-128e-instruct') });
            attempts.push({ label: 'Groq/llama-4-scout [~500TPS VISIÓN]', model: groq('meta-llama/llama-4-scout-17b-16e-instruct') });
        } else {
            // GPT-OSS-120B: 3000 TPS, solo texto (sin visión) ⚡
            attempts.push({ label: 'Groq/gpt-oss-120b [3000TPS TEXTO ⚡]', model: groq('openai/gpt-oss-120b') });
            attempts.push({ label: 'Groq/llama-4-maverick [751TPS]', model: groq('meta-llama/llama-4-maverick-17b-128e-instruct') });
            attempts.push({ label: 'Groq/llama-3.3-70b [346TPS]', model: groq('llama-3.3-70b-versatile') });
        }
    }

    // 3 — Google Gemini directo (237 TPS, gratis, visión nativa)
    if (googleKey) {
        const google = createGoogleGenerativeAI({ apiKey: googleKey });
        attempts.push({ label: 'Gemini/2.0-flash-exp [FREE 237TPS]', model: google('gemini-2.0-flash-exp') });
    }

    // 4 & 5 — OpenRouter como último recurso
    if (openrouterKey) {
        const openrouter = createOpenRouter({ apiKey: openrouterKey });
        attempts.push({ label: 'OpenRouter/free [FREE]', model: openrouter('openrouter/free') });
        attempts.push({ label: 'OpenRouter/gemini-flash-lite [pago]', model: openrouter('google/gemini-2.0-flash-lite-001') });
    }

    if (attempts.length === 0) {
        return new Response("❌ No hay API keys configuradas. Agregá GROQ_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env", { status: 500 });
    }

    // Intentar cada modelo en orden hasta que uno funcione
    for (let i = 0; i < attempts.length; i++) {
        const { label, model } = attempts[i];
        const isLast = i === attempts.length - 1;

        try {
            const result = streamText({
                model,
                system: systemPrompt,
                messages: coreMessages,
                temperature: 0.3,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
            });

            console.log(`[CEREBRO] ▶ ${label} | ${modeLabel}`);

            return result.toUIMessageStreamResponse({
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    'X-Accel-Buffering': 'no',
                    'X-Model-Used': label,
                }
            });

        } catch (error: any) {
            const status = error?.status ?? error?.statusCode;
            const msg = String(error?.message || '');

            // Error fatal de autenticación
            if (status === 401 || msg.includes('User not found') || msg.includes('invalid_api_key')) {
                console.error(`[CEREBRO] ❌ API key inválida para ${label}`);
                if (!isLast) continue; // probar siguiente proveedor
                return new Response("❌ API Key inválida.", { status: 401 });
            }

            // Rate limit o no disponible → siguiente
            const isRetryable = status === 429 || status === 503 || status === 502
                || msg.includes('rate limit') || msg.includes('overloaded')
                || msg.includes('unavailable') || msg.includes('quota')
                || msg.includes('model_not_found');

            if ((isRetryable || true) && !isLast) {
                console.warn(`[CEREBRO] ⚠️ ${label} falló (${status ?? msg.slice(0, 60)}). Siguiente...`);
                continue;
            }

            console.error(`[CEREBRO] ❌ Error con ${label}:`, error);
            return new Response(`❌ Error: ${error.message || 'Error desconocido'}`, { status: 500 });
        }
    }

    return new Response("❌ Sin modelos disponibles. Verificá tus API keys en .env", { status: 503 });
}
