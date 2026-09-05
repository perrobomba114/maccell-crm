export const SEMANTIC_REQUIRED_KEYS = ['DATABASE_URL', 'RAG_DATABASE_URL', 'RAG_INTERNAL_API_SECRET', 'SCHEMATICS_EMBEDDING_VERSION'] as const;
export type CurrentSemanticPage = { assetId: string; assetSha256: string; page: number; contentSha256: string };
export type SemanticPageChunks = CurrentSemanticPage & { chunks: number };
export type SemanticWorkerRow = { status: string; counters: unknown; updatedAt?: Date | string };
export type SemanticStatusDependencies = {
  pages(): Promise<CurrentSemanticPage[]>;
  vectors(model: string): Promise<{ tableExists: boolean; chunks: SemanticPageChunks[]; worker: SemanticWorkerRow | null }>;
};
export type SemanticIndexStatus = {
  status: 'not_configured' | 'unavailable' | 'not_indexed' | 'empty' | 'processing' | 'partial' | 'pending' | 'idle' | 'stopped';
  missingKeys: string[];
  indexablePages: number | null;
  pagesWithVectors: number | null;
  pagesWithoutVectors: number | null;
  currentChunks: number | null;
  workerStatus: 'processing' | 'partial' | 'idle' | 'failed' | 'stopped' | null;
  workerFailedPages: number | null;
  workerUpdatedAt: string | null;
};

const pageKey = (page: CurrentSemanticPage) => JSON.stringify([page.assetId, page.assetSha256, page.page, page.contentSha256]);

/** Observability only: never returns environment values, page text or provider errors. */
export async function readSemanticStatus(environment: Record<string, string | undefined>, dependencies: SemanticStatusDependencies): Promise<SemanticIndexStatus> {
  const missingKeys = SEMANTIC_REQUIRED_KEYS.filter(key => !environment[key]?.trim());
  const result: SemanticIndexStatus = {
    status: missingKeys.length ? 'not_configured' : 'unavailable', missingKeys,
    indexablePages: null, pagesWithVectors: null, pagesWithoutVectors: null, currentChunks: null,
    workerStatus: null, workerFailedPages: null, workerUpdatedAt: null,
  };
  const [source, target] = await Promise.allSettled([
    Promise.resolve().then(() => dependencies.pages()),
    missingKeys.length ? Promise.resolve(null) : Promise.resolve().then(() => dependencies.vectors(environment.SCHEMATICS_EMBEDDING_VERSION!)),
  ]);
  if (source.status === 'fulfilled') result.indexablePages = source.value.length;
  if (missingKeys.length) return result;
  if (source.status !== 'fulfilled' || target.status !== 'fulfilled' || !target.value) return result;
  const vectors = target.value;
  const currentPages = new Set(source.value.map(pageKey));
  const covered = new Set<string>();
  let currentChunks = 0;
  for (const chunk of vectors.chunks) {
    const key = pageKey(chunk);
    if (currentPages.has(key) && Number.isSafeInteger(chunk.chunks) && chunk.chunks > 0) {
      covered.add(key); currentChunks += chunk.chunks;
    }
  }
  result.pagesWithVectors = covered.size;
  result.pagesWithoutVectors = currentPages.size - covered.size;
  result.currentChunks = currentChunks;
  const worker = vectors.worker;
  const counters = worker?.counters;
  if (worker && counters && typeof counters === 'object' && 'model' in counters && counters.model === environment.SCHEMATICS_EMBEDDING_VERSION) {
    const allowed = ['processing', 'partial', 'idle', 'failed', 'stopped'] as const;
    result.workerStatus = allowed.find(status => status === worker.status) ?? null;
    if ('failed' in counters && typeof counters.failed === 'number' && Number.isSafeInteger(counters.failed) && counters.failed >= 0) result.workerFailedPages = counters.failed;
    if (worker.updatedAt) {
      const date = new Date(worker.updatedAt);
      if (Number.isFinite(date.getTime())) result.workerUpdatedAt = date.toISOString();
    }
  }
  result.status = !vectors.tableExists ? 'not_indexed'
    : result.workerStatus === 'processing' ? 'processing'
      : result.workerStatus === 'failed' || result.workerStatus === 'partial' || (result.workerFailedPages ?? 0) > 0 ? 'partial'
        : result.workerStatus === 'stopped' ? 'stopped'
          : !currentPages.size ? 'empty'
            : result.pagesWithoutVectors ? 'pending' : 'idle';
  return result;
}
