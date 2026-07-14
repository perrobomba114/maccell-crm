import { createOpenAI } from "@ai-sdk/openai";

type LocalModelEnvironment = {
    baseUrl?: string;
    model?: string;
    apiKey?: string;
};

export type LocalModelConfig = { baseUrl: string; model: string; apiKey: string };

function isPrivateHost(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1"
        || hostname.startsWith("10.") || hostname.startsWith("192.168.")
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
        || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname);
}

export function parseLocalModelConfig(environment: LocalModelEnvironment): LocalModelConfig | null {
    if (!environment.baseUrl) return null;
    const url = new URL(environment.baseUrl);
    if (!isPrivateHost(url.hostname)) throw new Error("CEREBRO_LOCAL_AI_BASE_URL must use a private host");
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("CEREBRO_LOCAL_AI_BASE_URL must use HTTP(S)");
    return { baseUrl: url.toString().replace(/\/$/, ""), model: environment.model ?? "unsloth/Qwen3.6-27B-MTP-GGUF", apiKey: environment.apiKey ?? "EMPTY" };
}

export function providerOrder(input: { baseUrl?: string; hasGroq: boolean }): string[] {
    return [...(input.baseUrl ? ["local"] : []), ...(input.hasGroq ? ["groq"] : [])];
}

export function createLocalCerebroModel(environment: LocalModelEnvironment = {
    baseUrl: process.env.CEREBRO_LOCAL_AI_BASE_URL,
    model: process.env.CEREBRO_LOCAL_AI_MODEL,
    apiKey: process.env.CEREBRO_LOCAL_AI_KEY,
}) {
    const config = parseLocalModelConfig(environment);
    if (!config) return null;
    return createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey })(config.model);
}
