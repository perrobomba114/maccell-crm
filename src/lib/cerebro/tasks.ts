import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import type { MessageLike, MessagePart } from "./utils";

const DIAG_EXTRACT_MODEL = 'llama-3.1-8b-instant';
type GroqProvider = ReturnType<typeof createGroq>;

type DiagnosticJson = {
    brand?: string;
    model?: string;
    symptoms?: unknown;
    device?: string;
    checked?: unknown;
    suspected?: string;
    learningHistory?: unknown;
};

type LearningHistoryItem = {
    level?: string;
    concept?: string;
    measurement?: string;
};

function parseDiagnosticJson(text: string | undefined): DiagnosticJson {
    return JSON.parse(text?.trim() || "{}") as DiagnosticJson;
}

function isTextPart(part: MessagePart): part is MessagePart & { text: string } {
    return part.type === "text" && typeof part.text === "string";
}

export async function runAuxTask<T>(keys: string[], task: (g: GroqProvider) => Promise<T>, fallback: T): Promise<T> {
    for (const key of keys) {
        try {
            const groq = createGroq({ apiKey: key });
            return await task(groq);
        } catch (e: unknown) {
            console.warn(`[CEREBRO] ⚠️ Key ...${key.slice(-4)} falló:`, e instanceof Error ? e.message : String(e));
            continue;
        }
    }
    console.error("[CEREBRO] ❌ Todas las keys fallaron en runAuxTask");
    return fallback;
}

export async function classifySymptom(text: string, groq: GroqProvider): Promise<{ query: string; brand: string; model: string }> {
    try {
        const { text: result } = await generateText({
            model: groq('llama-3.1-8b-instant'),
            maxOutputTokens: 100,
            temperature: 0,
            prompt: `Extraé con precisión la marca, modelo exacto y síntomas técnicos de este texto. Respondé SOLO con JSON válido:
{"brand":"Samsung","model":"A52","symptoms":["no enciende","0.00A"]}

Reglas:
- brand: solo la marca del fabricante (Samsung, Apple, Motorola, Xiaomi, Huawei, Redmi, Realme, OPPO, etc). Si no se menciona, "Desconocido".
- model: el modelo específico del dispositivo. Si no se menciona, "".
- symptoms: lista de síntomas técnicos en el idioma original.

Texto: "${text.slice(0, 300)}"`
        });
        const json = parseDiagnosticJson(result);
        const brand = (json.brand || '').trim();
        const model = (json.model || '').trim();
        const symptoms: string[] = Array.isArray(json.symptoms) ? json.symptoms : [];
        const query = [brand, model, ...symptoms].filter(Boolean).join(' ');
        return { query: query || text, brand, model };
    } catch {
        return { query: text, brand: '', model: '' };
    }
}

export async function extractDiagnosticState(
    messages: MessageLike[],
    groq: GroqProvider
): Promise<string> {
    const turns = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    if (turns.length < 3) return '';

    try {
        const conversationText = turns
            .slice(-6)
            .map(m => {
                let text = '';
                if (typeof m.content === 'string') text = m.content;
                else if (Array.isArray(m.parts)) text = m.parts.filter(isTextPart).map((p) => p.text).join(' ');
                const role = m.role || 'user';
                return `[${role.toUpperCase()}]: ${text.slice(0, 500)}`;
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

        const diag = parseDiagnosticJson(result);
        const symptoms: string[] = Array.isArray(diag.symptoms) ? diag.symptoms : [];
        const checked: string[] = Array.isArray(diag.checked) ? diag.checked : [];

        let diagString = `
### 🕵️ ESTADO DEL DIAGNÓSTICO:
- **Dispositivo**: ${diag.device || 'Desconocido'}
- **Síntomas**: ${symptoms.join(', ') || 'No detectados'}
- **Verificado**: ${checked.join(', ') || 'Nada aún'}
- **Sospecha**: ${diag.suspected || 'No determinada'}`;

        if (Array.isArray(diag.learningHistory) && diag.learningHistory.length > 0) {
            const learningHistory = diag.learningHistory as LearningHistoryItem[];
            diagString += `\n\n### 🎓 HISTORIAL DE APRENDIZAJE:
| Nivel | Concepto Aprendido | Medición Realizada |
|-------|-------------------|-------------------|
${learningHistory.map((h) => `| ${h.level || ''} | ${h.concept || ''} | ${h.measurement || ''} |`).join('\n')}`;
        }

        return diagString;
    } catch {
        return '';
    }
}
