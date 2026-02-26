import { createGroq } from "@ai-sdk/groq";

export function getGroqKeys(): string[] {
    const keys: string[] = [];

    // Buscar GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, ...
    const mainKey = process.env.GROQ_API_KEY;
    if (mainKey && mainKey.length > 10) keys.push(mainKey);

    for (let i = 2; i <= 50; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.length > 10) {
            keys.push(key);
        }
    }

    return keys;
}

export async function runWithGroqFallback<T>(task: (groq: ReturnType<typeof createGroq>) => Promise<T>): Promise<T> {
    const keys = getGroqKeys();
    let lastError;

    for (const key of keys) {
        try {
            const groq = createGroq({ apiKey: key });
            return await task(groq);
        } catch (e) {
            lastError = e;
            console.warn(`[GROQ] Key ending in ${key.slice(-4)} failed, trying next...`);
        }
    }

    throw lastError || new Error("No GROQ keys available or all failed.");
}
