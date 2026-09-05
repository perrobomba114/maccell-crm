import { createHash } from 'node:crypto';

export interface VectorPage {
  asset_id: string; sha256: string; content_sha256: string; model_key: string;
  page_number: number; content: string; source: string;
}
export interface VectorChunk { id: string; content: string; embedding: number[] }
export interface VectorStore {
  existing(page: VectorPage, model: string): Promise<Set<string>>;
  refresh(page: VectorPage, model: string, ids: string[]): Promise<void>;
  insert(chunk: VectorChunk, page: VectorPage, model: string): Promise<void>;
}
export function semanticConfiguration(environment: Record<string, string | undefined>) {
  const required = ['DATABASE_URL', 'RAG_DATABASE_URL', 'RAG_INTERNAL_API_SECRET', 'SCHEMATICS_EMBEDDING_VERSION'] as const;
  const missing = required.filter(key => !environment[key]?.trim());
  if (missing.length) throw new Error(`Falta configuración semántica: ${missing.join(', ')}`);
  let endpoint: URL;
  try { endpoint = new URL(environment.RAG_WORKER_URL ?? 'http://maccell-rag-worker:8080'); }
  catch { throw new Error('RAG_WORKER_URL debe ser una URL HTTP válida'); }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error('RAG_WORKER_URL debe ser HTTP sin credenciales en la URL');
  return { source: environment.DATABASE_URL!, target: environment.RAG_DATABASE_URL!, secret: environment.RAG_INTERNAL_API_SECRET!, model: environment.SCHEMATICS_EMBEDDING_VERSION!, endpoint: `${endpoint.toString().replace(/\/$/, '')}/internal/embed` };
}

/** Commit chunks independently, so failed requests can resume without replacing good vectors. */
export async function indexVectorPage(page: VectorPage, model: string, store: VectorStore, embed: (content: string) => Promise<number[]>, signal?: AbortSignal, progress?: (status: 'indexed' | 'cached') => void) {
  const existing = await store.existing(page, model);
  const cachedIds: string[] = [];
  const summary = { indexed: 0, cached: 0 };
  for (let start = 0; start < page.content.length; start += 1500) {
    signal?.throwIfAborted();
    const content = page.content.slice(start, start + 1800);
    const id = createHash('sha256').update(`${model}:${page.asset_id}:${page.sha256}:${page.page_number}:${start}:${content}`).digest('hex');
    if (existing.has(id)) { cachedIds.push(id); summary.cached++; progress?.('cached'); continue; }
    const embedding = await embed(content);
    signal?.throwIfAborted();
    await store.insert({ id, content, embedding }, page, model);
    summary.indexed++; progress?.('indexed');
  }
  if (cachedIds.length) await store.refresh(page, model, cachedIds);
  return summary;
}
