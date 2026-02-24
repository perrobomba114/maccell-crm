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
const MAX_PDF_CHARS = 4000;
// Llama 4 Scout: max 5 imágenes por request, base64 < 4MB por solicitud
const MAX_IMAGES = 4;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────────────────────────────────────────
/** Para análisis de texto + RAG (sin imágenes) */
const TEXT_MODELS = [
    { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
    { label: 'Llama 3.1 8B', id: 'llama-3.1-8b-instant' },
];

/** Para análisis de imágenes de placa / componentes */
const VISION_MODEL = { label: 'Llama 4 Scout Vision', id: 'meta-llama/llama-4-scout-17b-16e-instruct' };

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Cerebro", asistente experto de MACCELL para técnicos de microsoldadura Nivel 3.
Respondés SIEMPRE con datos técnicos ESPECÍFICOS. PROHIBIDO responder genéricamente. PROHIBIDO mencionar precios.

### ESTRUCTURA OBLIGATORIA:
1. **Análisis Diferencial 📊** — hipótesis ordenadas por probabilidad con % estimado

2. **🔍 ESTADO DEL SISTEMA** — ICs y líneas bajo sospecha con nombres reales:
   - iPhone: U_PMU (PMIC), Tristar/Hydra (U2), NAND, Baseband PMU, Tigris, Ciano
   - Samsung/Android: PMIC, SM5713 (cargador), MAX77729 (fuel gauge), S2MPS, etc.
   - Líneas de voltaje: PP_VCC_MAIN, VBAT, PP1V8_SDRAM, PP3V0, PP5V0_USB, etc.

3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN** — OBLIGATORIO ser específico:
   - Resistencia a tierra en modo diodo: ej. "VBAT debe tener >180Ω; si <10Ω hay corto en PMIC"
   - Voltajes esperados en puntos clave: ej. "PP_VCC_MAIN debe medir 3.8V en bobina L10"
   - Continuidad entre pads específicos si aplica
   - Temperatura en placa con cámara térmica si hay corto activo

4. **🎯 INTERVENCIÓN SUGERIDA** — IC a reemplazar, técnica (reballing, hot air, jumper wire, ultrasónico), orden de intervención

### REGLA PARA IMÁGENES DE PLACA:
Si el técnico adjunta una foto de placa, analizá VISUALMENTE:
- Componentes dañados (capacitores rotos, ICs con quemaduras, soldadura fría)
- Zonas de daño por agua (corrosión, residuos blancos)
- Componentes faltantes (pads vacíos donde debería haber un componente)
- Orientación y ubicación respecto a zonas conocidas de la placa
Luego correlacioná lo que ves con el síntoma relatado.

### REGLA PARA SCHEMATICS:
Si el técnico adjunta un PDF schematic, NO describas el schematic en general.
Usalo EXCLUSIVAMENTE para el síntoma preguntado: nombrá los componentes reales, sus valores y los testpoints del schematic.`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
function truncate(text: string, max = MAX_MSG_CHARS): string {
    if (!text) return "";
    return text.length <= max ? text : text.slice(0, max) + '...';
}

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
 * Detecta si el último mensaje del usuario contiene imágenes.
 * Retorna la lista de data-URLs de las imágenes encontradas.
 */
function extractImages(msg: any): string[] {
    const images: string[] = [];
    if (!msg || !Array.isArray(msg.parts)) return images;

    for (const p of msg.parts) {
        // Soporte para tipo 'file' con mediaType de imagen
        const mt = p.mediaType || p.file?.mediaType || '';
        const url = p.url || p.file?.url || '';

        if (mt.startsWith('image/') && url) {
            images.push(url);
        }

        // También soporte tipo 'image' directo (varía según versión AI SDK)
        if (p.type === 'image' && (p.image || p.url)) {
            images.push(p.image || p.url);
        }
    }

    return images.slice(0, MAX_IMAGES); // Groq permite máx 5, nosotros limitamos a 4 por seguridad
}

/**
 * Construye mensajes para el modelo de VISIÓN.
 * El último mensaje lleva texto + image_url parts.
 * El historial anterior va solo como texto (para no exceder tokens).
 */
async function buildVisionMessages(messages: any[], images: string[]): Promise<any[]> {
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);

    const result: any[] = [];

    // Historial → solo texto
    for (const m of history) {
        if (m.role !== 'user' && m.role !== 'assistant') continue;
        let text = '';
        if (Array.isArray(m.parts)) {
            text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ');
        } else if (typeof m.content === 'string') {
            text = m.content;
        }
        result.push({ role: m.role, content: truncate(text.trim()) || '[mensaje vacío]' });
    }

    // Último mensaje → texto + imágenes en content array (formato Groq vision)
    let userText = '';
    if (Array.isArray(lastMsg.parts)) {
        userText = lastMsg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ');
    } else if (typeof lastMsg.content === 'string') {
        userText = lastMsg.content;
    }

    const contentParts: any[] = [
        { type: 'text', text: truncate(userText.trim()) || '¿Podés analizar esta imagen de placa?' }
    ];

    for (const imgUrl of images) {
        contentParts.push({
            type: 'image',
            image: imgUrl, // AI SDK acepta data URL directamente
        });
    }

    result.push({ role: 'user', content: contentParts });
    return result;
}

/**
 * Convierte mensajes a CoreMessages para el modelo de texto (sin visión).
 */
async function toCoreMsgs(messages: any[]): Promise<any[]> {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);

        const result: any[] = [];

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

            const finalText = truncate(textContent.trim()) +
                (hadPdf ? ' [schematic PDF adjunto en este mensaje]' : '');

            result.push({ role: m.role, content: finalText || '[mensaje vacío]' });
        }

        // Último mensaje: extrae PDFs
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
                                console.log('[CEREBRO] 📄 PDF detectado, extrayendo...');
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
            return new Response("Error: GROQ_API_KEY no configurada.", { status: 500 });
        }

        const body = await req.json();
        const messages = body.messages || [];
        if (!messages.length) return new Response("No messages provided", { status: 400 });

        const groq = createGroq({ apiKey: groqKey });

        // ── Detectar si hay imágenes en el último mensaje ────────────────────
        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;

        console.log(`[CEREBRO] 📸 Imágenes detectadas: ${images.length} | Modo: ${hasImages ? 'VISION' : 'TEXT'}`);

        // ── Extraer texto del usuario para RAG ───────────────────────────────
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

        // ── Enriquecimiento RAG ──────────────────────────────────────────────
        let finalSystemPrompt = SYSTEM_PROMPT;

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

        const onFinishCb = ({ usage }: any) => {
            if (usage?.totalTokens) {
                trackTokens(usage.totalTokens);
                console.log(`[CEREBRO] 🪙 Tokens: ${usage.totalTokens} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);
            }
        };

        // ══════════════════════════════════════════════════════════════════════
        // MODO VISIÓN — Llama 4 Scout con imágenes
        // ══════════════════════════════════════════════════════════════════════
        if (hasImages) {
            console.log(`[CEREBRO] 🔭 Usando ${VISION_MODEL.label} para análisis visual`);
            try {
                const visionMessages = await buildVisionMessages(messages, images);
                const result = await streamText({
                    model: groq(VISION_MODEL.id),
                    system: finalSystemPrompt,
                    messages: visionMessages,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                    onFinish: onFinishCb,
                });

                return result.toUIMessageStreamResponse({
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'X-Cerebro-Provider': VISION_MODEL.label,
                    }
                });
            } catch (visionErr: any) {
                console.warn(`[CEREBRO] ⚠️ Vision model falló: ${visionErr.message} — fallback a texto`);
                // Si falla visión, continúa con el modo texto normal (imágenes ignoradas)
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // MODO TEXTO — cascada Llama 3.3 70B → Llama 3.1 8B
        // ══════════════════════════════════════════════════════════════════════
        const coreMessages = await toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes procesados: ${coreMessages.length}`);

        for (const m of TEXT_MODELS) {
            try {
                console.log(`[CEREBRO] 🤖 Intentando con ${m.label}...`);
                const result = await streamText({
                    model: groq(m.id),
                    system: finalSystemPrompt,
                    messages: coreMessages,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                    onFinish: onFinishCb,
                });

                return result.toUIMessageStreamResponse({
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'X-Cerebro-Provider': m.label,
                    }
                });
            } catch (err: any) {
                console.warn(`[CEREBRO] ⚠️ ${m.label} falló: ${err.message}`);
                if (m === TEXT_MODELS[TEXT_MODELS.length - 1]) throw err;
            }
        }

        return new Response("Todos los modelos Groq fallaron.", { status: 503 });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(`Cerebro Offline: ${error.message}`, { status: 500 });
    }
}
