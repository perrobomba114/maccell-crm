import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { db as prisma } from "@/lib/db";

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

const VISION_PROMPT = `Eres "Cerebro", el sistema de visión y diagnóstico técnico de MACCELL. Analiza la imagen con "Ojos de Técnico en Microsoldadura Nivel 3".

🚨 REGLAS VISUALES CRÍTICAS:
1. Pone MAYOR atención a los conectores FPC (plástico derretido, pines internos doblados, hundidos, soldadura fría, pads arrancados). Son la falla física más común.
2. Si ves una barra rectangular con decenas de pines dorados a los lados, ES UN CONECTOR FPC (flex de pantalla, carga, cámara o batería), no una ranura de SIM o tarjeta SD.
3. Busca sulfatación, resina removida, o pistas expuestas.

FORMATO DE SALIDA ESTRICTO (No agregues nada más):
DAÑO VISIBLE: [Ej. Pines internos dañados en conector FPC de 40 pines]
SECTOR: [FPC Pantalla / Flex Carga / PMIC / etc]
DIAGNÓSTICO TÉCNICO: [Ej. Pérdida de comunicación de pistas MIPI o VBUS por rotura de pines en conector FPC]
ACCIÓN SUGERIDA: [Ej. Reemplazo de FPC en placa base con aleación 138°C / 183°C]`;

