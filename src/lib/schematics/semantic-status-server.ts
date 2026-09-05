import 'server-only';
import { db } from '@/lib/db';
import { queryRag } from '@/lib/cerebro-v2/rag-db';
import { readSemanticStatus, type CurrentSemanticPage, type SemanticPageChunks, type SemanticWorkerRow } from './semantic-status';

/** Both databases are read independently; only current file/page hashes count. */
export function readLibrarySemanticStatus() {
  return readSemanticStatus(process.env, {
    pages: () => db.$queryRaw<CurrentSemanticPage[]>`
      SELECT p.asset_id AS "assetId", p.asset_sha256 AS "assetSha256",
        p.page_number AS page, p.content_sha256 AS "contentSha256"
      FROM schematics.pages p JOIN schematics.assets a ON a.id=p.asset_id
      WHERE p.asset_sha256=a.sha256 AND p.content_sha256 IS NOT NULL AND length(trim(p.content))>30`,
    vectors: async model => {
      const [tables] = await queryRag<{ chunks: string | null; worker: string | null }>(
        "SELECT to_regclass('schematics.chunks')::text AS chunks, to_regclass('schematics.vector_worker_status')::text AS worker", [],
      );
      if (!tables?.chunks) return { tableExists: false, chunks: [], worker: null };
      const [chunks, workers] = await Promise.all([
        queryRag<SemanticPageChunks>(`SELECT asset_id AS "assetId", asset_sha256 AS "assetSha256", page_number AS page,
          content_sha256 AS "contentSha256", count(*)::integer AS chunks
          FROM schematics.chunks WHERE embedding_model=$1
          GROUP BY asset_id,asset_sha256,page_number,content_sha256`, [model]),
        tables.worker ? queryRag<SemanticWorkerRow>('SELECT status,counters,updated_at AS "updatedAt" FROM schematics.vector_worker_status WHERE worker_key=$1', ['schematics']) : Promise.resolve([]),
      ]);
      return { tableExists: true, chunks, worker: workers[0] ?? null };
    },
  });
}
