import { getCurrentUser } from "@/actions/auth-actions";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type LanguageModel, type ModelMessage } from "ai";

import { TEXT_MODELS, VISION_MODEL, createFallbackModel } from "@/lib/cerebro/models";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { parseCerebroChatRequest, type CerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { extractMessageInput, toPublicSources } from "@/lib/cerebro-v2/message-content";
import { normalizeDeviceIdentity } from "@/lib/cerebro-v2/normalization";
import { buildCerebroSystemPrompt, CEREBRO_PROMPT_VERSION } from "@/lib/cerebro-v2/prompt";
import { retrieveCerebroSources } from "@/lib/cerebro-v2/retrieval";
import type { CerebroMessageMetadata } from "@/lib/cerebro-v2/types";
import { requestQueryEmbedding } from "@/lib/cerebro-v2/worker-client";
import { getGroqKeys } from "@/lib/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProviderSelection = { label: string; keyId: string };

function componentCodes(value: string): string[] {
    return [...new Set(value.toUpperCase().match(/\b[A-Z]{1,3}\d{3,5}\b/g) ?? [])];
}

function buildModel(onSelect: (provider: ProviderSelection) => void, vision: boolean): LanguageModel {
    const configurations: Array<{ instance: unknown; label: string; keyId: string }> = [];
    for (const key of getGroqKeys()) {
        const models = vision ? [VISION_MODEL] : TEXT_MODELS;
        for (const model of models) {
            configurations.push({
                instance: createGroq({ apiKey: key })(model.id),
                label: model.label,
                keyId: "groq",
            });
        }
    }
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        const openRouter = createOpenRouter({ apiKey: openRouterKey });
        const modelId = vision
            ? process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.5-flash"
            : process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
        configurations.push({ instance: openRouter(modelId), label: "OpenRouter", keyId: "openrouter" });
    }
    return createFallbackModel(configurations, onSelect) as unknown as LanguageModel;
}

function toModelMessages(messages: CerebroChatRequest["messages"]): ModelMessage[] {
    return messages.slice(-8).map((message): ModelMessage => {
        const input = extractMessageInput(message);
        if (message.role === "assistant") return { role: "assistant", content: input.text || "..." };
        if (input.images.length === 0) return { role: "user", content: input.text || "Analizar equipo" };
        return {
            role: "user",
            content: [
                { type: "text", text: input.text || "Analizá esta imagen técnica del equipo." },
                ...input.images.map((image) => ({ type: "image" as const, image })),
            ],
        };
    });
}

function diagnosticQuery(request: CerebroChatRequest): { text: string; images: string[] } {
    const lastUser = request.messages.findLast((message) => message.role === "user");
    if (!lastUser) return { text: "", images: [] };
    return extractMessageInput(lastUser);
}

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Sin acceso" }, { status: 403 });

        const parsed = parseCerebroChatRequest(await request.json());
        if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 });
        const session = await cerebroChatRepository.getSession(user.id, parsed.data.sessionId);
        if (!session) return Response.json({ error: "El chat no existe o no te pertenece" }, { status: 404 });

        const { brand, model } = normalizeDeviceIdentity(
            parsed.data.deviceContext.brand,
            parsed.data.deviceContext.model,
        );
        const query = diagnosticQuery(parsed.data);
        if (!query.text && query.images.length === 0) {
            return Response.json({ error: "Describí el síntoma o adjuntá una imagen" }, { status: 400 });
        }

        const searchText = query.text || `Inspección visual ${brand} ${model}`;
        const embedding = await requestQueryEmbedding(searchText);
        const evidence = await retrieveCerebroSources({
            brand,
            model,
            text: searchText,
            embedding,
            componentCodes: componentCodes(searchText),
            limit: 8,
        });
        const publicSources = toPublicSources(evidence);
        await cerebroChatRepository.appendMessage({
            userId: user.id,
            sessionId: session.id,
            clientMessageId: parsed.data.clientMessageId,
            role: "user",
            content: query.text,
            attachments: query.images,
            sources: [],
            promptVersion: null,
            provider: null,
        });
        const title = session.title === "Nuevo diagnóstico" ? searchText.slice(0, 80) : undefined;
        await cerebroChatRepository.touchSession(user.id, session.id, brand, model, title);

        let selectedProvider: ProviderSelection = { label: "Pendiente", keyId: "pending" };
        const result = streamText({
            model: buildModel((provider) => { selectedProvider = provider; }, query.images.length > 0),
            system: buildCerebroSystemPrompt(brand, model, evidence),
            messages: toModelMessages(parsed.data.messages),
            temperature: 0.2,
            maxOutputTokens: 1_600,
            maxRetries: 0,
            onFinish: async ({ text }) => {
                await cerebroChatRepository.appendMessage({
                    userId: user.id,
                    sessionId: session.id,
                    clientMessageId: `${parsed.data.clientMessageId}:assistant`,
                    role: "assistant",
                    content: text,
                    attachments: [],
                    sources: publicSources,
                    promptVersion: CEREBRO_PROMPT_VERSION,
                    provider: `${selectedProvider.keyId}:${selectedProvider.label}`,
                });
            },
        });
        return result.toUIMessageStreamResponse({
            messageMetadata: (): CerebroMessageMetadata => ({
                promptVersion: CEREBRO_PROMPT_VERSION,
                provider: selectedProvider.keyId,
                sources: publicSources,
            }),
        });
    } catch (error) {
        console.error("[cerebro-v2/chat] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "Cerebro no pudo completar el diagnóstico" }, { status: 503 });
    }
}
