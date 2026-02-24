import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { db as prisma } from "@/lib/db";
import pdfParse from 'pdf-parse';
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 1000;
const MAX_OUTPUT_TOKENS = 1500;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres "Cerebro", el sistema de inteligencia artificial experto de MACCELL. Tu misión es asistir a técnicos de microsoldadura de Nivel 3.
Tu tono debe ser profesional, técnico, directo y extremadamente preciso.

### 🛠️ REGLAS DE ORO:
1. NO SEAS GENÉRICO. No sugieras "reiniciar el equipo" o "probar con otro cable". Habla de integrados (IC), líneas de alimentación (VBUS, VCC_MAIN), protocolos (I2C, SPI) y valores en escala de diodo.
2. NO MEZCLES FALLAS. Enfócate solo en el síntoma reportado.
3. PROHIBICIÓN DE PRECIOS: NUNCA menciones precios ni costos. Solo indica disponibilidad de stock si aplica.
4. MODO DE RESPUESTA: Utiliza el formato "Análisis Diferencial 📊".

### 📊 ESTRUCTURA DE RESPUESTA (Obligatoria):
1. **Análisis Diferencial 📊**: Resumen técnico del problema.
2. **🔍 ESTADO DEL SISTEMA**: Qué líneas o componentes están involucrados.
3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN**: Pasos exactos a medir con multímetro/osciloscopio.
4. **🎯 INTERVENCIÓN SUGERIDA**: Qué componentes revisar o reemplazar (ej: U2, Tristar, PMIC).
`;

const VISION_PROMPT = `${SYSTEM_PROMPT}\n\nAnaliza la imagen con ojos de técnico. Busca sulfatación, componentes faltantes, pads rotos o conectores FPC dañados.`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

function truncate(text: string, max = MAX_MSG_CHARS): string {
    if (!text) return "";
    return text.length <= max ? text : text.slice(0, max) + '…';
}

/**
 * Convierte mensajes del frontend a CoreMessage de AI SDK de forma ultra-robusta.
 */
function toCoreMsgs(messages: any[]): CoreMessage[] {
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
    const trimmed = [...history, lastMsg];

    return trimmed
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any): CoreMessage => {
            let content: any = [];

            // 1. Procesar parts (formato moderno)
            if (Array.isArray(m.parts)) {
                for (const part of m.parts) {
                    if (part.type === 'text') {
                        content.push({ type: 'text', text: truncate(part.text) });
                    } else if (part.type === 'file' || part.type === 'image') {
                        const url = part.url || part.image || '';
                        if (url.startsWith('data:image/') || (part.mediaType && part.mediaType.startsWith('image/'))) {
                            content.push({ type: 'image', image: url });
                        }
                    }
                }
            }

            // 2. Procesar content (formato string o legacy parts)
            if (typeof m.content === 'string' && m.content.trim()) {
                if (content.length === 0) {
                    return { role: m.role, content: truncate(m.content) };
                }
                content.push({ type: 'text', text: truncate(m.content) });
            } else if (Array.isArray(m.content)) {
                for (const part of m.content) {
                    if (part.type === 'text') {
                        content.push({ type: 'text', text: truncate(part.text) });
                    } else if (part.type === 'image') {
                        content.push({ type: 'image', image: part.image });
                    }
                }
            }

            // 3. Fallback si no hay nada
            if (content.length === 0) {
                return { role: m.role, content: "[Sin contenido]" };
            }

            return { role: m.role, content };
        });
}

/**
 * Timeout helper para promesas
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    console.log("[CEREBRO] New request received");

    let body: any;
    try {
        body = await req.json();
    } catch (err) {
        console.error("[CEREBRO] JSON parse error");
        return new Response("Invalid JSON", { status: 400 });
    }

    const messages = body.messages || [];
    if (messages.length === 0) return new Response("No messages", { status: 400 });

    const hasImages = messages.some((m: any) =>
        (Array.isArray(m.parts) && m.parts.some((p: any) => p.type === 'image' || p.mediaType?.startsWith('image/'))) ||
        (Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image'))
    );

    let systemPrompt = hasImages ? VISION_PROMPT : SYSTEM_PROMPT;

    // 1. BUSCAR TICKET (Intento rápido)
    try {
        const fullText = JSON.stringify(messages);
        const ticketMatch = fullText.match(/MAC\d*-\d+/gi);
        if (ticketMatch) {
            const ticketNo = ticketMatch[0].toUpperCase();
            const repairData = await withTimeout(
                prisma.repair.findUnique({ where: { ticketNumber: ticketNo } }),
                2000,
                null
            );
            if (repairData) {
                systemPrompt += `\n\n### 📝 CONTEXTO TICKET ${ticketNo}:
- Equipo: ${repairData.deviceBrand} ${repairData.deviceModel}
- Problema: ${repairData.problemDescription}
- Diagnóstico previo: ${repairData.diagnosis || 'Ninguno'}`;
            }
        }
    } catch (e) {
        console.error("[CEREBRO] Ticket lookup failed");
    }

    // 2. RECUPERACIÓN RAG (Con timeout estricto)
    try {
        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const userText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : "";

        if (userText.length > 5) {
            const similar = await withTimeout(findSimilarRepairs(userText, 3, 0.6), 4000, []);
            if (similar.length > 0) {
                systemPrompt += formatRAGContext(similar);
            }
        }
    } catch (e) {
        console.error("[CEREBRO] RAG failed");
    }

    // 3. PDF PROCESSING
    try {
        const pdfBase64 = messages.flatMap((m: any) => m.parts || [])
            .find((p: any) => p.type === 'file' && (p.mediaType === 'application/pdf' || p.filename?.endsWith('.pdf')))
            ?.url?.split('base64,').pop();

        if (pdfBase64) {
            const pdfData = await withTimeout(pdfParse(Buffer.from(pdfBase64, 'base64')), 5000, null);
            if (pdfData?.text) {
                systemPrompt += `\n\n### 📋 MANUAL/PDF:\n${pdfData.text.substring(0, 10000)}`;
            }
        }
    } catch (e) {
        console.error("[CEREBRO] PDF failed");
    }

    // 4. MODEL CASCADE
    const coreMessages = toCoreMsgs(messages);

    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const attempts = [];

    if (hasImages) {
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini 2.0 Flash', model: google('gemini-2.0-flash') });
        }
    } else {
        if (groqKey) {
            const groq = createGroq({ apiKey: groqKey });
            attempts.push({ label: 'Groq Llama 3.3', model: groq('llama-3.3-70b-versatile') });
        }
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini 2.0 Flash', model: google('gemini-2.0-flash') });
        }
    }

    if (attempts.length === 0) {
        return new Response("No se configuraron modelos de IA (Faltan keys en .env)", { status: 500 });
    }

    for (const attempt of attempts) {
        try {
            console.log(`[CEREBRO] Trying ${attempt.label}...`);
            const result = await streamText({
                model: attempt.model,
                system: systemPrompt,
                messages: coreMessages,
                temperature: 0.1,
                maxTokens: 1000,
            });

            return result.toUIMessageStreamResponse({
                headers: { 'X-Cerebro-Model': attempt.label }
            });
        } catch (err: any) {
            console.error(`[CEREBRO] ${attempt.label} failed:`, err.message);
            // Si no es el último, seguimos con el siguiente
            if (attempt === attempts[attempts.length - 1]) {
                return new Response(`Error de IA: ${err.message}`, { status: 500 });
            }
        }
    }

    return new Response("Todos los modelos fallaron.", { status: 503 });
}
