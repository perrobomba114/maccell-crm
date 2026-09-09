import { getGroqKeys } from "@/lib/groq";
import type { RagCoverageSnapshot } from "./health-status";
import { isTechnicalRagOperational } from "./health-status";
import { queryRag } from "./rag-db";

export type HealthCheck = { ok: boolean; message: string };
export type ProviderCheck = { configured: boolean; available: boolean; message: string };
export type ProviderHealth = {
    openRouter: ProviderCheck;
    groq: ProviderCheck;
    local: ProviderCheck;
    localVision: ProviderCheck;
};
export type CerebroHealth = {
    overall: "healthy" | "degraded";
    reasons: string[];
    rag: HealthCheck;
    coverage: HealthCheck;
    worker: HealthCheck;
    providers: ProviderHealth;
    textProvider: HealthCheck;
    visionProvider: HealthCheck;
};
export type CerebroHealthDependencies = {
    rag: () => Promise<HealthCheck>;
    coverage: () => Promise<HealthCheck>;
    worker: () => Promise<HealthCheck>;
    providers: () => Promise<ProviderHealth>;
};

function unavailable(message: string): ProviderCheck {
    return { configured: false, available: false, message };
}

async function probeProvider(
    configured: boolean,
    url: string,
    headers: Record<string, string>,
    messages: { ready: string; missing: string; failed: string },
): Promise<ProviderCheck> {
    if (!configured) return unavailable(messages.missing);
    try {
        const response = await fetch(url, {
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
        });
        return response.ok
            ? { configured: true, available: true, message: messages.ready }
            : { configured: true, available: false, message: messages.failed };
    } catch {
        return { configured: true, available: false, message: messages.failed };
    }
}

function localModelsUrl(baseUrl: string | undefined): string | null {
    if (!baseUrl) return null;
    try {
        const url = new URL(baseUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return `${url.toString().replace(/\/$/, "")}/models`;
    } catch {
        return null;
    }
}

async function probeProviders(): Promise<ProviderHealth> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const groqKeys = getGroqKeys();
    const localUrl = localModelsUrl(process.env.CEREBRO_LOCAL_AI_BASE_URL);
    const localVisionUrl = localModelsUrl(process.env.CEREBRO_LOCAL_VISION_BASE_URL);
    const [openRouter, groq, local, localVision] = await Promise.all([
        probeProvider(Boolean(openRouterKey), "https://openrouter.ai/api/v1/key",
            openRouterKey ? { Authorization: `Bearer ${openRouterKey}` } : {},
            { ready: "OpenRouter configurado y accesible; la inferencia se valida al consultar", missing: "OpenRouter no configurado", failed: "OpenRouter configurado pero su credencial no responde" }),
        probeGroqPool(groqKeys),
        probeProvider(Boolean(localUrl), localUrl ?? "http://127.0.0.1/models",
            process.env.CEREBRO_LOCAL_AI_KEY ? { Authorization: `Bearer ${process.env.CEREBRO_LOCAL_AI_KEY}` } : {},
            { ready: "IA local configurada y accesible; la inferencia se valida al consultar", missing: process.env.CEREBRO_LOCAL_AI_BASE_URL ? "Configuración de IA local inválida" : "IA local no configurada", failed: "IA local configurada pero no responde" }),
        probeProvider(Boolean(localVisionUrl), localVisionUrl ?? "http://127.0.0.1/models",
            process.env.CEREBRO_LOCAL_VISION_KEY ? { Authorization: `Bearer ${process.env.CEREBRO_LOCAL_VISION_KEY}` } : {},
            { ready: "Visión local configurada y accesible; el modelo se valida al analizar una imagen", missing: process.env.CEREBRO_LOCAL_VISION_BASE_URL ? "Configuración de visión local inválida" : "Visión local no configurada", failed: "Visión local configurada pero no responde" }),
    ]);
    return { openRouter, groq, local, localVision };
}

async function probeGroqPool(keys: string[]): Promise<ProviderCheck> {
    if (!keys.length) return unavailable("Groq no configurado");
    const checks = await Promise.all(keys.map((key) => probeProvider(
        true,
        "https://api.groq.com/openai/v1/models",
        { Authorization: `Bearer ${key}` },
        {
            ready: "Groq configurado y accesible; la inferencia se valida al consultar",
            missing: "Groq no configurado",
            failed: "Groq configurado pero sus credenciales no responden",
        },
    )));
    return checks.find((check) => check.available) ?? checks[0];
}

