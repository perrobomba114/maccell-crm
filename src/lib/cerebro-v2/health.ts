import { getGroqKeys } from "@/lib/groq";

import { queryRag } from "./rag-db";

type HealthCheck = { ok: boolean; message: string };

export type CerebroHealth = {
    overall: "healthy" | "degraded";
    rag: HealthCheck;
    worker: HealthCheck;
    textProvider: HealthCheck;
    visionProvider: HealthCheck;
};

export type CerebroHealthDependencies = {
    rag: () => Promise<boolean>;
    worker: () => Promise<boolean>;
    textProvider: () => boolean;
    visionProvider: () => boolean;
};

const defaultDependencies: CerebroHealthDependencies = {
    rag: async () => {
        const rows = await queryRag<{ ok: number }>("SELECT 1 AS ok", []);
        return rows[0]?.ok === 1;
    },
    worker: async () => {
        const workerUrl = process.env.RAG_WORKER_URL ?? "http://maccell-rag-worker:8080";
        const response = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5_000) });
        return response.ok;
    },
    textProvider: () => getGroqKeys().length > 0 || Boolean(process.env.OPENROUTER_API_KEY),
    visionProvider: () => getGroqKeys().length > 0 && Boolean(
        process.env.CEREBRO_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
    ),
};

async function resolveCheck(
    check: () => boolean | Promise<boolean>,
    healthyMessage: string,
    failureMessage: string,
): Promise<HealthCheck> {
    try {
        return await check()
            ? { ok: true, message: healthyMessage }
            : { ok: false, message: failureMessage };
    } catch {
        return { ok: false, message: failureMessage };
    }
}

export async function checkCerebroHealth(
    dependencies: CerebroHealthDependencies = defaultDependencies,
): Promise<CerebroHealth> {
    const [rag, worker, textProvider, visionProvider] = await Promise.all([
        resolveCheck(dependencies.rag, "Base RAG disponible", "Base RAG no disponible"),
        resolveCheck(dependencies.worker, "Worker RAG disponible", "Worker RAG no disponible"),
        resolveCheck(dependencies.textProvider, "IA de texto configurada", "IA de texto no configurada"),
        resolveCheck(dependencies.visionProvider, "Visión configurada", "Visión no configurada"),
    ]);
    return {
        overall: rag.ok && worker.ok && textProvider.ok && visionProvider.ok ? "healthy" : "degraded",
        rag,
        worker,
        textProvider,
        visionProvider,
    };
}
