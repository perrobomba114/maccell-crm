import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { streamText, tool, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { trackTokens } from "@/lib/cerebro-token-tracker";
import { findSimilarRepairs, formatRAGContext, type SimilarRepair } from "@/lib/cerebro-rag";
import { findSchematic, formatSchematicContext } from "@/lib/cerebro-schematics";
import { getGroqKeys } from "@/lib/groq";
import { cerebroWebSearch } from "@/lib/cerebro-web-search";
import { STANDARD_PROMPT, MENTOR_PROMPT, FINAL_DIRECTIVE } from "@/config/ai-models";
import { getCurrentUser } from "@/actions/auth-actions";

// Extracted modules
import { extractImages, lastUserText, withTimeout, MAX_OUTPUT_TOKENS, type MessageLike } from "@/lib/cerebro/utils";
import { buildVisionMessages, toCoreMsgs } from "@/lib/cerebro/message-processor";
import { runAuxTask, classifySymptom, extractDiagnosticState } from "@/lib/cerebro/tasks";
import { TEXT_MODELS, VISION_MODEL, createFallbackModel } from "@/lib/cerebro/models";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TIMEOUTS = {
    classify: 2500,
    schematic: 3000,
    rag: 3000,
    diagnostic: 5000,
} as const;

interface CerebroRequestBody {
    messages: CerebroMessage[];
    guidedMode?: boolean;
    deviceContext?: { brand: string; model: string };
}

type CerebroMessage = MessageLike & {
    role: string;
};

type ClassificationResult = {
    query: string;
    brand: string;
    model: string;
};

type TextModelConfig = {
    instance: LanguageModel;
    label: string;
    keyId: string;
};

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const keys = getGroqKeys();
        if (keys.length === 0) {
            return new Response(JSON.stringify({ error: "No hay llaves de API" }), { status: 500 });
        }

        const body = await req.json() as CerebroRequestBody;
        const messages = body.messages || [];
        const guidedMode = body.guidedMode === true;
        const deviceContext = body.deviceContext;
        if (!messages.length) return new Response("No messages", { status: 400 });

        const lastUserMsg = messages.findLast((m) => m.role === 'user');
        const images = lastUserMsg ? extractImages(lastUserMsg) : [];
        const hasImages = images.length > 0;
        const lastUserTextContent = lastUserText(lastUserMsg);

        const mode = guidedMode ? 'MENTOR' : 'STANDARD';
        let finalSystemPrompt = mode === 'MENTOR'
            ? `## 🔀 MODO ACTIVO: [GUIADO]\n\n${MENTOR_PROMPT}`
            : `## 🔀 MODO ACTIVO: [STANDARD]\n\n${STANDARD_PROMPT}`;

        let classifyPromise: Promise<ClassificationResult>;
        if (deviceContext?.brand && deviceContext.brand !== "Auto") {
            classifyPromise = Promise.resolve({
                query: `${deviceContext.brand} ${deviceContext.model} ${lastUserTextContent}`,
                brand: deviceContext.brand,
                model: deviceContext.model
            });
        } else {
            classifyPromise = lastUserTextContent.length > 8
                ? withTimeout(runAuxTask(keys, (g) => classifySymptom(lastUserTextContent.slice(0, 3000), g), { query: lastUserTextContent, brand: '', model: '' }), TIMEOUTS.classify, { query: lastUserTextContent, brand: '', model: '' })
                : Promise.resolve({ query: lastUserTextContent, brand: '', model: '' });
        }

        const [classifyResult, schemResult, ragResultSettled, diagResult] = await Promise.allSettled([
            classifyPromise,
            withTimeout(findSchematic(lastUserTextContent), TIMEOUTS.schematic, null),
            withTimeout(
                classifyPromise.then(r => {
                    const classified = r as { query: string; brand: string; model: string };
                    return findSimilarRepairs(classified.query || lastUserTextContent, 8, 0.52, classified.brand);
                }),
                TIMEOUTS.rag + TIMEOUTS.classify,
                []
            ),
            withTimeout(runAuxTask(keys, (g) => extractDiagnosticState(messages, g), ''), TIMEOUTS.diagnostic, ''),
        ]);

        const classifiedBrand = classifyResult.status === 'fulfilled' ? classifyResult.value.brand : '';
        const classifiedModel = classifyResult.status === 'fulfilled' ? classifyResult.value.model : '';

        if (classifiedBrand && classifiedBrand !== 'Desconocido') {
            finalSystemPrompt += `\n\n### 🎯 DISPOSITIVO EN CONSULTA:\nMarca: **${classifiedBrand}**${classifiedModel ? ` | Modelo: **${classifiedModel}**` : ''}\nAVISO CRÍTICO: Solo referenciás datos técnicos de equipos **${classifiedBrand}**. Cualquier componente de otra marca en el HISTORIAL debe IGNORARSE.`;
        }

        const ragMatches: SimilarRepair[] = ragResultSettled.status === 'fulfilled' ? (ragResultSettled.value ?? []) : [];
        if (ragMatches.length > 0) finalSystemPrompt += formatRAGContext(ragMatches);

        const schematicMatch = schemResult.status === 'fulfilled' ? schemResult.value : null;
        if (schematicMatch) finalSystemPrompt += formatSchematicContext(schematicMatch, lastUserTextContent);

        const diagBlock = diagResult.status === 'fulfilled' ? diagResult.value : '';
        if (diagBlock) finalSystemPrompt += diagBlock;

        if (mode === 'MENTOR') finalSystemPrompt += `\n\n### 🔬 MODO DIAGNÓSTICO GUIADO ACTIVO\nHacé UNA SOLA pregunta específica.`;
        finalSystemPrompt += FINAL_DIRECTIVE;

        const coreMessages = await toCoreMsgs(messages);

        if (hasImages) {
            const visionMessages = await buildVisionMessages(messages, images);
            let visionStream: ReturnType<typeof streamText> | null = null;
            for (const key of keys) {
                try {
                    const visionGroq = createGroq({ apiKey: key });
                    visionStream = streamText({
                        model: visionGroq(VISION_MODEL.id),
                        messages: visionMessages,
                        system: finalSystemPrompt,
                        maxOutputTokens: MAX_OUTPUT_TOKENS,
                        temperature: 0.3,
                        topP: 0.9,
                    });
                    break;
                } catch (e: unknown) {
                    console.warn(`[CEREBRO] 👁️ Vision key failed:`, e instanceof Error ? e.message : String(e));
                }
            }
            if (!visionStream) return new Response(JSON.stringify({ error: "Vision keys failed" }), { status: 500 });
            return visionStream.toUIMessageStreamResponse({ headers: { 'X-Cerebro-Provider': VISION_MODEL.label } });
        }

        const textModelsConfig: TextModelConfig[] = [];
        for (const key of keys) {
            textModelsConfig.push({ instance: createGroq({ apiKey: key })(TEXT_MODELS[0].id), label: TEXT_MODELS[0].label, keyId: key.slice(-4) });
        }
        for (const key of keys) {
            textModelsConfig.push({ instance: createGroq({ apiKey: key })(TEXT_MODELS[1].id), label: TEXT_MODELS[1].label, keyId: key.slice(-4) });
        }

        let usedLabel = 'Unknown', usedKey = '';
        const cerebroTextModel = createFallbackModel(textModelsConfig, (info) => {
            usedLabel = info.label; usedKey = info.keyId;
        });

        const webSearchTool = tool({
            description: 'Busca información técnica de reparación de dispositivos móviles en la web.',
            inputSchema: z.object({ query: z.string() }),
            execute: async ({ query }) => {
                const result = await cerebroWebSearch(query, classifiedBrand);
                return result || 'No se encontraron resultados relevantes.';
            },
        });

        const result = streamText({
            model: cerebroTextModel as unknown as LanguageModel,
            system: finalSystemPrompt,
            messages: coreMessages,
            tools: { webSearch: webSearchTool },
            stopWhen: stepCountIs(5),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.35,
            topP: 0.9,
            frequencyPenalty: 0.15,
            onFinish: ({ usage }) => {
                if (usage?.totalTokens) {
                    trackTokens(usage.totalTokens).catch((err) => {
                        console.warn("[CEREBRO] Token tracking failed:", err instanceof Error ? err.message : String(err));
                    });
                }
            },
            maxRetries: 0,
        });

        return result.toUIMessageStreamResponse({
            headers: { 'X-Cerebro-Provider': usedLabel, 'X-Cerebro-Key': usedKey }
        });

    } catch (error: unknown) {
        console.error("[CEREBRO] ❌ ERROR FATAL:", error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
    }
}
