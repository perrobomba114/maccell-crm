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
const MAX_HISTORY_MSGS = 2; // Reducido drásticamente para ahorrar tokens en Tier 1
const MAX_MSG_CHARS = 800;
const MAX_OUTPUT_TOKENS = 800;
const MAX_PDF_CHARS = 8000; // Ajustado a 8k para garantizar compatibilidad con Tier 1 (TPM 6k) en cascada 8B
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
// SYSTEM PROMPTS (MODO DUAL)
// ─────────────────────────────────────────────────────────────────────────────

const MENTOR_PROMPT = `Actuá como un Mentor Maestro de MACCELL. Tu objetivo es que el técnico aprenda a diagnosticar. 

### 📜 REGLAS DE ORO DEL MENTOR:
1. **PROHIBIDO DAR EL DIAGNÓSTICO COMPLETO:** No des soluciones ni porcentajes de entrada. Solo analizá el síntoma y pedí UNA (1) medición.
2. **PEDÍ VALORES CON REFERENCIA:** Cuando pidas medir algo, decí qué valor debe encontrar: "Medí caída de tensión en el Pin X; el valor normal es .450v". 
3. **TONO EDUCATIVO:** Si pedís medir una bobina, explicá brevemente qué función cumple (ej: "L5001 es la bobina de switching del booster").
4. **NO SUGERIR REBALLING:** Salvo que todas las mediciones periféricas (diodos, capacitores, voltajes) den mal.
5. **PRECISIÓN TÉCNICA:** Usá los nombres del manual (L500, U500).

### 🛠️ ESTRUCTURA DE RESPUESTA MENTOR:
- **Análisis Breve:** "Este síntoma suele estar en la línea de Ánodo o en el driver de backlight..."
- **La Medición del Momento:** Pedí UNA sola prueba puntual y esperá respuesta.
- **Valor de Referencia:** Decile qué número esperar.`;

