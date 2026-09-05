import type { SchematicAsset } from './catalog-types';
import type { RagCoverage } from './rag-library';

export const SEMANTIC_REQUIRED_KEYS = ['DATABASE_URL', 'RAG_DATABASE_URL', 'RAG_INTERNAL_API_SECRET'] as const;
export type CurrentSemanticPage = { assetId: string; assetSha256: string; page: number; contentSha256: string };
export type SemanticStatusDependencies = {
  source(): Promise<{ assets: SchematicAsset[]; pages: CurrentSemanticPage[] }>;
  vectors(assets: SchematicAsset[], explicitModel?: string): Promise<RagCoverage>;
};
export type SemanticIndexStatus = {
  status: 'not_configured' | 'unavailable' | 'not_indexed' | 'empty' | 'processing' | 'partial' | 'pending' | 'idle';
  source: 'cerebro_rag';
  missingKeys: string[];
  indexablePages: number | null;
  pagesWithVectors: number | null;
  pagesWithoutVectors: number | null;
  currentChunks: number | null;
  totalPdfDocuments: number | null;
  matchedDocuments: number | null;
  readyDocuments: number | null;
  failedDocuments: number | null;
  workerFailedPages: number | null;
  activeModel: string | null;
  dimensions: number | null;
};
const pageKey = (page: { assetId: string; assetSha256: string; page: number }) => JSON.stringify([page.assetId, page.assetSha256, page.page]);

/** Read-only diagnostics. Configuration values, page content and backend errors never leave this boundary. */
export async function readSemanticStatus(environment: Record<string, string | undefined>, dependencies: SemanticStatusDependencies): Promise<SemanticIndexStatus> {
  const missingKeys = SEMANTIC_REQUIRED_KEYS.filter(key => !environment[key]?.trim());
  const result: SemanticIndexStatus = {
    status: missingKeys.length ? 'not_configured' : 'unavailable', source: 'cerebro_rag', missingKeys,
    indexablePages: null, pagesWithVectors: null, pagesWithoutVectors: null, currentChunks: null,
    totalPdfDocuments: null, matchedDocuments: null, readyDocuments: null, failedDocuments: null,
    workerFailedPages: null, activeModel: null, dimensions: null,
  };
  try {
    const source = await dependencies.source();
    const assets = source.assets.filter(asset => asset.kind === 'pdf' && asset.status === 'ready');
    const hashes = new Map(assets.map(asset => [asset.id, asset.sha256]));
    const current = new Set(source.pages.filter(page => hashes.get(page.assetId) === page.assetSha256).map(pageKey));
    result.indexablePages = current.size;
    result.totalPdfDocuments = assets.length;
    if (!environment.RAG_DATABASE_URL?.trim()) return result;
    const vectors = await dependencies.vectors(assets, environment.SCHEMATICS_EMBEDDING_VERSION);
    const covered = new Set<string>();
    let failedPages = 0;
    let chunks = 0;
    for (const page of vectors.pages) {
      if (hashes.get(page.assetId) !== page.assetSha256 || !Number.isSafeInteger(page.page) || page.page < 1) continue;
      const key = pageKey(page);
      current.add(key);
      if (page.status === 'FAILED' || page.status === 'PARTIAL') failedPages++;
      if (vectors.model && page.status === 'READY' && page.documentStatus === 'READY' && Number.isSafeInteger(page.chunks) && page.chunks > 0 && !covered.has(key)) {
        covered.add(key); chunks += page.chunks;
      }
    }
    Object.assign(result, {
      indexablePages: current.size, pagesWithVectors: covered.size, pagesWithoutVectors: current.size - covered.size,
      currentChunks: chunks, workerFailedPages: failedPages,
      matchedDocuments: vectors.matchedDocuments, readyDocuments: vectors.readyDocuments, failedDocuments: vectors.failedDocuments,
      activeModel: vectors.model?.model_name ?? null, dimensions: vectors.model?.dimensions ?? null,
    });
    result.status = missingKeys.length ? 'not_configured' : !vectors.model ? 'not_indexed'
      : vectors.processingDocuments > 0 ? 'processing'
        : failedPages > 0 || vectors.failedDocuments > 0 ? 'partial'
          : !assets.length ? 'empty'
            : result.pagesWithoutVectors || vectors.readyDocuments < assets.length || !covered.size ? 'pending' : 'idle';
  } catch {
    // Preserve the technical count if the independent RAG database is unavailable.
    result.status = missingKeys.length ? 'not_configured' : 'unavailable';
  }
  return result;
}
