import { createGroq } from "@ai-sdk/groq";

type GroqKeyEnvironment = Record<string, string | undefined>;

export function getGroqKeys(environment: GroqKeyEnvironment = process.env): string[] {
    const keys = new Set<string>();

    // Acepta el nombre histórico y el pool numerado GROQ_API_KEY_1..N.
    const mainKey = environment.GROQ_API_KEY;
    if (mainKey && mainKey.length > 10) keys.add(mainKey);

    for (let i = 1; i <= 50; i++) {
        const key = environment[`GROQ_API_KEY_${i}`];
        if (key && key.length > 10) {
            keys.add(key);
        }
    }

    return [...keys];
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