export function describeRagCoverage(snapshot: RagCoverageSnapshot): HealthCheck {
    if (isTechnicalRagOperational(snapshot)) return { ok: true, message: "Cobertura RAG completa" };
    if (snapshot.status !== "idle") return { ok: false, message: `Indexación RAG en estado ${snapshot.status}` };
    if (snapshot.totalPdfDocuments === null || snapshot.readyDocuments === null) {
        return { ok: false, message: "Cobertura RAG sin métricas de documentos" };
    }
    if (snapshot.readyDocuments !== snapshot.totalPdfDocuments) {
        return { ok: false, message: `Cobertura incompleta: ${snapshot.readyDocuments} de ${snapshot.totalPdfDocuments} PDF listos` };
    }
    if (snapshot.matchedDocuments !== snapshot.totalPdfDocuments) {
        return { ok: false, message: `Cobertura incompleta: ${snapshot.matchedDocuments ?? 0} de ${snapshot.totalPdfDocuments} PDF vinculados al índice` };
    }
    if (snapshot.pagesWithVectors !== snapshot.indexablePages) {
        return { ok: false, message: `Cobertura incompleta: ${snapshot.pagesWithVectors ?? 0} de ${snapshot.indexablePages ?? 0} páginas vectorizadas` };
    }
    if (snapshot.dimensions !== 1024) return { ok: false, message: "Embeddings RAG con dimensión incompatible" };
    return { ok: false, message: "Cobertura RAG incompleta" };
}

const defaultDependencies: CerebroHealthDependencies = {
    rag: async () => {
        await queryRag<{ ok: number }>("SELECT 1 AS ok", []);
        return { ok: true, message: "Base RAG disponible" };
    },
    coverage: async () => {
        const { readLibrarySemanticStatus } = await import("@/lib/schematics/semantic-status-server");
        return describeRagCoverage(await readLibrarySemanticStatus());
    },
    worker: async () => {
        const workerUrl = process.env.RAG_WORKER_URL ?? "http://maccell-rag-worker:8080";
        const response = await fetch(`${workerUrl}/health`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
        });
        return response.ok
            ? { ok: true, message: "Worker RAG disponible" }
            : { ok: false, message: "Worker RAG respondió con error" };
    },
    providers: probeProviders,
};

async function safeCheck(check: () => Promise<HealthCheck>, fallback: string): Promise<HealthCheck> {
    try { return await check(); } catch { return { ok: false, message: fallback }; }
}

export async function checkCerebroHealth(
    dependencies: CerebroHealthDependencies = defaultDependencies,
): Promise<CerebroHealth> {
    const [rag, coverage, worker, providers] = await Promise.all([
        safeCheck(dependencies.rag, "Base RAG no disponible"),
        safeCheck(dependencies.coverage, "No se pudo comprobar la cobertura RAG"),
        safeCheck(dependencies.worker, "Worker RAG no disponible"),
        dependencies.providers().catch(() => ({
            openRouter: unavailable("No se pudo comprobar OpenRouter"),
            groq: unavailable("No se pudo comprobar Groq"),
            local: unavailable("No se pudo comprobar IA local"),
            localVision: unavailable("No se pudo comprobar visión local"),
        })),
    ]);
    const availableText = [providers.openRouter, providers.groq, providers.local]
        .filter((provider) => provider.available).map((provider) => provider.message);
    const availableVision = [providers.openRouter, providers.groq, providers.localVision]
        .filter((provider) => provider.available).map((provider) => provider.message);
    const textProvider = availableText.length
        ? { ok: true, message: `Proveedores de texto accesibles: ${availableText.join(", ")}` }
        : { ok: false, message: "Ningún proveedor de texto está accesible" };
    const visionProvider = availableVision.length
        ? { ok: true, message: `Proveedores con ruta de visión accesibles: ${availableVision.join(", ")}` }
        : { ok: false, message: "Ninguna ruta de proveedor de visión está accesible" };
    const overall = rag.ok && textProvider.ok ? "healthy" : "degraded";
    const reasons = [rag, coverage, worker, textProvider, visionProvider]
        .filter((check) => !check.ok).map((check) => check.message);
    for (const provider of Object.values(providers)) {
        if (provider.configured && !provider.available) reasons.push(provider.message);
    }
    return { overall, reasons: [...new Set(reasons)], rag, coverage, worker, providers, textProvider, visionProvider };
}
