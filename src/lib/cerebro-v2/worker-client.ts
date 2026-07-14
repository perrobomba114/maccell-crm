const EMBEDDING_DIMENSIONS = 1024;

type WorkerEmbeddingResponse = { embedding?: unknown };

function workerConfiguration(): { url: string; secret: string } {
    const secret = process.env.RAG_INTERNAL_API_SECRET;
    if (!secret) throw new Error("RAG_INTERNAL_API_SECRET is required");
    return {
        url: process.env.RAG_WORKER_URL ?? "http://maccell-rag-worker:8080",
        secret,
    };
}

export async function requestQueryEmbedding(
    text: string,
    fetchImplementation: typeof fetch = fetch,
): Promise<number[]> {
    const worker = workerConfiguration();
    const response = await fetchImplementation(`${worker.url}/internal/embed`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${worker.secret}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`RAG worker embedding failed (${response.status})`);
    const payload = (await response.json()) as WorkerEmbeddingResponse;
    if (
        !Array.isArray(payload.embedding)
        || payload.embedding.length !== EMBEDDING_DIMENSIONS
        || payload.embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
        throw new Error("RAG worker returned an invalid embedding");
    }
    return payload.embedding as number[];
}

export function ragDocumentUrl(documentId: string): string {
    return `${workerConfiguration().url}/internal/documents/${encodeURIComponent(documentId)}`;
}

export function ragWorkerAuthorization(): string {
    return `Bearer ${workerConfiguration().secret}`;
}
