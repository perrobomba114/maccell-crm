import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText, generateText } from "ai";
import { trackTokens } from "@/lib/cerebro-token-tracker";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import { findSchematic, formatSchematicContext } from "@/lib/cerebro-schematics";
import { LEVEL3_MASTER_KNOWLEDGE } from "@/lib/master-protocols";
import pdfParse from "pdf-parse";
import { getGroqKeys } from "@/lib/groq";


// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_MSGS = 12;
const MAX_MSG_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 2048;
const MAX_PDF_CHARS = 10000;
const MAX_IMAGES = 4;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TIMEOUTS = {
    classify: 2500,
    schematic: 3000,
    rag: 3000,
    diagnostic: 5000,
} as const;

interface CerebroRequestBody {
    messages: any[];
    guidedMode?: boolean;
}

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
const BASE_INSTRUCTIONS = `## ⚓ PROTOCOLO DE VERIFICACIÓN (EJECUTAR ANTES DE RESPONDER)
Antes de generar cualquier nombre de componente (U, L, C, R):
1. ¿Existe en ### 📂 DATOS EXTRAÍDOS DEL PLANO? → Usalo.
2. ¿No existe? → Usá SOLO el bloque funcional genérico: "IC de carga", "Buck del sistema".
3. PROHIBIDO: Inferir o "completar" IDs por analogía con otros dispositivos.

### 🟡 PROTOCOLO DE INCERTIDUMBRE:
Si el dato no está en el contexto provisto, la única respuesta válida es:
"No tengo confirmación de esquema para ese componente. Medí el Rail [X] en el TP más cercano y reportá."
NUNCA completar con memoria de otros modelos de placa.

### 📌 FORMATO OBLIGATORIO PARA COMPONENTES:
Cada componente citado DEBE seguir esta plantilla:
- ✅ [NOMBRE_IC] — Fuente: [Ticket XXX / Plano adjunto / Rail medido]
- ❌ Si no tenés fuente → escribí: "[Bloque funcional sin ID confirmada]"

---

Actuá como Cerebro AI, un Ingeniero Senior de Nivel 3. 
Tu lenguaje es técnico puro y enfocado en microsoldadura y arquitectura de hardware.

### 🛠️ RESTRICCIONES DE LABORATORIO:
- Herramientas: Multímetro, Fuente, Rosin, Microscopio, Estación de soldadura.
- PROHIBIDO: Sugerir Osciloscopio o Cámara Térmica. Sustituir siempre por Multímetro.

### 🚫 REGLAS DE ORO (FALLO SI SE INCUMPLEN):
- NO incluyas "Notas", "Advertencias", "Cuidado" o comentarios sobre dificultad.
- NO sugieras "limpiar el sensor" o "limpieza de contactos" ni update de SW.
- NO des consejos de seguridad o experiencia previa. El usuario es un experto experto.
- NO agregues introducciones, despedidas ni textos fuera de las secciones solicitadas.

### 🔬 MODO SOCIO EXPERTO:
El usuario es un Master con 10+ años. No des consejos básicos.
1. Enfocate en ICs (U-series), Bobinas (L), Capacitores (C) y Test Points.
2. Usá valores de Caída de Tensión (mV) y Voltajes (V).
3. **JERARQUÍA DE FUENTES (Obligatoria)**:
   1° → ### 📂 DATOS EXTRAÍDOS DEL PLANO (Prioridad Máxima)
   2° → ### 📚 HISTORIAL DE REPARACIONES REALES (Usalo como ancla principal)
   3° → Tu conocimiento base interno.

### 🛑 REGLAS DE ESCALADA (Solicitar datos faltantes):
Si los datos son insuficientes, solicitá 1 dato crítico en 1 línea (ej. "¿Modelo de placa y valor en VDD_MAIN con fuente a 4V?").
- TRIGGER A: Sin modelo de dispositivo especificado.
- TRIGGER B: Síntoma ambiguo (ej. "No enciende") y 0 valores de medición.
- TRIGGER C: Contexto contradictorio (ej. "15V en línea de 3.3V").
Si hay suficientes datos, NO escale.

### 🇦🇷 DICCIONARIO DE TALLER (JERGA LOCAL):
- **MÓDULO**: Se refiere ÚNICAMENTE a la Pantalla/Display/LCD/OLED. 
- **MÓDULO DE CARGA**: Se refiere a la Sub-placa de carga/Pin de carga.
- **NUNCA** interpretes "Módulo" como "Módulo de cámara" si el contexto es de Imagen o Encendido. Si se cambió el módulo por falta de imagen, se cambió la PANTALLA.`;

