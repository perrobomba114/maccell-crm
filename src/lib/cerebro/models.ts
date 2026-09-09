
export type FallbackModelConfig = {
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

function normalizeFinishReason(result: { finishReason?: unknown }) {
    if (typeof result.finishReason === 'string') {
        const raw = result.finishReason;
        result.finishReason = {
            unified: raw === 'length' ? 'length' : raw === 'tool-calls' ? 'tool-calls' : raw === 'content-filter' ? 'content-filter' : raw === 'error' ? 'error' : raw === 'stop' ? 'stop' : 'other',
            raw,
        };
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

function isRateLimitError(error: unknown): boolean {
    const record = error && typeof error === "object"
        ? error as Record<string, unknown>
        : null;
    const response = record?.response && typeof record.response === "object"
        ? record.response as Record<string, unknown>
        : null;
    const status = record?.statusCode ?? record?.status ?? response?.status;

    return status === 429 || error instanceof Error && /\b429\b/.test(error.message);
}

const isGroqConfig = (config: FallbackModelConfig): boolean => config.keyId.startsWith("groq-");

function requireRequestedJson(params: unknown, result: { [key: string]: unknown }) {
    const format=params && typeof params==='object' && 'responseFormat' in params ? params.responseFormat : null;
    if (!format || typeof format!=='object' || !('type' in format) || format.type!=='json') return;
    const reason=result.finishReason;
    const finish=typeof reason==='object' && reason && 'unified' in reason ? reason.unified : reason;
    const text=Array.isArray(result.content) ? result.content.flatMap(part=>
        part && typeof part==='object' && part.type==='text' && typeof part.text==='string' ? [part.text] : []).join('') : '';
    if (finish==='length' || !text.trim()) throw new Error(`Structured output incomplete: finish=${String(finish)} chars=${text.length}`);
    try {JSON.parse(text);} catch {throw new Error(`Structured output invalid JSON: chars=${text.length}`);}
}

export function createFallbackModel(configs: FallbackModelConfig[], onSelect: (info: FallbackModelConfig) => void) {
    if (configs.length === 0) throw new Error("No model configs provided");
    return {
        specificationVersion: 'v3',
        provider: 'cerebro-fallback',
        modelId: 'fallback-logic',
        supportedUrls: { 'image/*': [/^https?:\/\/.+$/] },
        doGenerate: async (params: unknown) => {
            let lastErr: unknown;
            let groqRateLimited = false;
            for (const config of configs) {
                if (groqRateLimited && isGroqConfig(config)) continue;
                try {
                    onSelect(config);
                    const result = await getExecutor(config.instance).doGenerate(params);
                    normalizeFinishReason(result);
                    requireRequestedJson(params, result);
                    return result;
                } catch (e) {
                    lastErr = e;
                    if (isRateLimitError(e) && isGroqConfig(config)) groqRateLimited = true;
                    const message = e instanceof Error ? e.message : String(e);
                    console.warn(`[CEREBRO] Provider ${config.keyId} failed: ${message.slice(0, 160)}`);
                    continue;
                }
            }
            throw lastErr;
        },
        doStream: async (params: unknown) => {
            let lastErr: unknown;
            let groqRateLimited = false;
            for (const config of configs) {
                if (groqRateLimited && isGroqConfig(config)) continue;
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
                    if (isRateLimitError(e) && isGroqConfig(config)) groqRateLimited = true;
                    const message = e instanceof Error ? e.message : String(e);
                    console.warn(`[CEREBRO] Provider ${config.keyId} failed: ${message.slice(0, 160)}`);
                    continue;
                }
            }
            throw lastErr;
        }
    };
}
