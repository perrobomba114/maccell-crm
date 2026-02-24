import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { db as prisma } from "@/lib/db";
import { trackTokens } from "@/lib/cerebro-token-tracker";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import pdfParse from "pdf-parse";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_PDF_CHARS = 4000; // Controlado para no explotar tokens de Groq

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Cerebro", el asistente experto de microsoldadura Nivel 3 de MACCELL.
Respondés SIEMPRE como técnico avanzado: voltajes, componentes específicos, puntos de medición concretos.
PROHIBIDO responder de forma genérica. PROHIBIDO mencionar precios.

### ESTRUCTURA OBLIGATORIA:
1. **Análisis Diferencial 📊** — hipótesis ordenadas por probabilidad
2. **🔍 ESTADO DEL SISTEMA** — qué componentes están bajo sospecha y por qué
3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN** — puntos exactos donde medir (voltaje, resistencia, continuidad)
4. **🎯 INTERVENCIÓN SUGERIDA** — qué reemplazar o reparar y en qué orden

### REGLA PARA SCHEMATICS:
Si el técnico adjunta un schematic o PDF, NO lo describas en general.
Usalo ÚNICAMENTE para responder el síntoma específico que preguntó.
Identificá los componentes relacionados con ese síntoma en el schematic y dá puntos de medición reales.`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
function truncate(text: string, max = MAX_MSG_CHARS): string {
    if (!text) return "";
    return text.length <= max ? text : text.slice(0, max) + '...';
}

/**
 * Extrae texto de un PDF enviado como data URL base64.
 * Retorna null si falla.
 */
async function extractPdfText(dataUrl: string): Promise<string | null> {
    try {
        const base64 = dataUrl.split(',')[1];
        if (!base64) return null;
        const buffer = Buffer.from(base64, 'base64');
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim();
        if (!text) return null;
        return text.length > MAX_PDF_CHARS
            ? text.slice(0, MAX_PDF_CHARS) + '\n[...schematic truncado...]'
            : text;
    } catch (err: any) {
        console.warn('[CEREBRO] ⚠️ Error parseando PDF:', err.message);
        return null;
    }
}

/**
 * Convierte mensajes del frontend (AI SDK v6) a CoreMessages para Groq.
 *
 * REGLA CRÍTICA PARA TOKENS:
 * - Si un mensaje tiene PDF adjunto → extrae el texto UNA SOLA VEZ
 * - En el historial (mensajes anteriores) → reemplaza PDFs por placeholder corto
 *   Esto evita que el historial multiplique los tokens en cada turn.
 */
async function toCoreMsgs(messages: any[]): Promise<any[]> {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);

        const result: any[] = [];

        // ── Historial: solo texto, PDFs → placeholder ─────────────────────
        for (const m of history) {
            if (m.role !== 'user' && m.role !== 'assistant') continue;

            let textContent = '';
            let hadPdf = false;

            if (Array.isArray(m.parts)) {
                for (const p of m.parts) {
                    if (p.type === 'text' && p.text) textContent += p.text + ' ';
                    if (p.type === 'file') {
                        const mt = p.mediaType || p.file?.mediaType || '';
                        if (mt === 'application/pdf') hadPdf = true;
                    }
                }
            }
            if (typeof m.content === 'string' && m.content.trim()) textContent = m.content;
            if (Array.isArray(m.content)) {
                textContent = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
            }

            // PDF en historial → placeholder (no re-enviar 4000 chars en cada turn)
            const finalText = truncate(textContent.trim()) +
                (hadPdf ? ' [schematic PDF adjunto en este mensaje]' : '');

            result.push({ role: m.role, content: finalText || '[mensaje vacío]' });
        }

        // ── Último mensaje: extrae PDFs completamente ─────────────────────
        {
            const m = lastMsg;
            if (m.role === 'user' || m.role === 'assistant') {
                let textContent = '';
                const pdfTexts: string[] = [];

                if (Array.isArray(m.parts)) {
                    for (const p of m.parts) {
                        if (p.type === 'text' && p.text) textContent += p.text + ' ';
                        if (p.type === 'file') {
                            const mt = p.mediaType || p.file?.mediaType || '';
                            const url = p.url || p.file?.url || '';
                            if (mt === 'application/pdf' && url) {
                                console.log('[CEREBRO] 📄 PDF detectado en mensaje actual, extrayendo...');
                                const pdf = await extractPdfText(url);
                                if (pdf) {
                                    pdfTexts.push(pdf);
                                    console.log(`[CEREBRO] ✅ PDF extraído: ${pdf.length} chars`);
                                }
                            }
                        }
                    }
                }
                if (typeof m.content === 'string' && m.content.trim()) textContent = m.content;
                if (Array.isArray(m.content)) {
                    textContent = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
                }

                textContent = truncate(textContent.trim());

                if (pdfTexts.length > 0) {
                    const pdfBlock = pdfTexts
                        .map((t, i) => `\n\n📄 [SCHEMATIC/PDF #${i + 1} — úsalo SOLO para responder el síntoma específico]:\n${t}`)
                        .join('\n');
                    textContent = textContent + pdfBlock;
                }

                result.push({ role: m.role, content: textContent || '[mensaje vacío]' });
            }
        }

        return result;
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

        // ── Procesar mensajes ────────────────────────────────────────────────
        const coreMessages = await toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes: ${coreMessages.length}`);

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
                    onFinish: ({ usage }) => {
                        if (usage?.totalTokens) {
                            trackTokens(usage.totalTokens);
                            console.log(`[CEREBRO] 🪙 Tokens usados: ${usage.totalTokens} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);
                        }
                    },
                });

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
