import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

import type { FallbackModelConfig } from "@/lib/cerebro/models";

export type CerebroModelPurpose = "text" | "vision" | "diagnosis";

type GroqModelDefinition = {
    id: string;
    label: string;
};

export const GROQ_QWEN_MODEL = {
    id: "qwen/qwen3.6-27b",
    label: "Qwen 3.6 27B",
} satisfies GroqModelDefinition;

export const GROQ_KIMI_MODEL = {
    id: "moonshotai/kimi-k2-instruct",
    label: "Kimi K2",
} satisfies GroqModelDefinition;

export const GROQ_VISION_FALLBACK_MODEL = {
    id: process.env.CEREBRO_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout Vision",
} satisfies GroqModelDefinition;

export type GroqModelPlanEntry = GroqModelDefinition & {
    apiKey: string;
    keyId: string;
    modelId: string;
    qwenSettings: boolean;
};

function modelsForPurpose(purpose: CerebroModelPurpose): GroqModelDefinition[] {
    if (purpose === "diagnosis") return [GROQ_QWEN_MODEL];
    if (purpose === "vision") return [GROQ_QWEN_MODEL, GROQ_VISION_FALLBACK_MODEL];
    return [GROQ_QWEN_MODEL, GROQ_KIMI_MODEL];
}

export function buildGroqModelPlan(keys: string[], purpose: CerebroModelPurpose): GroqModelPlanEntry[] {
    return modelsForPurpose(purpose).flatMap((model) => keys.map((apiKey, index) => ({
        ...model,
        apiKey,
        keyId: `groq-${index + 1}`,
        modelId: model.id,
        qwenSettings: model.id === GROQ_QWEN_MODEL.id,
    })));
}

export function applyQwenGroqSettings(params: LanguageModelV3CallOptions): LanguageModelV3CallOptions {
    return {
        ...params,
        temperature: 0.6,
        topP: 0.95,
        providerOptions: {
            ...params.providerOptions,
            groq: {
                ...params.providerOptions?.groq,
                reasoningEffort: "default",
                reasoningFormat: "hidden",
            },
        },
    };
}

const qwenGroqMiddleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    transformParams: async ({ params }) => applyQwenGroqSettings(params),
};

export function buildGroqModelConfigurations(
    keys: string[],
    purpose: CerebroModelPurpose,
): FallbackModelConfig[] {
    return buildGroqModelPlan(keys, purpose).map((entry) => {
        const model = createGroq({ apiKey: entry.apiKey })(entry.modelId);
        return {
            instance: entry.qwenSettings
                ? wrapLanguageModel({ model, middleware: qwenGroqMiddleware })
                : model,
            label: entry.label,
            keyId: entry.keyId,
            modelId: entry.modelId,
        };
    });
}
