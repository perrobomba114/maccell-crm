import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText, generateText } from "ai";
import { db as prisma } from "@/lib/db";
import { trackTokens } from "@/lib/cerebro-token-tracker";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import { findSchematic, formatSchematicContext } from "@/lib/cerebro-schematics";
import pdfParse from "pdf-parse";


// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_PDF_CHARS = 8000; // Aumentado para leer manuales completos
const MAX_IMAGES = 4; // Groq max 5, usamos 4 por seguridad

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────────────────────────────────────────
const TEXT_MODELS = [
    { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
    { label: 'Llama 3.1 8B', id: 'llama-3.1-8b-instant' },
];
const VISION_MODEL = { label: 'Llama 4 Scout Vision', id: 'meta-llama/llama-4-scout-17b-16e-instruct' };
const DIAG_EXTRACT_MODEL = 'llama-3.1-8b-instant'; // Fase 2: extractor de estado

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Cerebro", asistente experto de MACCELL para técnicos de microsoldadura NIVEL 3.
Respondés SIEMPRE con datos técnicos NIVEL 3 (componentes específicos, micro-voltajes, protocolos de comunicación I2C/SPI).
PROHIBIDO responder genéricamente. PROHIBIDO mencionar "revisar componentes" sin dar su nombre real (ej. L5001, U500).

### ESTRUCTURA OBLIGATORIA NIVEL 3:
1. **Análisis Diferencial 📊** — Hipótesis basadas en arquitectura real del equipo.

2. **🔍 ESTADO DEL SISTEMA** — ICs y líneas reales. Si hay SCHEMATIC, usá SOLO los nombres del schematic.
   - iPhones: PMIC, Tigris, Hydra, Chestnut (Backlight), Meson, etc.
   - Samsung/Android: PMU, Buck Boosters, KTD2692 (Backlight), SM5713, etc.

3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN DE PRECISIÓN** — Datos numéricos obligatorios:
   - Modo Diodo: "Pin 1 del conector LCD debe dar .450v en caída de tensión".
   - Voltajes: "V_BACKLIGHT_ANODE debe subir a 20V-35V; si da 4V el booster no conmuta".
   - Testpoints del manual: Ubicación exacta (ej: TP_LCD_BACKLIGHT).

4. **🎯 INTERVENCIÓN SUGERIDA** — IC exacto, técnica (Reballing, Jumper, Inyección de tensión).

### REGLA DE ORO DE SCHEMATICS (NIVEL 3):
- SI HAY UN SCHEMATIC ADJUNTO O PRE-INDEXADO: Ignorá tus conocimientos generales de Llama/Groq si contradicen el manual.
- USÁ LOS NOMBRES DEL MANUAL. Si el manual dice "U6000", NO digas "un controlador".
- Si el manual tiene una guía de falla (Troubleshooting Guide), seguí el paso a paso exacto.

### FOTO DE PLACA:
Analizá visualmente en busca de corrosión u oxidaciones en filtros y capacitores del área de backlight. Correlacioná con el manual.`;

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

function extractImages(msg: any): string[] {
    const images: string[] = [];
    if (!msg || !Array.isArray(msg.parts)) return images;
    for (const p of msg.parts) {
        const mt = p.mediaType || p.file?.mediaType || '';
        const url = p.url || p.file?.url || '';
        if (mt.startsWith('image/') && url) images.push(url);
        if (p.type === 'image' && (p.image || p.url)) images.push(p.image || p.url);
    }
    return images.slice(0, MAX_IMAGES);
}

async function buildVisionMessages(messages: any[], images: string[]): Promise<any[]> {
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
    const result: any[] = [];

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
        contentParts.push({ type: 'image', image: imgUrl });
    }

    result.push({ role: 'user', content: contentParts });
    return result;
}

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
            const finalText = truncate(textContent.trim()) + (hadPdf ? ' [schematic PDF adjunto]' : '');
            result.push({ role: m.role, content: finalText || '[mensaje vacío]' });
        }

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
                                const pdf = await extractPdfText(url);
                                if (pdf) pdfTexts.push(pdf);
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
                    const pdfBlock = pdfTexts.map((t, i) => `\n\n📄 [SCHEMATIC/PDF #${i + 1}]:\n${t}`).join('\n');
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
// FASE 1.3 — Clasificador de síntomas previo a RAG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Extrae marca, modelo y síntomas del mensaje del técnico con llama-3.1-8b.
 * Retorna una query enriquecida para el RAG, más precisa que el texto crudo.
 * Ejemplo: "galaxy a52 se queda colgado" → "Samsung A52 reinicio freezing"
 */
async function classifySymptom(
    text: string,
    groq: ReturnType<typeof createGroq>
): Promise<string> {
    if (text.length < 8) return text;
    try {
        const { text: result } = await generateText({
            model: groq(DIAG_EXTRACT_MODEL),
            temperature: 0,
            maxOutputTokens: 80,
            prompt: `Extraé marca, modelo y síntomas técnicos de este texto. Respondé SOLO con JSON, sin markdown:
{"brand":"Samsung","model":"A52","symptoms":["reinicio","no carga"]}
Si no hay info, usá vacíos.

Texto: "${text.slice(0, 200)}"`
        });
        const match = result.match(/\{[\s\S]*\}/);
        if (!match) return text;
        const c = JSON.parse(match[0]);
        const parts = [c.brand, c.model, ...(c.symptoms || [])].filter(Boolean);
        if (parts.length === 0) return text;
        const enriched = parts.join(' ');
        console.log(`[CEREBRO] 🏷️ Síntoma clasificado: "${enriched}"`);
        return enriched;
    } catch {
        return text; // fallback al texto original
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2 — Extractor de estado de diagnóstico
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Analiza el historial de conversación con llama-3.1-8b (rápido) y extrae
 * en JSON qué se midió, qué se descartó y cuál es la sospecha actual.
 * El resultado se inyecta en el system prompt del modelo 70B para que
 * NO repita mediciones ya realizadas por el técnico.
 * Solo se activa desde el 3er turno de la conversación.
 */
async function extractDiagnosticState(
    messages: any[],
    groq: ReturnType<typeof createGroq>
): Promise<string> {
    const turns = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    if (turns.length < 3) return ''; // Sin historial útil todavía

    try {
        const conversationText = turns
            .slice(-6)
            .map(m => {
                let text = '';
                if (typeof m.content === 'string') text = m.content;
                else if (Array.isArray(m.parts)) {
                    text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ');
                }
                return `[${m.role.toUpperCase()}]: ${text.slice(0, 300)}`;
            })
            .join('\n');

        const { text } = await generateText({
            model: groq(DIAG_EXTRACT_MODEL),
            temperature: 0,
            maxOutputTokens: 300,
            prompt: `Eres un asistente técnico de electrónica. Analizá esta conversación y respondé SOLO con un JSON (sin markdown).

CONVERSACIÓN:
${conversationText}

JSON requerido:
{"device":"equipo o vacío","symptoms":["síntoma1"],"checked":["ya medido/verificado"],"ruledOut":["descartado"],"suspected":"componente o vacío"}`
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return '';
        const state = JSON.parse(jsonMatch[0]);

        const hasInfo = (state.checked?.length > 0) || (state.ruledOut?.length > 0) || state.suspected;
        if (!hasInfo) return '';

        const lines: string[] = [];
        if (state.device) lines.push(`Equipo: ${state.device}`);
        if (state.symptoms?.length) lines.push(`Síntomas: ${state.symptoms.join(', ')}`);
        if (state.checked?.length) lines.push(`Ya verificado: ${state.checked.join(' · ')}`);
        if (state.ruledOut?.length) lines.push(`Descartado: ${state.ruledOut.join(', ')}`);
        if (state.suspected) lines.push(`Sospecha actual: ${state.suspected}`);

        console.log('[CEREBRO] 🧪 Estado diagnóstico:', JSON.stringify(state));
        return `\n\n### 🧪 ESTADO DEL DIAGNÓSTICO (NO REPETIR)\n${lines.join('\n')}\n⚠️ NO repitas mediciones ya realizadas. Continuá desde donde quedó el técnico.`;
    } catch (err: any) {
        console.warn('[CEREBRO] ⚠️ extractDiagnosticState falló:', err.message?.slice(0, 80));
        return '';
    }
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
        const guidedMode = body.guidedMode === true; // Fase 5
        if (!messages.length) return new Response("No messages provided", { status: 400 });

        const groq = createGroq({ apiKey: groqKey });

        // ── Detectar imágenes ─────────────────────────────────────────────────
        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;
        console.log(`[CEREBRO] 📸 Imágenes: ${images.length} | Modo: ${hasImages ? 'VISION' : 'TEXT'}`);

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

        // ── Todo en paralelo: classify + RAG directo + schematic + diagnóstico ─
        let finalSystemPrompt = SYSTEM_PROMPT;

        const [classifyResult, ragDirectResult, schemResult, diagResult] = await Promise.allSettled([
            // Fase 1.3: clasificar síntoma (corre en paralelo, no bloquea)
            lastUserText.length > 8
                ? withTimeout(classifySymptom(lastUserText, groq), 2500, lastUserText)
                : Promise.resolve(lastUserText),
            // RAG directo con el texto original (sin esperar classify)
            lastUserText.length > 3
                ? withTimeout(findSimilarRepairs(lastUserText, 3, 0.6), 4000, [])
                : Promise.resolve([]),
            // Fase 4: schematic auto-lookup
            withTimeout(findSchematic(lastUserText), 3000, null),
            // Fase 2: estado del diagnóstico (solo desde turno 3+)
            withTimeout(extractDiagnosticState(messages, groq), 5000, '')
        ]);

        let similar = ragDirectResult.status === 'fulfilled' ? ragDirectResult.value : [];
        const classifiedQuery = classifyResult.status === 'fulfilled' ? classifyResult.value : lastUserText;

        // Si RAG directo no encontró nada Y classify generó una query mejor → 2do intento
        if (similar.length === 0 && classifiedQuery !== lastUserText && classifiedQuery.length > 3) {
            const ragFallback = await withTimeout(findSimilarRepairs(classifiedQuery, 3, 0.6), 3000, []);
            if (ragFallback.length > 0) {
                similar = ragFallback;
                console.log(`[CEREBRO] 🏷️ RAG mejorado por classify: ${similar.length} casos`);
            }
        }

        if (similar.length > 0) {
            finalSystemPrompt += formatRAGContext(similar);
            console.log(`[CEREBRO] 🧠 RAG: ${similar.length} casos`);
        }

        const diagBlock = diagResult.status === 'fulfilled' ? diagResult.value : '';
        if (diagBlock) finalSystemPrompt += diagBlock;

        const schematic = schemResult.status === 'fulfilled' ? schemResult.value : null;
        if (schematic) {
            finalSystemPrompt += formatSchematicContext(schematic);
            console.log(`[CEREBRO] 📋 Schematic auto-inyectado: ${schematic.brand} ${schematic.model}`);
        }

        // Fase 5: Modo Diagnóstico Guiado
        if (guidedMode) {
            finalSystemPrompt += `

### 🔬 MODO DIAGNÓSTICO GUIADO ACTIVO
REGLA CRÍTICA: Hacé UNA SOLA pregunta específica por turno.
NO des el diagnóstico completo junto. Esperá la respuesta del técnico antes de continuar.
Ejemplo correcto:
  Turno 1: "Conectá alimentación externa. ¿Cuánto mA drena?"
  Turno 2: (técnico responde 350mA) → "Corto confirmado. Medí con cámara térmica la zona del PMIC. ¿Encontrás algo caliente?"
Seguí este flujo hasta identificar el componente exacto.`;
            console.log('[CEREBRO] 🔬 Modo Guiado activo');
        }

        // ── Ticket lookup ─────────────────────────────────────────────────────
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

        const onFinishCb = ({ usage }: any) => {
            if (usage?.totalTokens) {
                trackTokens(usage.totalTokens);
                console.log(`[CEREBRO] 🪙 Tokens: ${usage.totalTokens} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);
            }
        };

        // ── MODO VISIÓN ───────────────────────────────────────────────────────
        if (hasImages) {
            console.log(`[CEREBRO] 🔭 ${VISION_MODEL.label}`);
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
                console.warn(`[CEREBRO] ⚠️ Vision falló: ${visionErr.message} — fallback texto`);
            }
        }

        // ── MODO TEXTO — cascada 70B → 8B ────────────────────────────────────
        const coreMessages = await toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes: ${coreMessages.length}`);

        for (const m of TEXT_MODELS) {
            try {
                console.log(`[CEREBRO] 🤖 ${m.label}...`);
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
