import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { AI_MODELS } from "@/config/ai-models";
import { createFallbackModel, type FallbackModelConfig } from "@/lib/cerebro/models";
import { createLocalCerebroModel } from "./local-provider";
import { buildGroqModelConfigurations } from "./model-routing";
import { getGroqKeys } from "@/lib/groq";
export type ProviderSelection = { label: string; keyId: string };

export function structuredOpenRouterModels(configured: string): string[] {
    return [...new Set([...(configured==='openrouter/free'?[]:[configured]),'google/gemma-4-31b-it:free','openrouter/free'])];
}

export function buildModel(onSelect: (provider: ProviderSelection) => void, vision: boolean, structured=false): LanguageModel {
    const configurations: FallbackModelConfig[] = [];
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        const openRouter = createOpenRouter({ apiKey: openRouterKey });
        const modelId = vision
            ? process.env.OPENROUTER_VISION_MODEL ?? AI_MODELS.VISION
            : process.env.OPENROUTER_MODEL ?? AI_MODELS.CHAT;
        for (const candidate of structured ? structuredOpenRouterModels(modelId) : [modelId]) {
            configurations.push({instance:openRouter(candidate),label:'OpenRouter',keyId:'openrouter',modelId:candidate, ...(structured?{timeoutMs:12_000}:{})});
        }
    }
    configurations.push(...buildGroqModelConfigurations(
        getGroqKeys(),
        vision ? "vision" : "text",
    ));
    const localModel = createLocalCerebroModel(vision);
    if (localModel) {
        configurations.push({ instance: localModel, label: vision ? "Qwen local vision" : "Qwen local", keyId: "local" });
    }
    return createFallbackModel(configurations.map(config=>structured?{timeoutMs:8_000,...config}:config), onSelect) as unknown as LanguageModel;
}