const STANDARD_PROMPT = `Actuá como un Asistente Técnico Experto de MACCELL. 
Tu misión es dar un informe de diagnóstico directo y resolutivo.

### ESTRUCTURA OBLIGATORIA:
1. **Análisis Diferencial 📊** — Hipótesis con % estimado.
2. **🔍 ESTADO DEL SISTEMA** — ICs y líneas involucradas.
3. **🕵️‍♂️ PROTOCOLO DE MEDICIÓN** — Lista de todas las pruebas a realizar con sus valores.
4. **🎯 INTERVENCIÓN SUGERIDA** — IC a cambiar o técnica a aplicar.

### REGLA DE ORO:
- Priorizá siempre las "Soluciones Verificadas" del taller.`;

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
            if (Array.isArray(m.parts)) {
                for (const p of m.parts) {
                    if (p.type === 'text' && p.text) textContent += p.text + ' ';
                    if (p.type === 'file') {
                        const mt = p.mediaType || p.file?.mediaType || '';
                        const url = p.url || p.file?.url || '';
                        if (mt === 'application/pdf' && url) {
                            const pdf = await extractPdfText(url);
                            if (pdf) textContent += `\n\n📄 [PDF ADJUNTO EN HISTORIAL]:\n${pdf}\n`;
                        }
                    }
                }
            }
            if (typeof m.content === 'string' && m.content.trim()) textContent = m.content;
            if (Array.isArray(m.content)) {
                textContent = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
            }
            const finalText = truncate(textContent.trim());
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
                    // Solo tomamos texto, ignoramos PDF pesado para no saturar tokens en esta fase
                    text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join(' ');
                }
                // Limpiamos menciones de PDF previo para que el extractor no se confunda
                text = text.replace(/📄 \[PDF ADJUNTO[\s\S]*?\n/g, '');
                return `[${m.role.toUpperCase()}]: ${text.slice(0, 500)}`;
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

// Helper para tareas auxiliares (classify, extract) que prueba todas las llaves
async function runAuxTask<T>(
    keys: string[],
    task: (groq: ReturnType<typeof createGroq>) => Promise<T>,
    fallback: T
): Promise<T> {
    for (const key of keys) {
        try {
            const groq = createGroq({ apiKey: key });
            return await task(groq);
        } catch (err: any) {
            console.warn(`[CEREBRO] Tarea auxiliar falló con llave ${key.slice(-4)}: ${err.message}`);
        }
    }
    return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
function createFallbackModel(
    models: { instance: any; label: string; keyId: string }[],
    successCallback: (info: { label: string; keyId: string }) => void
): any {
    return {
        specificationVersion: "v3",
        provider: "cerebro-fallback",
        modelId: "cerebro-fallback",
        defaultObjectGenerationMode: models[0]?.instance.defaultObjectGenerationMode,
        defaultTextGenerationMode: models[0]?.instance.defaultTextGenerationMode, // just in case
        async doGenerate(options: any) {
            let lastError: any;
            for (const { instance, label, keyId } of models) {
                try {
                    const result = await instance.doGenerate(options);
                    successCallback({ label, keyId });
                    return result;
                } catch (err: any) {
                    lastError = err;
                    console.warn(`[CEREBRO] ⚠️ Fallback en doGenerate (${label}):`, err?.message?.slice(0, 150) || err);
                }
            }
            throw lastError;
        },
        async doStream(options: any) {
            let lastError: any;
            for (const [i, { instance, label, keyId }] of models.entries()) {
                try {
                    const result = await instance.doStream(options);
                    console.log(`[CEREBRO] ✅ Provider aceptado en intento ${i + 1} (${label})`);
                    successCallback({ label, keyId });
                    return result;
                } catch (err: any) {
                    lastError = err;
                    console.warn(`[CEREBRO] ⚠️ Provider rechazado en intento ${i + 1} (${label} ${keyId}):`, err?.message?.slice(0, 150) || err);
                }
            }
            console.error(`[CEREBRO] ❌ Todos los providers fallaron.`);
            throw lastError;
        }
    };
}

export async function POST(req: NextRequest) {
    console.log("[CEREBRO] 🚀 Petición iniciada");

    try {
        const keys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3
        ].filter((k): k is string => !!k && k.length > 10);

        if (keys.length === 0) {
            return new Response("Error: No hay llaves de API de Groq configuradas.", { status: 500 });
        }

        const body = await req.json();
        const messages = body.messages || [];
        const guidedMode = body.guidedMode === true;
        if (!messages.length) return new Response("No messages provided", { status: 400 });

        // No creamos un groqAux fijo, usaremos runAuxTask

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

        // ── Selección de Prompt Base (Modo Dual) ──────────────────────────────
        // Prioridad: 1. Palabra clave en el mensaje, 2. Flag del body, 3. Standard por defecto
        let activeBasePrompt = STANDARD_PROMPT;
        const msgLower = lastUserText.toLowerCase();

        if (msgLower.includes('modo guiado') || msgLower.includes('con modo guiado') || guidedMode) {
            activeBasePrompt = MENTOR_PROMPT;
        } else if (msgLower.includes('sin modo guiado') || msgLower.includes('modo estandar')) {
            activeBasePrompt = STANDARD_PROMPT;
        }

        let finalSystemPrompt = activeBasePrompt;

        const [classifyResult, ragDirectResult, schemResult, diagResult] = await Promise.allSettled([
            // Fase 1.3: clasificar síntoma
            lastUserText.length > 8
                ? withTimeout(runAuxTask(keys, (g: ReturnType<typeof createGroq>) => classifySymptom(lastUserText.slice(0, 3000), g), lastUserText), 2500, lastUserText)
                : Promise.resolve(lastUserText),
            // RAG directo
            lastUserText.length > 3
                ? withTimeout(findSimilarRepairs(lastUserText, 1, 0.6), 4000, [])
                : Promise.resolve([]),
            // Fase 4: schematic auto-lookup
            withTimeout(findSchematic(lastUserText), 3000, null),
            // Fase 2: estado del diagnóstico
            withTimeout(runAuxTask(keys, (g: ReturnType<typeof createGroq>) => extractDiagnosticState(messages, g), ''), 5000, ''),
        ]);

        let similar = ragDirectResult.status === 'fulfilled' ? ragDirectResult.value : [];
        const classifiedQuery = classifyResult.status === 'fulfilled' ? classifyResult.value : lastUserText;

        // Si RAG directo no encontró nada Y classify generó una query mejor → 2do intento
        if (similar.length === 0 && classifiedQuery !== lastUserText && classifiedQuery.length > 3) {
            const ragFallback = await withTimeout(findSimilarRepairs(classifiedQuery, 1, 0.6), 3000, []);
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
        if (activeBasePrompt === MENTOR_PROMPT) {
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
            console.log(`[CEREBRO] 🔭 Iniciando modo Visión...`);
            const visionModels = keys.map(key => ({
                instance: createGroq({ apiKey: key })(VISION_MODEL.id),
                label: VISION_MODEL.label,
                keyId: key.slice(-4)
            }));

            let usedLabel = VISION_MODEL.label;
            let usedKey = '';

            const cerebroVisionModel = createFallbackModel(visionModels, (info) => {
                usedLabel = info.label;
                usedKey = info.keyId;
            });

            try {
                const visionMessages = await buildVisionMessages(messages, images);
                const result = await streamText({
                    model: cerebroVisionModel as any,
                    system: finalSystemPrompt,
                    messages: visionMessages,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                    onFinish: onFinishCb,
                    maxRetries: 0,
                });
                return result.toUIMessageStreamResponse({
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'X-Cerebro-Provider': usedLabel,
                        'X-Cerebro-Key': usedKey
                    }
                });
            } catch (visionErr: any) {
                console.warn(`[CEREBRO] ⚠️ Vision mode fallback cascade failed:`, visionErr.message);
            }
        }

        // ── MODO TEXTO — cascada 70B → 8B ────────────────────────────────────
        const coreMessages = await toCoreMsgs(messages);
        console.log(`[CEREBRO] 📨 Mensajes: ${coreMessages.length} | Prompt length: ${finalSystemPrompt.length}`);

        const textModelsConfig = [];
        for (const m of TEXT_MODELS) {
            for (const key of keys) {
                textModelsConfig.push({
                    instance: createGroq({ apiKey: key })(m.id),
                    label: m.label,
                    keyId: key.slice(-4)
                });
            }
        }

        let usedLabel = 'Unknown';
        let usedKey = '';

        const cerebroTextModel = createFallbackModel(textModelsConfig, (info) => {
            usedLabel = info.label;
            usedKey = info.keyId;
        });

        try {
            const result = await streamText({
                model: cerebroTextModel as any,
                system: finalSystemPrompt,
                messages: coreMessages,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                temperature: 0.2,
                onFinish: onFinishCb,
                maxRetries: 0,
            });
            return result.toUIMessageStreamResponse({
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'X-Cerebro-Provider': usedLabel,
                    'X-Cerebro-Key': usedKey
                }
            });
        } catch (err: any) {
            console.warn(`[CEREBRO] ⚠️ Text mode fallback cascade failed:`, err.message);
        }

        return new Response("Todos los modelos Groq fallaron.", { status: 503 });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(`Cerebro Offline: ${error.message}`, { status: 500 });
    }
}
