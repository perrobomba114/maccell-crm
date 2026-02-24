import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { db as prisma } from "@/lib/db";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR: Solo Groq
// Modelo principal: llama-3.3-70b-versatile
// Fallback:        llama-3.1-8b-instant
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY_MSGS = 8;
const MAX_MSG_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 1500;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Cerebro", el sistema experto de MACCELL. Asiste a técnicos de microsoldadura Nivel 3.
Responde siempre con el formato "Análisis Diferencial 📊". Sé directo, técnico y preciso.
PROHIBIDO mencionar precios.

### ESTRUCTURA:
1. **Análisis Diferencial 📊**
2. **🔍 ESTADO DEL SISTEMA**
3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN**
4. **🎯 INTERVENCIÓN SUGERIDA**`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
function truncate(text: string, max = MAX_MSG_CHARS): string {
    if (!text) return "";
    return text.length <= max ? text : text.slice(0, max) + '...';
}

function toCoreMsgs(messages: any[]): any[] {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
        const trimmed = [...history, lastMsg];

        return trimmed
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => {
                // String simple
                if (typeof m.content === 'string' && m.content.trim()) {
                    return { role: m.role, content: truncate(m.content) };
                }

                // Array de parts (AI SDK v6 useChat format)
                if (Array.isArray(m.parts)) {
                    const text = m.parts
                        .filter((p: any) => p.type === 'text' && p.text)
                        .map((p: any) => truncate(p.text))
                        .join(' ');
                    return { role: m.role, content: text || '[sin texto]' };
                }

                // Array de content
                if (Array.isArray(m.content)) {
                    const text = m.content
                        .filter((c: any) => c.type === 'text' && c.text)
                        .map((c: any) => truncate(c.text))
                        .join(' ');
                    return { role: m.role, content: text || '[sin texto]' };
                }

                return { role: m.role, content: '[mensaje vacío]' };
            });
    } catch (e) {
        console.error("[CEREBRO] toCoreMsgs error:", e);
        return [{ role: 'user', content: 'Error procesando mensajes' }];
    }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    console.log("[CEREBRO] 🚀 Petición iniciada");

    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey || groqKey.length < 10) {
            console.error("[CEREBRO] ❌ GROQ_API_KEY no configurada");
            return new Response("Error: GROQ_API_KEY no configurada.", { status: 500 });
        }

        const body = await req.json();
        const messages = body.messages || [];
        if (!messages.length) return new Response("No messages provided", { status: 400 });

        // ── Enriquecimiento RAG ──────────────────────────────────────────────
        let finalSystemPrompt = SYSTEM_PROMPT;

        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        let lastUserText = '';
        if (lastUserMsg) {
            if (typeof lastUserMsg.content === 'string') {
                lastUserText = lastUserMsg.content;
            } else if (Array.isArray(lastUserMsg.parts)) {
                lastUserText = lastUserMsg.parts
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text || '')
                    .join(' ');
            } else if (Array.isArray(lastUserMsg.content)) {
                lastUserText = lastUserMsg.content
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text || '')
                    .join(' ');
            }
        }

        if (lastUserText.length > 3) {
            const similar = await withTimeout(findSimilarRepairs(lastUserText, 3, 0.6), 4000, []);
            if (similar.length > 0) {
                finalSystemPrompt += formatRAGContext(similar);
                console.log(`[CEREBRO] 🧠 RAG: ${similar.length} casos similares`);
            }

            const ticketMatch = lastUserText.match(/MAC\d*-\d+/gi);
            if (ticketMatch) {
                const repair = await withTimeout(
                    prisma.repair.findUnique({ where: { ticketNumber: ticketMatch[0].toUpperCase() } }),
                    2000,
                    null
                );
                if (repair) {
                    finalSystemPrompt += `\n\n### CASO TICKET ${repair.ticketNumber}:\nEquipo: ${repair.deviceBrand} ${repair.deviceModel}\nProblema: ${repair.problemDescription}`;
                }
            }
        }

        const coreMessages = toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes procesados: ${coreMessages.length}`);

        // ── Cascada de modelos Groq ──────────────────────────────────────────
        const groq = createGroq({ apiKey: groqKey });

        const GROQ_MODELS = [
            { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
            { label: 'Llama 3.1 8B', id: 'llama-3.1-8b-instant' },
        ];

        for (const m of GROQ_MODELS) {
            try {
                console.log(`[CEREBRO] 🤖 Intentando con ${m.label}...`);
                const result = await streamText({
                    model: groq(m.id),
                    system: finalSystemPrompt,
                    messages: coreMessages,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                });

                // ✅ CRÍTICO: toUIMessageStreamResponse() para AI SDK v6 + DefaultChatTransport
                // En ai@6, DefaultChatTransport espera el protocolo UIMessageStream.
                // toTextStreamResponse() = texto plano (solo para TextStreamChatTransport)
                // toUIMessageStreamResponse() = formato correcto para useChat + DefaultChatTransport
                return result.toUIMessageStreamResponse({
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'X-Cerebro-Provider': m.label,
                    }
                });
            } catch (err: any) {
                console.warn(`[CEREBRO] ⚠️ ${m.label} falló: ${err.message}`);
                if (m === GROQ_MODELS[GROQ_MODELS.length - 1]) throw err;
            }
        }

        return new Response("Todos los modelos Groq fallaron.", { status: 503 });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(`Cerebro Offline: ${error.message}`, { status: 500 });
    }
}
