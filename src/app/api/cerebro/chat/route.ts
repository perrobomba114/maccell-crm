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
const MAX_HISTORY_MSGS = 10;
const MAX_MSG_CHARS = 800;
const MAX_OUTPUT_TOKENS = 800;
const MAX_PDF_CHARS = 8000;
const MAX_IMAGES = 4;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────────────────────────────────────────
const TEXT_MODELS = [
    { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
    { label: 'Llama 3.1 8B', id: 'llama-3.1-8b-instant' },
];
const VISION_MODEL = { label: 'Llama 3.2 11B Vision', id: 'llama-3.2-11b-vision-preview' };
const DIAG_EXTRACT_MODEL = 'llama-3.1-8b-instant';

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
const BASE_INSTRUCTIONS = `Actuá como Cerebro AI, un Ingeniero Senior de Nivel 3. 
Tu lenguaje es técnico puro y enfocado en microsoldadura y arquitectura de hardware.

### 🛠️ RESTRICCIONES DE LABORATORIO:
- Herramientas: Multímetro, Fuente, Rosin, Microscopio, Estación de soldadura.
- PROHIBIDO: Sugerir Osciloscopio o Cámara Térmica.

### 🚫 REGLAS DE ORO (FALLO SI SE INCUMPLEN):
- NO incluyas "Notas", "Advertencias" o comentarios sobre la dificultad de la reparación.
- NO sugieras "limpiar el sensor" o "limpieza de contactos".
- NO sugieras "restaurar software" o "actualizar sistema".
- NO des consejos de seguridad o sobre "tener experiencia previa". El usuario es un experto.
- NO agregues introducciones, despedidas ni textos fuera de las 4 secciones solicitadas.

### 🔬 MODO SOCIO EXPERTO:
El usuario es un Master con 10+ años. No des consejos básicos.
1. Enfocate en ICs (U-series), Bobinas (L), Capacitores (C) y Test Points.
2. Usá valores de Caída de Tensión (mV) y Voltajes (V).
3. **PRIORIDAD MÁXIMA**: Consultá el bloque ### 📂 REFERENCIAS TÉCNICAS EXTERNAS (RAG) para usar soluciones reales de la base de datos de Maccell (+500 reparaciones/mes).
4. Priorizá los datos de los esquemas adjuntos sobre tu conocimiento general.`;

const STANDARD_PROMPT = `${BASE_INSTRUCTIONS}

### 🧠 CONOCIMIENTO MAESTRO:
${LEVEL3_MASTER_KNOWLEDGE}

### ESTRUCTURA DE RESPUESTA (OBLIGATORIA):
1. **Análisis Diferencial**: Hipótesis con %.
2. **Estado del Sistema**: Raíles críticos (VBUS, VDD, etc).
3. **Protocolo de Medición**: Pasos con multímetro/fuente.
4. **Acción**: Intervención física (trasplante, reballing, jumper).

### 🏁 FINALIZACIÓN CRÍTICA:
La respuesta DEBE TERMINAR inmediatamente después del punto 4 (Acción). Cualquier palabra posterior será considerada un error de protocolo.`;

const MENTOR_PROMPT = `${BASE_INSTRUCTIONS}

### 🧠 CONOCIMIENTO MAESTRA:
${LEVEL3_MASTER_KNOWLEDGE}

### 🔬 MODO SOCIO (PARTNER-TECH):
Trabajamos paso a paso. Yo te guío en la medición, vos me das los valores. 
- UNA SOLA medición específica por turno.
- Enseñá a interpretar los resultados: explicá qué significa el valor esperado vs el obtenido.
- Usamos terminología pura (VPH_PWR, Rails, Buck, LDO).`;

const ACADEMY_PROMPT = `Actuá como un Instructor Master de Microsoldadura. 
Tu objetivo es un técnico Nivel 1 entienda la lógica del circuito antes de tocar la placa.

### 📚 MÉTODO DE ENSEÑANZA:
1. **Arquitectura del Bloque**: Explicá qué voltajes (LDO/Buck) alimentan ese sector. 
   - **Visualización**: Usá "cascadas" de texto para explicar el flujo (ej: PMIC -> LDO -> FPC).
2. **Interpretación de Datos**: 
   - SI hay PDF: Mencioná componentes (U, L, C) clave según el plano.
   - SI hay RAG (### 📂 REFERENCIAS): Mencioná componentes y soluciones de casos reales reparados en Maccell.
3. **Técnica de Medición**: Explicá CÓMO medir (ej. "Punta roja a tierra para caída de tensión").
4. **Razonamiento**: Explicá el significado del valor (OL = Línea Abierta, 0V = Corto).

### 🚫 REGLAS PEDAGÓGICAS:
- NO des la solución final (ej. "Cambiá el IC") de inmediato.
- Forzá al técnico a reportar una medición antes de avanzar.
- Usá analogías técnicas (ej. "El LDO es una canilla de voltaje").
- **ESTRICTO**: Si no hay un esquemático real adjunto, NO inventes nombres de componentes (U1, L1). Hablá de bloques genéricos (ej. "El bloque PMIC").`;

const FINAL_DIRECTIVE = `
🚨 ATENCIÓN: Antes de nombrar un IC (ej. U3300), verificá en el [SCHEMATIC/PDF] adjunto si el nombre coincide con la función. 
Si el esquema dice que U3300 es "CHARGER", no digas que es "CAMERA". La precisión del esquemático es tu única verdad.

### ⚓ REGLA DE ANCLAJE (ANTI-ALUCINACIÓN):
- Si el usuario pregunta por un componente específico, buscalo en el bloque ### 📂 DATOS EXTRAÍDOS DEL PLANO. 
- Si no aparece en el texto extraído Y no hay RAG context que lo nombre, admití que no tenés el dato exacto del plano en ese fragmento.
- **PROHIBIDO TERMINANTEMENTE**: Mencionar U1, L1, C1 o cualquier ID genérica si no está en el contexto real. Si no hay plano, decí: "No tengo el plano de este sector, pero podemos medir los Rails principales...".

Respondé quirúrgicamente. Sin notas, sin disclaimers de riesgo. Si sugerís software o limpieza, el laboratorio se cierra.`;

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
        let text = parsed.text?.trim() || "";
        if (!text) return null;

        // PRIORIZACIÓN: Buscamos términos críticos para que la IA no invente
        const keywords = ["camera", "ldo", "buck", "vcc", "mipi", "u3300", "u2700", "j_cam", "charger", "display", "backlight"];
        const lines = text.split('\n');
        const relevantLines = lines.filter(line =>
            keywords.some(kw => line.toLowerCase().includes(kw))
        ).slice(0, 40); // Tomamos las 40 líneas más importantes

        const prioritized = `### 📂 DATOS EXTRAÍDOS DEL PLANO:\n${relevantLines.join('\n')}\n\n`;
        const fullContent = prioritized + text;

        return fullContent.length > MAX_PDF_CHARS
            ? fullContent.slice(0, MAX_PDF_CHARS) + '...'
            : fullContent;
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
    // Intentar sacar texto real si existe
    const rawContent = lastUserText(lastMsg);
    if (rawContent) text = rawContent;

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
            prompt: `Extraé marca, modelo y síntomas técnicos de este texto. Respondé SOLO con JSON:
{"brand":"Samsung","model":"A52","symptoms":["reinicio"]}
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
            maxOutputTokens: 350,
            temperature: 0,
            prompt: `Analizá esta conversación y respondé SOLO con JSON.
${conversationText}
JSON: {
  "device":"equipo",
  "symptoms":["síntoma1"],
  "checked":["medido"],
  "ruledOut":["descartado"],
  "suspected":"componente",
  "learningHistory": [
    {"level": "Nivel 1", "concept": "Concepto", "measurement": "Medición"}
  ]
}`
        });

        const diag = JSON.parse(result.trim());
        let diagString = `
### 🕵️ ESTADO DEL DIAGNÓSTICO:
- **Dispositivo**: ${diag.device || 'Desconocido'}
- **Síntomas**: ${diag.symptoms.join(', ')}
- **Verificado**: ${diag.checked.join(', ') || 'Nada aún'}
- **Sospecha**: ${diag.suspected || 'No determinada'}`;

        if (diag.learningHistory && diag.learningHistory.length > 0) {
            diagString += `\n\n### 🎓 HISTORIAL DE APRENDIZAJE:
| Nivel | Concepto Aprendido | Medición Realizada |
|-------|-------------------|-------------------|
${diag.learningHistory.map((h: any) => `| ${h.level} | ${h.concept} | ${h.measurement} |`).join('\n')}`;
        }

        return diagString;
    } catch {
        return '';
    }
}

function createFallbackModel(configs: any[], onSelect: (info: any) => void) {
    if (configs.length === 0) throw new Error("No model configs provided");
    return {
        specificationVersion: 'v2',
        provider: 'cerebro-fallback',
        modelId: 'fallback-logic',
        doGenerate: async (params: any) => {
            let lastErr;
            for (const config of configs) {
                try {
                    onSelect(config);
                    const result = await config.instance.doGenerate(params);
                    // Acomodamos finishReason si viene como objeto (falla Zod en el cliente)
                    if (result.finishReason && typeof result.finishReason === 'object') {
                        result.finishReason = (result.finishReason as any).unified || 'stop';
                    }
                    return result;
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
                    const result = await config.instance.doStream(params);

                    // Transformamos el stream para aplanar finishReason en pedazos tipo 'finish'
                    const originalStream = result.stream;
                    const transformedStream = new ReadableStream({
                        async start(controller) {
                            const reader = originalStream.getReader();
                            try {
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;

                                    // Interceptamos el mensaje de finalización
                                    if (value.type === 'finish' && value.finishReason && typeof value.finishReason === 'object') {
                                        value.finishReason = value.finishReason.unified || 'stop';
                                    }
                                    controller.enqueue(value);
                                }
                            } finally {
                                reader.releaseLock();
                                controller.close();
                            }
                        }
                    });

                    return { ...result, stream: transformedStream };
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
    console.log("[CEREBRO] 📥 Incoming request...");
    try {
        const keys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3
        ].filter((k): k is string => !!k && k.length > 10);

        if (keys.length === 0) {
            console.error("[CEREBRO] ❌ No Groq keys found.");
            return new Response(JSON.stringify({ error: "No hay llaves de API" }), { status: 500 });
        }

        const body = await req.json();
        const messages = body.messages || [];
        const guidedMode = body.guidedMode === true;
        if (!messages.length) return new Response("No messages", { status: 400 });

        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;

        let lastUserTextContent = lastUserText(lastUserMsg);
        let activeBasePrompt = STANDARD_PROMPT;
        const msgLower = lastUserTextContent.toLowerCase();

        // DETECTOR DE NIVEL (Si pregunta cómo, o si faltan datos técnicos, es Nivel 1)
        const tieneDatosTecnicos = (/\d+(mv|v|ohm|ma)/i).test(msgLower);

        if (msgLower.includes('como mido') || msgLower.includes('explicame') || msgLower.includes('que es') || msgLower.includes('no entiendo')) {
            activeBasePrompt = ACADEMY_PROMPT;
            console.log("[CEREBRO] 🎓 Activando MODO ACADEMIA (Keyword)");
        } else if (!tieneDatosTecnicos && !msgLower.includes('reemplazo') && activeBasePrompt !== MENTOR_PROMPT && !guidedMode) {
            activeBasePrompt = ACADEMY_PROMPT;
            console.log("[CEREBRO] 🎓 Activando MODO ACADEMIA (Falta de datos técnicos)");
        } else if (guidedMode) {
            activeBasePrompt = MENTOR_PROMPT;
        }

        console.log(`[CEREBRO] 🔍 Processsing with guidedMode: ${guidedMode}`);

        let finalSystemPrompt = activeBasePrompt;
        const [classifyResult, schemResult, ragResult, diagResult] = await Promise.allSettled([
            lastUserTextContent.length > 8
                ? withTimeout(runAuxTask(keys, (g) => classifySymptom(lastUserTextContent.slice(0, 3000), g), lastUserTextContent), 2500, lastUserTextContent)
                : Promise.resolve(lastUserTextContent),
            withTimeout(findSchematic(lastUserTextContent), 3000, null),
            withTimeout(findSimilarRepairs(lastUserTextContent), 3000, []),
            withTimeout(runAuxTask(keys, (g) => extractDiagnosticState(messages, g), ''), 5000, ''),
        ]);

        // Inyectar contexto RAG (Reparaciones Similares)
        const ragMatches = ragResult.status === 'fulfilled' ? ragResult.value : [];
        console.log(`[CEREBRO] 📚 RAG Matches encontrados: ${ragMatches.length}`);
        if (ragMatches.length > 0) {
            finalSystemPrompt += formatRAGContext(ragMatches);
        }

        const schematicMatch = schemResult.status === 'fulfilled' ? schemResult.value : null;
        if (schematicMatch) finalSystemPrompt += formatSchematicContext(schematicMatch, lastUserTextContent);
        const diagBlock = diagResult.status === 'fulfilled' ? diagResult.value : '';
        if (diagBlock) finalSystemPrompt += diagBlock;

        if (activeBasePrompt === MENTOR_PROMPT) {
            finalSystemPrompt += `\n\n### 🔬 MODO DIAGNÓSTICO GUIADO ACTIVO\nHacé UNA SOLA pregunta específica.`;
        }

        finalSystemPrompt += FINAL_DIRECTIVE;

        const onFinishCb = ({ usage }: any) => {
            console.log("[CEREBRO] ✨ Stream finish. Usage:", usage);
            if (usage?.totalTokens) {
                trackTokens(usage.totalTokens).catch(err => console.error("[CEREBRO] Background track error:", err));
            }
        };

        const coreMessages = await toCoreMsgs(messages);

        // Configuración de modelos
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

        console.log("[CEREBRO] 🚀 Streaming response...");
        const result = await streamText({
            model: cerebroTextModel as any,
            system: finalSystemPrompt,
            messages: coreMessages,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            onFinish: onFinishCb,
            maxRetries: 0,
        });

        console.log("[CEREBRO] ✅ Returning stream response headers.");
        return result.toUIMessageStreamResponse({
            headers: { 'X-Cerebro-Provider': usedLabel, 'X-Cerebro-Key': usedKey }
        });

    } catch (error: any) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