const STANDARD_PROMPT = `${BASE_INSTRUCTIONS}

### 🧠 CONOCIMIENTO MAESTRO:
${LEVEL3_MASTER_KNOWLEDGE}

### 🔗 RAZONAMIENTO EN CADENA (Chain-of-Thought):
Antes de responder, ejecutá mentalmente este proceso:
1. ¿Qué síntoma principal describe el técnico?
2. ¿Qué caminos de falla (power path, data bus, rail específico) pueden producir ese síntoma?
3. ¿Cuál de esos caminos tiene MAYOR probabilidad basada en el síntoma + contexto?
4. ¿Qué medición confirmaría o descartaría cada hipótesis en <2 pasos?
5. Emitir PRIMERO la hipótesis de mayor probabilidad, luego las alternativas.
NO mostres el proceso mental — solo el resultado final quirúrgico.

### 📋 EJEMPLOS DE DIAGNÓSTICO (Few-Shot):

**EJEMPLO 1 — Falla de encendido:**
Técnico: "Samsung A52 no enciende. Fuente muestra 0.00A constante."
→ **Análisis Diferencial**: (A) Corto en rail VDD_MAIN [70%] (B) PMIC muerto [20%] (C) Batería muerta [10%]
→ **Protocolo**: Modo diodo en VBAT con batería desconectada. OL=OK, 0V=corto en rail. Si OL: conectar fuente 3.8V, medir 0.40-0.45A (boot normal) o >0.6A (corto secundario).
→ **Acción**: Si hay corto en VDD_MAIN → inyección de rosin en zona PMIC con fuente a 3.0V y buscar componente que caliente.

**EJEMPLO 2 — Falla de carga:**
Técnico: "iPhone 12 no carga. No detecta cable. Conector limpio."
→ **Análisis Diferencial**: (A) Tristar/Hydra (U2) fugando [60%] (B) VBUS bloqueado por filtro [25%] (C) Flex de carga partido [15%]
→ **Protocolo**: Modo diodo en pin VBUS del conector: 0.45-0.55V = OK, 0V = corto en VBUS. Si OK en VBUS pero no detecta: medir CC1/CC2 (debe alternar 0V/3.3V al insertar cable).
→ **Acción**: Si CC1/CC2 muertos → reemplazar Tristar/Hydra. Nunca calentar el IC — swap a 200°C máx con precalentadora.

**EJEMPLO 3 — Falla de pantalla:**
Técnico: "Redmi Note 10 pantalla negra pero el equipo enciende (vibra, suena)."
→ **Análisis Diferencial**: (A) Conector FPC de display flojo/roto [50%] (B) VSP/VSN caído [30%] (C) Driver IC display muerto [20%]
→ **Protocolo**: Reconectar display y medir en TP de backlight: debe haber >15V (boost). Si hay voltaje y no enciende → falla en driver IC o FPC. Si no hay voltaje → bobina elevadora o FET de control abierto.
→ **Acción**: Si falla FPC → jumper en pista rota con hilo 0.01mm + UV. Si falla driver → reemplazo IC display.

### ESTRUCTURA DE RESPUESTA:
1. **Análisis Diferencial**: Lista hipótesis ordenadas por probabilidad (%). Máximo 3 hipótesis.
2. **Estado del Sistema**: Solo los raíles/señales críticas para ESTE síntoma.
3. **Protocolo de Medición**: Máximo 3-4 pasos secuenciales, con valores esperados.
4. **Acción**: Intervención física concreta (trasplante, reballing, jumper, reemplazo).

**ADAPTACIÓN**: Para consultas simples (1 pregunta directa), respondé en 1-2 secciones. No fuerces los 4 puntos. La estructura sirve al diagnóstico, no al revés.`;

const MENTOR_PROMPT = `${BASE_INSTRUCTIONS}

### 🧠 CONOCIMIENTO MAESTRO:
${LEVEL3_MASTER_KNOWLEDGE}

### 🔬 MODO SOCIO (PARTNER-TECH):
Somos dos técnicos trabajando juntos en la misma placa. Vos medís, yo analizo.
- **UNA SOLA medición por turno** — nunca des 3 cosas a medir a la vez.
- Antes de pedir cada medición, explicá en 1 frase POR QUÉ esa medición importa.
- Cuando el técnico reporte un valor, interpretalo inmediatamente: ¿normal, corto, abierto?
- Si el valor confirma la hipótesis → avanzar al siguiente paso.
- Si el valor descarta la hipótesis → pivotar a la hipótesis alternativa y explicar el cambio.
- Formato por turno: [Interpretación del último dato] → [Siguiente paso: medir X en Y porque Z]
- Usamos terminología pura (VPH_PWR, Rails, Buck, LDO, VBAT, VSYS).`;