const SYSTEM_PROMPT = `Eres "Cerebro", el núcleo de inteligencia técnica de MACCELL (San Luis, Argentina). Sistema propietario de diagnóstico electrónico avanzado de NIVEL 3.

NUNCA HAGAS PREGUNTAS BÁSICAS DE USUARIO FINAL (ej. "¿probaste con otro cargador?", "¿probaste otro cable?", "¿probaste enchufarlo en otro lado?"). HABLAS CON TÉCNICOS EXPERTOS, ASUMÍ QUE LO BÁSICO YA SE DESCARTÓ.

COMPORTAMIENTO:
- 🚨 MODO INSTRUCTOR: Si el técnico EXPRÉSAMENTE te pide ayuda para hacer algo (ej. "¿cómo mido el pmic?", "¿qué mido si no carga?"), ABANDONÁ EL FORMATO DE DIAGNÓSTICO ESTRICTO y dale una GUÍA PASO A PASO sobre cómo hacer la medición. (ej. "Poné el multímetro en escala de Diodos/Voltaje, tocá el pin X con la punta roja a tierra...").
- MODO DIAGNÓSTICO: Al recibir el síntoma (ej. "a53 no carga 0.0A"), preguntá por mediciones avanzadas en placa (caída de tensión, voltajes en LDO, ICs).
- NO des conclusiones apresuradas sin datos métricos técnicos.
- Identificá ICs por nombre técnico (PMIC, OVP, IF PMIC, Tristar).

FORMATO DE RESPUESTA PARA DIAGNÓSTICOS (Para síntomas e interacciones de rutina):
> 📊 **Base de datos MACCELL consultada:** analizando esquemáticos e historial...

### 🔍 DIAGNÓSTICO PRELIMINAR
[Tu análisis técnico]
### 🕵️‍♂️ PREGUNTAS AL TÉCNICO / QUÉ MEDIR
- [Ej: ¿Qué caída de tensión tenés en VBUS?]
- [O instrucciones directas si pidió ayuda: "Medí de esta forma el PMIC: ..."]
### 🎯 ACCIÓN RECOMENDADA
[Mediciones sugeridas en condensadores/ICs o pasos de microsoldadura directos]

🚨 IMPORTANTE: Si la "WIKI DE MACCELL" te informa de un caso relevante en tu contexto (ej. jumper de carga), DEBÉS sugerirlo directamente en la sección ACCIÓN y mencionarlo.`;

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
    let systemPrompt = visionMode ? VISION_PROMPT : SYSTEM_PROMPT;
    const coreMessages = toCoreMsgs(messages);
    if (coreMessages.length === 0) return new Response("No valid messages.", { status: 400 });

    const modeLabel = visionMode ? 'VISIÓN' : 'TEXTO';

    // ── Recuperación RAG (Base de Conocimiento) ──────────────────────────────
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userText = lastUserMessage?.content || "";

    if (userText && userText.length > 2) {
        try {
            // Filter common stop words to improve Prisma search matches
            const stopWords = new Set(["hola", "tengo", "que", "hacer", "como", "para", "con", "por", "los", "las", "del", "una", "uno", "celular", "equipo", "falla", "problema"]);

            // Extraer posibles términos de búsqueda (modelos, fallas, etc)
            const terms = userText.toLowerCase().split(/\s+/)
                .map((t: string) => t.replace(/[^a-z0-9]/g, ''))
                .filter((t: string) => t.length >= 2 && !stopWords.has(t))
                .slice(0, 5);

            if (terms.length > 0) {
                const searchConditions = terms.map((term: string) => ({
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { deviceModel: { contains: term, mode: 'insensitive' } },
                        { content: { contains: term, mode: 'insensitive' } },
                        { problemTags: { hasSome: [term] } }
                    ]
                }));

                const knowledgeBaseResults = await (prisma as any).repairKnowledge.findMany({
                    where: { OR: searchConditions },
                    take: 3,
                    orderBy: { createdAt: 'desc' }
                });

                if (knowledgeBaseResults && knowledgeBaseResults.length > 0) {
                    const ctx = knowledgeBaseResults.map((k: any, i: number) =>
                        `[CASO RELEVANTE ${i + 1} — ${k.deviceBrand} ${k.deviceModel}]\nFalla: ${k.title}\nResolución: ${k.content}`
                    ).join("\n\n");

                    systemPrompt += `\n\n### 📚 WIKI DE MACCELL (BASE DE CONOCIMIENTO):
He encontrado los siguientes casos reales documentados por técnicos en la base de datos de MACCELL que coinciden con la consulta. BÁSATE EN ESTOS DATOS RECIENTES PARA EL DIAGNÓSTICO:

${ctx}`;
                }
            }
        } catch (error) {
            console.error("[Cerebro] RAG Error:", error);
        }
    }

    // ── Cascade de intentos ──────────────────────────────────────────────────
    // Cada entrada: { label, model }
    // Construimos el array según las env vars disponibles

    type Attempt = { label: string; model: any };
    const attempts: Attempt[] = [];

    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (visionMode) {
        // EN MODO VISIÓN, GOOGLE GEMINI DEBE SER EL REY ABSOLUTO
        // (Groq deprecó por completo sus modelos Llama 3.2 Vision)
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini/2.0-flash [VISIÓN NATIVA DOMINANTE EXPERTA]', model: google('gemini-2.0-flash') });
            attempts.push({ label: 'Gemini/1.5-pro [VISIÓN PRO fallback]', model: google('gemini-1.5-pro') });
        }
    } else {
        // EN MODO TEXTO, GROQ SIGUE SIENDO PRIORIDAD POR VELOCIDAD
        if (groqKey) {
            const groq = createGroq({ apiKey: groqKey });
            attempts.push({ label: 'Groq/llama-3.3-70b [LLAMA 3.3 TIER 1]', model: groq('llama-3.3-70b-versatile') });
            attempts.push({ label: 'Groq/llama-3.1-8b [FALLBACK RAPIDO]', model: groq('llama-3.1-8b-instant') });
        }
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini/2.0-flash [FREE]', model: google('gemini-2.0-flash') });
        }
    }

    // OpenRouter como último recurso
    if (openrouterKey) {
        const openrouter = createOpenRouter({ apiKey: openrouterKey });
        const orModel = process.env.OPENROUTER_MODEL || (visionMode ? 'google/gemini-2.0-flash-lite-001' : 'openrouter/free');
        attempts.push({ label: `OpenRouterFallback [${orModel}]`, model: openrouter(orModel) });
    }

    if (attempts.length === 0) {
        return new Response("❌ No hay API keys configuradas. Agregá GROQ_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env", { status: 500 });
    }

    // Intentar cada modelo en orden hasta que uno funcione
    for (let i = 0; i < attempts.length; i++) {
        const { label, model } = attempts[i];
        const isLast = i === attempts.length - 1;

        try {
            const result = await streamText({
                model,
                system: systemPrompt,
                messages: coreMessages,
                temperature: 0.3,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                maxRetries: 0, // Fallback INMEDIATO sin reintentos automáticos que cuelguen la app
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
