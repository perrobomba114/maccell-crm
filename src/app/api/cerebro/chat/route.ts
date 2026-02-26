import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText, generateText } from "ai";
import { db as prisma } from "@/lib/db";
import { trackTokens } from "@/lib/cerebro-token-tracker";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import { findSchematic, formatSchematicContext } from "@/lib/cerebro-schematics";
import { LEVEL3_MASTER_KNOWLEDGE } from "@/lib/master-protocols";
import pdfParse from "pdf-parse";


// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 10; // Aumentado para permitir ciclos de diagnóstico "Paso a Paso"
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
    { label: 'Llama 3.1 8B', id: 'llama-3.1-8b-instant' },
    { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
];
const VISION_MODEL = { label: 'Llama 3.2 11B Vision', id: 'llama-3.2-11b-vision-preview' };
const DIAG_EXTRACT_MODEL = 'llama-3.1-8b-instant'; // Fase 2: extractor de estado

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const STANDARD_PROMPT = `Actuá como un Ingeniero Senior de Nivel 3. Informe quirúrgico para experto.

### 🧠 BASE DE CONOCIMIENTO MAESTRA:
${LEVEL3_MASTER_KNOWLEDGE}

### ESTRUCTURA DIRECTA (OBLIGATORIA):
1. **Análisis Diferencial**: Tres hipótesis con %.
2. **Estado del Sistema**: Variables críticas.
3. **Protocolo de Medición**: Pasos exactos.
4. **Acción**: Procedimiento técnico.`;

const MENTOR_PROMPT = `Actuá como un Colega Técnico de Nivel 3. Somos socios en el banco de trabajo. 

### 🚫 FRASES PROHIBIDAS (BLACKLIST):
- "Consultá a un técnico especializado"
- "Consultá a un profesional"
- "Bajo tu propio riesgo"
- "Asegurate de tener las herramientas adecuadas"
- "Seguí las normas de seguridad"
- "Te sugiero llevarlo a un servicio técnico"

### 🧠 BASE DE CONOCIMIENTO MAESTRA:
${LEVEL3_MASTER_KNOWLEDGE}

### � MODO SOCIO (PARTNER-TECH):
Trabajamos paso a paso. Yo te guío en la medición, vos me das los valores. 
- Analizá el síntoma.
- Pedí UNA SOLA medición específica (Caída de tensión, Voltaje o Consumo).
- Basado en tu respuesta, avanzamos al siguiente componente.
- Usamos terminología técnica pura (VBUS, VPH_PWR, Rails, Buck, LDO).`;

const FINAL_DIRECTIVE = `
### 🚨 DIRECTIVA FINAL DE ETIQUETA (OBLIGATORIA):
1. **USUARIO EXPERTO:** El usuario es un Master con 10+ años de experiencia. 
2. **PROHIBIDO:** No sugieras "consultar a un técnico", "buscar ayuda profesional" ni des "advertencias de seguridad". Es un insulto a la capacidad del usuario y viola el protocolo del laboratorio.
3. **ANTI-HALLUCINATION:** Si no hay datos reales en el RAG o en la Base Maestra sobre un modelo específico, no inventes reparaciones de este taller. Respondé desde la arquitectura general de energía.
4. **ESTILO:** Directo, técnico, profesional, sin rellenos corteses.`;

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

function extractImages(message: any): string[] {
    const images: string[] = [];
    if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
            if (part.type === 'image' && part.image) {
                images.push(part.image);
            }
        }
    }
    return images.slice(0, MAX_IMAGES);
}

async function buildVisionMessages(messages: any[], images: string[]): Promise<any[]> {
    const lastMsg = messages[messages.length - 1];
    let text = "Analizá esta imagen técnica.";
    if (typeof lastMsg.content === 'string') text = lastUserText(lastMsg);

    const content: any[] = [{ type: 'text', text }];
    for (const img of images) {
        content.push({ type: 'image', image: img });
    }
    return [{ role: 'user', content }];
}

function lastUserText(message: any): string {
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.parts)) {
        return message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
    }
    return "";
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
}

