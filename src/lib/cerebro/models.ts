"use client";

export const TEXT_MODELS = [
    { label: 'Kimi K2', id: 'moonshotai/kimi-k2-instruct' },
    { label: 'Llama 3.3 70B', id: 'llama-3.3-70b-versatile' },
];
export const VISION_MODEL = { label: 'Llama 3.2 11B Vision', id: 'llama-3.2-11b-vision-preview' };

type FallbackModelConfig = {
    instance: unknown;
    label: string;
    keyId: string;
    [key: string]: unknown;
};

type ModelExecutor = {
    doGenerate: (params: unknown) => Promise<{
        finishReason?: unknown;
        [key: string]: unknown;
    }>;
    doStream: (params: unknown) => Promise<{
        stream: ReadableStream<Record<string, unknown>>;
        [key: string]: unknown;
    }>;
};

type UnifiedFinishReason = {
    unified?: string;
};

function normalizeFinishReason(result: { finishReason?: unknown }) {
    if (result.finishReason && typeof result.finishReason === 'object') {
        result.finishReason = (result.finishReason as UnifiedFinishReason).unified || 'stop';
    }
}

function getExecutor(instance: unknown): ModelExecutor {
    if (
        instance &&
        typeof instance === "object" &&
        "doGenerate" in instance &&
        "doStream" in instance &&
        typeof instance.doGenerate === "function" &&
        typeof instance.doStream === "function"
    ) {
        return instance as ModelExecutor;
    }

    throw new Error("Invalid fallback model instance");
}

export function createFallbackModel(configs: FallbackModelConfig[], onSelect: (info: FallbackModelConfig) => void) {
    if (configs.length === 0) throw new Error("No model configs provided");
    return {
        specificationVersion: 'v2',
        provider: 'cerebro-fallback',
        modelId: 'fallback-logic',
        doGenerate: async (params: unknown) => {
            let lastErr: unknown;
            for (const config of configs) {
                try {
                    onSelect(config);
                    const result = await getExecutor(config.instance).doGenerate(params);
                    normalizeFinishReason(result);
                    return result;
                } catch (e) {
                    lastErr = e;
                    continue;
                }
            }
            throw lastErr;
        },
        doStream: async (params: unknown) => {
            let lastErr: unknown;
            for (const config of configs) {
                try {
                    onSelect(config);
                    const result = await getExecutor(config.instance).doStream(params);

                    const originalStream = result.stream;
                    const transformedStream = new ReadableStream({
                        async start(controller) {
                            const reader = originalStream.getReader();
                            try {
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;

                                    if (value.type === 'finish') {
                                        normalizeFinishReason(value);
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
