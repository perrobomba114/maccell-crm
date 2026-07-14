export type CerebroProvider = {
    kind: "groq" | "openrouter";
    apiKey: string;
    label: string;
    maxRetries: 0;
};

type ProviderProbe = (provider: CerebroProvider) => Promise<void>;

export async function selectCerebroProvider(
    groqKeys: readonly string[],
    openRouterKey: string | undefined,
    probe: ProviderProbe,
): Promise<CerebroProvider> {
    for (const apiKey of groqKeys) {
        const candidate: CerebroProvider = { kind: "groq", apiKey, label: "Groq", maxRetries: 0 };
        try {
            await probe(candidate);
            return candidate;
        } catch {
            // The next configured key is probed without logging key material.
        }
    }
    if (openRouterKey) {
        const fallback: CerebroProvider = {
            kind: "openrouter",
            apiKey: openRouterKey,
            label: "OpenRouter",
            maxRetries: 0,
        };
        try {
            await probe(fallback);
            return fallback;
        } catch {
            // A sanitized error is returned below.
        }
    }
    throw new Error("No hay un proveedor de IA disponible");
}
