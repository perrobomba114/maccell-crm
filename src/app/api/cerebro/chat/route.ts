import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { db as prisma } from "@/lib/db";
import pdfParse from 'pdf-parse';
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN TÉCNICA
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 8;
const MAX_MSG_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 1500;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Eres "Cerebro", el sistema experto de MACCELL. Asiste a técnicos de microsoldadura Nivel 3.
Responde siempre con el formato "Análisis Diferencial 📊". Sé directo, técnico y preciso. 
PROHIBIDO mencionar precios.

### ESTRUCTURA:
1. **Análisis Diferencial 📊**
2. **🔍 ESTADO DEL SISTEMA**
3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN**
4. **🎯 INTERVENCIÓN SUGERIDA**`;

const VISION_PROMPT = `${SYSTEM_PROMPT}\n\nAnaliza la imagen buscando anomalías físicas, sulfatación o componentes dañados.`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE ROBUSTEZ
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
                let parts: any[] = [];

                // Procesar parts si existen
                if (Array.isArray(m.parts)) {
                    for (const p of m.parts) {
                        if (p.type === 'text' && p.text) parts.push({ type: 'text', text: truncate(p.text) });
                        if ((p.type === 'image' || p.type === 'file') && p.url) {
                            if (p.url.startsWith('data:image/') || p.mediaType?.startsWith('image/')) {
                                parts.push({ type: 'image', image: p.url });
                            }
                        }
                    }
                }

                // Procesar content legacy
                if (typeof m.content === 'string' && m.content.trim()) {
                    if (parts.length === 0) return { role: m.role, content: truncate(m.content) };
                    parts.push({ type: 'text', text: truncate(m.content) });
                } else if (Array.isArray(m.content)) {
                    for (const c of m.content) {
                        if (c.type === 'text' && c.text) parts.push({ type: 'text', text: truncate(c.text) });
                        if (c.type === 'image' && c.image) parts.push({ type: 'image', image: c.image });
                    }
                }

                if (parts.length === 0) return { role: m.role, content: "[Mensaje vacío]" };
                return { role: m.role, content: parts };
            });
    } catch (e) {
        console.error("[CEREBRO] toCoreMsgs Fatal Error:", e);
        return [{ role: 'user', content: 'Fallback error processing messages' }];
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
        const body = await req.json();
        const messages = body.messages || [];
        if (!messages.length) return new Response("No messages provided", { status: 400 });

        const isVision = messages.some((m: any) =>
            (m.parts || []).some((p: any) => p.type === 'image' || p.mediaType?.startsWith('image/')) ||
            (Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image'))
        );

        let finalSystemPrompt = isVision ? VISION_PROMPT : SYSTEM_PROMPT;

        // --- ENRIQUECIMIENTO RAG & DB ---
        const lastUserText = messages.findLast((m: any) => m.role === 'user')?.content || "";
        if (typeof lastUserText === 'string' && lastUserText.length > 3) {
            // RAG Semántico
            const similar = await withTimeout(findSimilarRepairs(lastUserText, 3, 0.6), 5000, []);
            if (similar.length > 0) finalSystemPrompt += formatRAGContext(similar);

            // Ticket Search
            const ticketMatch = lastUserText.match(/MAC\d*-\d+/gi);
            if (ticketMatch) {
                const repair = await withTimeout(prisma.repair.findUnique({ where: { ticketNumber: ticketMatch[0].toUpperCase() } }), 2000, null);
                if (repair) {
                    finalSystemPrompt += `\n\n### CASO TICKET ${repair.ticketNumber}:\nEquipo: ${repair.deviceBrand} ${repair.deviceModel}\nProblema: ${repair.problemDescription}`;
                }
            }
        }

        const coreMessages = toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes procesados: ${coreMessages.length} | Modo: ${isVision ? 'Visión' : 'Texto'}`);

        // --- CASCADA DE MODELOS ---
        const groqKey = process.env.GROQ_API_KEY;
        const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        const providers = [];

        if (isVision && googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            providers.push({ label: 'Gemini 2.0 Flash', model: google('gemini-2.0-flash') });
        } else {
            if (groqKey && groqKey.length > 10) {
                const groq = createGroq({ apiKey: groqKey });
                providers.push({ label: 'Groq Llama 3.3', model: groq('llama-3.3-70b-versatile') });
            }
            if (googleKey) {
                const google = createGoogleGenerativeAI({ apiKey: googleKey });
                providers.push({ label: 'Gemini 2.0 Flash', model: google('gemini-2.0-flash') });
            }
        }

        if (providers.length === 0) {
            console.error("[CEREBRO] ❌ No hay proveedores configurados");
            return new Response("Error: No AI keys found in production environment.", { status: 500 });
        }

        for (const provider of providers) {
            try {
                console.log(`[CEREBRO] 🤖 Intentando con ${provider.label}...`);
                const result = await streamText({
                    model: provider.model,
                    system: finalSystemPrompt,
                    messages: coreMessages,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                });

                return result.toDataStreamResponse({
                    headers: { 'X-Cerebro-Provider': provider.label }
                });
            } catch (err: any) {
                console.warn(`[CEREBRO] ⚠️ Proveedor ${provider.label} falló:`, err.message);
                if (provider === providers[providers.length - 1]) throw err;
            }
        }

        return new Response("Todos los proveedores fallaron.", { status: 503 });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR GLOBAL FATAL:", error);
        return new Response(`Cerebro Offline: ${error.message}`, { status: 500 });
    }
}
