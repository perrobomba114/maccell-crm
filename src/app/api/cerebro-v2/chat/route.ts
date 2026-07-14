import { getCurrentUser } from "@/actions/auth-actions";
import { TEXT_MODELS } from "@/lib/cerebro/models";
import { createFallbackModel } from "@/lib/cerebro/models";
import { toCoreMsgs } from "@/lib/cerebro/message-processor";
import type { MessageLike } from "@/lib/cerebro/utils";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { normalizeBrand, normalizeModel } from "@/lib/cerebro-v2/normalization";
import { buildCerebroSystemPrompt } from "@/lib/cerebro-v2/prompt";
import { retrieveCerebroSources } from "@/lib/cerebro-v2/retrieval";
import { requestQueryEmbedding } from "@/lib/cerebro-v2/worker-client";
import { getGroqKeys } from "@/lib/groq";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type LanguageModel } from "ai";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
    messages: z.array(z.object({
        role: z.string(),
        content: z.string().optional(),
        parts: z.array(z.unknown()).optional(),
    }).passthrough()).min(1),
    deviceContext: z.object({
        brand: z.string().min(1).max(60),
        model: z.string().min(1).max(120),
    }),
});

type ChatMessage = z.infer<typeof requestSchema>["messages"][number];

function messageText(message: ChatMessage): string {
    if (message.content) return message.content;
    return (message.parts ?? []).flatMap((part) => {
        if (!part || typeof part !== "object" || !("type" in part) || part.type !== "text") return [];
        return "text" in part && typeof part.text === "string" ? [part.text] : [];
    }).join("\n");
}

function componentCodes(value: string): string[] {
    return [...new Set(value.toUpperCase().match(/\b[A-Z]{1,3}\d{3,5}\b/g) ?? [])];
}

function languageModel(): LanguageModel {
    const configurations: Array<{ instance: unknown; label: string; keyId: string }> = [];
    for (const key of getGroqKeys()) {
        for (const model of TEXT_MODELS) {
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
        configurations.push({
            instance: openRouter(process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001"),
            label: "OpenRouter",
            keyId: "openrouter",
        });
    }
    return createFallbackModel(configurations, () => undefined) as unknown as LanguageModel;
}

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

        const parsed = requestSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Consulta técnica inválida" }, { status: 400 });

        const lastUserMessage = parsed.data.messages.findLast((message) => message.role === "user");
        const query = lastUserMessage ? messageText(lastUserMessage).trim() : "";
        if (!query) return Response.json({ error: "La consulta está vacía" }, { status: 400 });

        const brand = normalizeBrand(parsed.data.deviceContext.brand);
        const model = normalizeModel(brand, parsed.data.deviceContext.model);
        const embedding = await requestQueryEmbedding(query);
        const evidence = await retrieveCerebroSources({
            brand,
            model,
            text: query,
            embedding,
            componentCodes: componentCodes(query),
            limit: 10,
        });
        const result = streamText({
            model: languageModel(),
            system: buildCerebroSystemPrompt(brand, model, evidence),
            messages: await toCoreMsgs(parsed.data.messages as unknown as MessageLike[]),
            temperature: 0.25,
            maxOutputTokens: 1_800,
            maxRetries: 0,
        });
        return result.toUIMessageStreamResponse({
            headers: { "X-Cerebro-RAG-Sources": String(evidence.length) },
        });
    } catch (error) {
        console.error("[cerebro-v2/chat] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo completar el diagnóstico" }, { status: 500 });
    }
}