const ACADEMY_PROMPT = `Actuá como un Instructor Master de Microsoldadura. 
Tu objetivo es que un técnico Nivel 1 entienda la lógica del circuito antes de tocar la placa.

### 📚 MÉTODO DE ENSEÑANZA (4 PASOS):
1. **ARQUITECTURA DEL BLOQUE**: Explicá qué voltajes (LDO/Buck) alimentan ese sector. 
   - Usá "cascadas" de texto para visualizar el flujo de energía (PMIC -> LDO -> CPU).
2. **HISTORIAL DE REPARACIONES (PRIORIDAD)**: 
   - SI hay ### 📚 HISTORIAL, mencioná: "En reparaciones anteriores (Ticket XXX), la solución fue...". Usá casos reales como ancla pedagógica.
3. **TÉCNICA DE MEDICIÓN**: Explicá CÓMO medir, no solo qué medir. (ej. "Punta roja a GND para caída de tensión"). Aclarar polaridad y contexto.
4. **INTERPRETACIÓN DE RESULTADOS**: Explicá el significado del valor (OL = Línea Abierta, 0V = Corto, etc).
   - Usá analogías: "El LDO es una canilla de voltaje", "El Buck es un compresor".

### 🚫 REGLAS PEDAGÓGICAS:
- NO des la solución final (ej. "Cambiá el IC") de inmediato.
- Forzá al técnico a reportar UNA medición antes de avanzar. Terminar con: "¿Cuál es el valor que mediste?"
- **ESTRICTO**: Si no hay un esquemático real adjunto, NUNCA inventes U1, L1. Hablá de bloques genéricos.`;

const FINAL_DIRECTIVE = `
### ✅ PROTOCOLO DE CALIDAD FINAL:
Antes de emitir output, verificá:
1. Ningún IC inventado sin fuente → usar bloque genérico si no hay confirmación.
2. 0 uso de Osciloscopio/Térmica → reemplazado siempre por multímetro.
3. 0 advertencias de "cuidado" o "limpieza de sensor".
4. Concisión quirúrgica: cada frase tiene datos técnicos o un paso accionable.

Respondé quirúrgicamente.`;

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

async function normalizeHistory(messages: any[]): Promise<any[]> {
    const result: any[] = [];
    for (const m of messages) {
        let textContent = '';
        if (typeof m.content === 'string' && m.content?.trim()) textContent = m.content;
        if (Array.isArray(m.parts)) {
            textContent = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
        }
        if (Array.isArray(m.content)) {
            textContent = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
        }
        const finalText = truncate(textContent?.trim() || '');
        result.push({ role: m.role, content: finalText || (m.role === 'user' ? 'Medición solicitada' : '...') });
    }
    return result;
}