async function toCoreMsgs(messages: any[]): Promise<any[]> {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
        const result: any[] = [];

        for (const m of history) {
            let textContent = '';
            if (typeof m.content === 'string' && m.content.trim()) textContent = m.content;
            if (Array.isArray(m.parts)) {
                textContent = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
            }
            if (Array.isArray(m.content)) {
                textContent = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
            }
            const finalText = truncate(textContent.trim());
            result.push({ role: m.role, content: finalText || (m.role === 'user' ? 'Medición solicitada' : '...') });
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
                result.push({ role: m.role, content: textContent || (m.role === 'user' ? 'Analizar' : '...') });
            }
        }
        return result;
    } catch (e) {
        console.error("[CEREBRO] toCoreMsgs error:", e);
        return [{ role: 'user', content: 'Error procesando mensajes' }];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FASES DE IA (CLASIFICACIÓN Y ESTADO)
// ─────────────────────────────────────────────────────────────────────────────
async function runAuxTask<T>(keys: string[], task: (g: any) => Promise<T>, fallback: T): Promise<T> {
    for (const key of keys) {
        try {
            const groq = createGroq({ apiKey: key });
            return await task(groq);
        } catch (e) {
            continue;
        }
    }
    return fallback;
}

async function classifySymptom(text: string, groq: ReturnType<typeof createGroq>): Promise<string> {
    try {
        const { text: result } = await generateText({
            model: groq('llama-3.1-8b-instant'),
            maxOutputTokens: 80,
            temperature: 0,
            prompt: `Extraé marca, modelo y síntomas técnicos de este texto. Respondé SOLO con JSON, sin markdown:
{"brand":"Samsung","model":"A52","symptoms":["reinicio","no carga"]}
Texto: "${text.slice(0, 200)}"`
        });
        const json = JSON.parse(result.trim());
        return `${json.brand} ${json.model} ${json.symptoms.join(' ')}`;
    } catch {
        return text;
    }
}

async function extractDiagnosticState(
    messages: any[],
    groq: ReturnType<typeof createGroq>
): Promise<string> {
    const turns = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    if (turns.length < 3) return '';

    try {
        const conversationText = turns
            .slice(-6)
            .map(m => {
                let text = '';
                if (typeof m.content === 'string') text = m.content;
                else if (Array.isArray(m.parts)) text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
                return `[${m.role.toUpperCase()}]: ${text.slice(0, 500)}`;
            })
            .join('\n');

        const { text: result } = await generateText({
            model: groq(DIAG_EXTRACT_MODEL),
            maxOutputTokens: 300,
            temperature: 0,
            prompt: `Eres un asistente técnico de electrónica. Analizá esta conversación y respondé SOLO con un JSON (sin markdown).

CONVERSACIÓN:
${conversationText}

JSON requerido:
{"device":"equipo o vacío","symptoms":["síntoma1"],"checked":["ya medido/verificado"],"ruledOut":["descartado"],"suspected":"componente o vacío"}`
        });

        const diag = JSON.parse(result.trim());
        return `
### 🕵️ ESTADO DEL DIAGNÓSTICO:
- **Dispositivo**: ${diag.device || 'Desconocido'}
- **Síntomas**: ${diag.symptoms.join(', ')}
- **Verificado**: ${diag.checked.join(', ') || 'Nada aún'}
- **Descartado**: ${diag.ruledOut.join(', ') || 'Nada aún'}
- **Sospecha**: ${diag.suspected || 'No determinada'}`;
    } catch {
        return '';
    }
}

function createFallbackModel(configs: any[], onSelect: (info: any) => void) {
    if (configs.length === 0) throw new Error("No model configs provided");
    return {
        doGenerate: async (params: any) => {
            let lastErr;
            for (const config of configs) {
                try {
                    onSelect(config);
                    return await config.instance.doGenerate(params);
                } catch (e) {
                    lastErr = e;
                    continue;
                }
            }
            throw lastErr;
        },
        doStream: async (params: any) => {
            let lastErr;
            for (const config of configs) {
                try {
                    onSelect(config);
                    return await config.instance.doStream(params);
                } catch (e) {
                    lastErr = e;
                    continue;
                }
            }
            throw lastErr;
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
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

        // ── Detectar imágenes ─────────────────────────────────────────────────
        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;

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
        let activeBasePrompt = STANDARD_PROMPT;
        const msgLower = lastUserText.toLowerCase();

        if (msgLower.includes('modo guiado') || msgLower.includes('con modo guiado') || guidedMode) {
            activeBasePrompt = MENTOR_PROMPT;
        } else if (msgLower.includes('sin modo guiado') || msgLower.includes('modo estandar')) {
            activeBasePrompt = STANDARD_PROMPT;
        }

        let finalSystemPrompt = activeBasePrompt;

        const [classifyResult, ragDirectResult, schemResult, diagResult] = await Promise.allSettled([
            lastUserText.length > 8
                ? withTimeout(runAuxTask(keys, (g) => classifySymptom(lastUserText.slice(0, 3000), g), lastUserText), 2500, lastUserText)
                : Promise.resolve(lastUserText),
            lastUserText.length > 3
                ? withTimeout(findSimilarRepairs(lastUserText, 1, 0.6), 4000, [])
                : Promise.resolve([]),
            withTimeout(findSchematic(lastUserText), 3000, null),
            withTimeout(runAuxTask(keys, (g) => extractDiagnosticState(messages, g), ''), 5000, ''),
        ]);

        let similar = ragDirectResult.status === 'fulfilled' ? ragDirectResult.value : [];
        const classifiedQuery = classifyResult.status === 'fulfilled' ? classifyResult.value : lastUserText;

        if (similar.length === 0 && classifiedQuery !== lastUserText && classifiedQuery.length > 3) {
            const ragFallback = await withTimeout(findSimilarRepairs(classifiedQuery, 1, 0.6), 3000, []);
            if (ragFallback.length > 0) similar = ragFallback;
        }

        if (similar.length > 0) finalSystemPrompt += formatRAGContext(similar);
        const diagBlock = diagResult.status === 'fulfilled' ? diagResult.value : '';
        if (diagBlock) finalSystemPrompt += diagBlock;

        const schematicMatch = schemResult.status === 'fulfilled' ? schemResult.value : null;
        if (schematicMatch) finalSystemPrompt += formatSchematicContext(schematicMatch, lastUserText);

        if (activeBasePrompt === MENTOR_PROMPT) {
            finalSystemPrompt += `

### 🔬 MODO DIAGNÓSTICO GUIADO ACTIVO
REGLA CRÍTICA: Hacé UNA SOLA pregunta específica por turno.
NO des el diagnóstico completo junto. Esperá la respuesta del técnico antes de continuar.
Seguí este flujo hasta identificar el componente exacto.`;
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

        finalSystemPrompt += FINAL_DIRECTIVE;

        const onFinishCb = ({ usage }: any) => {
            if (usage?.totalTokens) trackTokens(usage.totalTokens);
        };

        if (hasImages) {
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
                headers: { 'X-Cerebro-Provider': usedLabel, 'X-Cerebro-Key': usedKey }
            });
        }

        const coreMessages = await toCoreMsgs(messages);
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
            headers: { 'X-Cerebro-Provider': usedLabel, 'X-Cerebro-Key': usedKey }
        });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(`Cerebro Offline: ${error.message}`, { status: 500 });
    }
}