async function parseLastMessage(msg: any): Promise<{ text: string, pdfTexts: string[] }> {
    let textContent = '';
    const pdfTexts: string[] = [];
    if (Array.isArray(msg.parts)) {
        for (const p of msg.parts) {
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
    if (typeof msg.content === 'string' && msg.content?.trim()) textContent = msg.content;
    if (Array.isArray(msg.content)) {
        textContent = msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ');
    }
    textContent = truncate(textContent?.trim() || '');
    return { text: textContent, pdfTexts };
}

async function buildVisionMessages(coreMessages: any[], images: string[]): Promise<any[]> {
    const lastMsg = coreMessages[coreMessages.length - 1];
    let text = "Analizá esta imagen técnica.";
    const rawContent = typeof lastMsg?.content === 'string' ? lastMsg.content : lastUserText(lastMsg);
    if (rawContent) text = rawContent;

    const content: any[] = [{ type: 'text', text }];
    for (const img of images) {
        content.push({ type: 'image', image: img });
    }
    return [{ role: 'user', content }];
}

async function toCoreMsgs(messages: any[]): Promise<any[]> {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);

        const result = await normalizeHistory(history);

        const { text, pdfTexts } = await parseLastMessage(lastMsg);
        let finalContent = text;
        if (pdfTexts.length > 0) {
            const pdfBlock = pdfTexts.map((t, i) => `\n\n📄 [SCHEMATIC/PDF #${i + 1}]:\n${t}`).join('\n');
            finalContent = finalContent + pdfBlock;
        }

        result.push({ role: lastMsg.role, content: finalContent || (lastMsg.role === 'user' ? 'Analizar' : '...') });
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
        } catch (e: any) {
            console.warn(`[CEREBRO] ⚠️ Key ...${key.slice(-4)} falló:`, e.message);
            continue;
        }
    }
    console.error("[CEREBRO] ❌ Todas las keys fallaron en runAuxTask");
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
        const json = JSON.parse(result?.trim() || "{}");
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

        const diag = JSON.parse(result?.trim() || "{}");
        const symptoms: string[] = Array.isArray(diag.symptoms) ? diag.symptoms : [];
        const checked: string[] = Array.isArray(diag.checked) ? diag.checked : [];
        const ruledOut: string[] = Array.isArray(diag.ruledOut) ? diag.ruledOut : [];

        let diagString = `
### 🕵️ ESTADO DEL DIAGNÓSTICO:
- **Dispositivo**: ${diag.device || 'Desconocido'}
- **Síntomas**: ${symptoms.join(', ') || 'No detectados'}
- **Verificado**: ${checked.join(', ') || 'Nada aún'}
- **Sospecha**: ${diag.suspected || 'No determinada'}`;

        if (Array.isArray(diag.learningHistory) && diag.learningHistory.length > 0) {
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

function detectMode(msgLower: string, guidedMode: boolean): string {
    // ACADEMY solo cuando el usuario pide explícitamente una explicación educativa
    const ACADEMY_KEYWORDS = [
        'explicame', 'explicá', 'como mido', 'cómo mido', 'que es', 'qué es',
        'no entiendo', 'enseñame', 'enseñá', 'aprendo', 'nivel basico', 'nivel básico',
        'para que sirve', 'para qué sirve', 'como funciona', 'cómo funciona'
    ];
    // Keywords técnicos ampliados — si aparecen, definitivamente STANDARD
    const EXPERT_KEYWORDS = [
        'reemplazo', 'reballing', 'jumper', 'rail', 'vbus', 'vsys', 'vdd',
        'no enciende', 'no carga', 'pantalla', 'loop', 'reinicia', 'bootloop',
        'samsung', 'iphone', 'moto', 'xiaomi', 'redmi', 'realme', 'oppo',
        'pmic', 'ic', 'buck', 'ldo', 'fpc', 'ufs', 'nand', 'edl', 'brom',
        'corto', 'abierto', 'modo diodo', 'ohm', 'resistencia'
    ];

    if (guidedMode) return 'MENTOR';
    // Si hay keywords técnicos explícitos, forzar STANDARD (evitar falso ACADEMY)
    if (EXPERT_KEYWORDS.some(k => msgLower.includes(k))) return 'STANDARD';
    // Solo ACADEMY si hay keywords educativos explícitos
    if (ACADEMY_KEYWORDS.some(k => msgLower.includes(k))) return 'ACADEMY';
    // STANDARD por defecto — el técnico es experto hasta que demuestre lo contrario
    return 'STANDARD';
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    console.log("[CEREBRO] 📥 Incoming request...");
    try {
        const keys = getGroqKeys();

        if (keys.length === 0) {
            console.error("[CEREBRO] ❌ No Groq keys found.");
            return new Response(JSON.stringify({ error: "No hay llaves de API" }), { status: 500 });
        }

        const body = await req.json() as CerebroRequestBody;
        const messages = body.messages || [];
        const guidedMode = body.guidedMode === true;
        if (!messages.length) return new Response("No messages", { status: 400 });

        const lastUserMsg = messages.findLast((m: any) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;

        let lastUserTextContent = lastUserText(lastUserMsg);
        const msgLower = lastUserTextContent.toLowerCase();

        const mode = detectMode(msgLower, guidedMode);
        let activeBasePrompt = `## 🔀 MODO ACTIVO: [STANDARD]\n\n${STANDARD_PROMPT}`;
        if (mode === 'MENTOR') {
            activeBasePrompt = `## 🔀 MODO ACTIVO: [GUIADO]\n\n${MENTOR_PROMPT}`;
        } else if (mode === 'ACADEMY') {
            activeBasePrompt = `## 🔀 MODO ACTIVO: [ACADEMIA]\n\n${ACADEMY_PROMPT}`;
            console.log("[CEREBRO] 🎓 Activando MODO ACADEMIA");
        } else {
            console.log("[CEREBRO] 🛠️ Activando MODO STANDARD");
        }

        console.log(`[CEREBRO] 🔍 Processsing with guidedMode: ${guidedMode}`);

        let finalSystemPrompt = activeBasePrompt;

        // Correr classify + RAG + Schematics + DiagState EN PARALELO para reducir latencia
        const classifyPromise = lastUserTextContent.length > 8
            ? withTimeout(runAuxTask(keys, (g) => classifySymptom(lastUserTextContent.slice(0, 3000), g), lastUserTextContent), TIMEOUTS.classify, lastUserTextContent)
            : Promise.resolve(lastUserTextContent);

        const [classifyResult, schemResult, ragResultSettled, diagResult] = await Promise.allSettled([
            classifyPromise,
            withTimeout(findSchematic(lastUserTextContent), TIMEOUTS.schematic, null),
            withTimeout(
                classifyPromise.then(q => findSimilarRepairs(q || lastUserTextContent)),
                TIMEOUTS.rag + TIMEOUTS.classify,
                []
            ),
            withTimeout(runAuxTask(keys, (g) => extractDiagnosticState(messages, g), ''), TIMEOUTS.diagnostic, ''),
        ]);

        const ragResult = ragResultSettled;

        // Inyectar contexto RAG (Reparaciones Similares)
        const ragMatches = ragResult.status === 'fulfilled' ? (ragResult.value ?? []) : [];
        console.log(`[CEREBRO] 📚 RAG Matches encontrados: ${ragMatches.length}`);
        if (ragMatches.length > 0) {
            finalSystemPrompt += formatRAGContext(ragMatches);
        }

        const schematicMatch = schemResult.status === 'fulfilled' ? schemResult.value : null;
        if (schematicMatch) finalSystemPrompt += formatSchematicContext(schematicMatch, lastUserTextContent);
        const diagBlock = diagResult.status === 'fulfilled' ? diagResult.value : '';
        if (diagBlock) finalSystemPrompt += diagBlock;

        if (mode === 'MENTOR') {
            finalSystemPrompt += `\n\n### 🔬 MODO DIAGNÓSTICO GUIADO ACTIVO\nHacé UNA SOLA pregunta específica.`;
        }

        finalSystemPrompt += FINAL_DIRECTIVE;

        const coreMessages = await toCoreMsgs(messages);

        if (hasImages) {
            console.log("[CEREBRO] 👁️ Activando flujo VISIÓN");
            const visionMessages = await buildVisionMessages(coreMessages, images);
            // Rotación de key para vision igual que para texto
            let visionStream: any = null;
            for (const key of keys) {
                try {
                    const visionGroq = createGroq({ apiKey: key });
                    const r = await streamText({
                        model: visionGroq(VISION_MODEL.id) as any,
                        messages: visionMessages,
                        system: finalSystemPrompt,
                        maxOutputTokens: MAX_OUTPUT_TOKENS,
                        temperature: 0.3,
                        topP: 0.9,
                    });
                    visionStream = r;
                    break;
                } catch (e: any) {
                    console.warn(`[CEREBRO] 👁️ Vision key ...${key.slice(-4)} falló:`, e.message);
                }
            }
            if (!visionStream) {
                return new Response(JSON.stringify({ error: "Todas las keys fallaron para el análisis de imagen" }), { status: 500 });
            }
            return visionStream.toUIMessageStreamResponse({
                headers: { 'X-Cerebro-Provider': VISION_MODEL.label }
            });
        }

        const onFinishCb = ({ usage }: any) => {
            console.log("[CEREBRO] ✨ Stream finish. Usage:", usage);
            if (usage?.totalTokens) {
                trackTokens(usage.totalTokens).catch(err => console.error("[CEREBRO] Background track error:", err));
            }
        };

        // Configuración de modelos
        const textModelsConfig: any[] = [];

        // Modelo principal
        for (const key of keys) {
            textModelsConfig.push({
                instance: createGroq({ apiKey: key })(TEXT_MODELS[0].id),
                label: TEXT_MODELS[0].label,
                keyId: key.slice(-4)
            });
        }

        // Fallback al modelo secundario
        for (const key of keys) {
            textModelsConfig.push({
                instance: createGroq({ apiKey: key })(TEXT_MODELS[1].id),
                label: TEXT_MODELS[1].label,
                keyId: key.slice(-4)
            });
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
            temperature: 0.35,      // 0.35: técnico preciso pero no robótico
            topP: 0.9,              // nucleus sampling: enfocado, sin repetición
            frequencyPenalty: 0.15, // penaliza repetir las mismas frases
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
