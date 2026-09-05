import { createHash } from 'node:crypto';
import type { SchematicAsset } from './catalog-types';
import type { SearchablePage, SemanticRow } from './search';

export type RagQuery = <T extends Record<string, unknown>>(sql: string, params: readonly unknown[]) => Promise<T[]>;
export type RagModel = { id: string; model_name: string; dimensions: number };
export type RagCoveragePage = { assetId: string; assetSha256: string; page: number; chunks: number; status: string; documentStatus: string };
export type RagCoverage = { model: RagModel | null; pages: RagCoveragePage[]; matchedDocuments: number; readyDocuments: number; failedDocuments: number; processingDocuments: number };

/** The sources/ mount prefix is the only path transformation; names never prove identity. */
export function ragAssetManifest(assets: SchematicAsset[]) {
  return assets.flatMap(asset => {
    const relative_path = asset.relativePath.replace(/^sources\//, '');
    if (asset.kind !== 'pdf' || asset.status !== 'ready' || !/^[a-f0-9]{64}$/.test(asset.sha256)
      || relative_path.includes('\\') || relative_path.split('/').some(part => !part || part === '.' || part === '..')) return [];
    return [{ asset_id: asset.id, asset_sha256: asset.sha256, relative_path }];
  });
}

export async function readRagModel(query: RagQuery, explicitModel?: string): Promise<RagModel | null> {
  const rows = await query<RagModel>('SELECT id::text,model_name,dimensions FROM rag_model_versions WHERE active=true', []);
  if (!rows.length) return null;
  if (rows.length !== 1 || rows[0].dimensions !== 1024 || !rows[0].model_name.trim()
    || (explicitModel?.trim() && rows[0].model_name !== explicitModel.trim())) throw new Error('RAG model configuration mismatch');
  return rows[0];
}

export const CURRENT_RAG_DOCUMENTS_SQL = `WITH current_assets AS (
  SELECT * FROM jsonb_to_recordset($1::jsonb) AS a(asset_id text,asset_sha256 text,relative_path text)
), documents AS (
  SELECT DISTINCT ON (a.asset_id) a.asset_id,a.asset_sha256,d.id,d.status
  FROM current_assets a JOIN rag_documents d ON d.relative_path=a.relative_path AND d.sha256=a.asset_sha256
  WHERE d.source_type='PDF' AND d.retired_at IS NULL
  ORDER BY a.asset_id,d.updated_at DESC,d.id
)`;

export async function readRagCoverage(query: RagQuery, assets: SchematicAsset[], explicitModel?: string): Promise<RagCoverage> {
  const model = await readRagModel(query, explicitModel);
  const manifest = JSON.stringify(ragAssetManifest(assets));
  const [documents, pages] = await Promise.all([
    query<{ status: string; count: number }>(`${CURRENT_RAG_DOCUMENTS_SQL} SELECT status,count(*)::integer AS count FROM documents GROUP BY status`, [manifest]),
    query<RagCoveragePage>(`${CURRENT_RAG_DOCUMENTS_SQL}
      SELECT d.asset_id AS "assetId",d.asset_sha256 AS "assetSha256",p.page_number AS page,
        p.status::text AS status,d.status::text AS "documentStatus",
        count(c.id) FILTER (WHERE d.status='READY' AND p.status='READY')::integer AS chunks
      FROM documents d JOIN rag_pages p ON p.document_id=d.id
      LEFT JOIN rag_chunks c ON c.page_id=p.id AND c.document_id=d.id
        AND c.model_version_id=$2::uuid AND c.embedding IS NOT NULL
        AND EXISTS (SELECT 1 FROM rag_model_versions m WHERE m.id=c.model_version_id AND m.active=true)
      WHERE length(trim(p.extracted_text))>30 OR p.status IN ('FAILED','PARTIAL','RUNNING','PENDING','RETRYING')
      GROUP BY d.asset_id,d.asset_sha256,p.page_number,p.status,d.status`, [manifest, model?.id ?? null]),
  ]);
  const count = (statuses: string[]) => documents.reduce((sum, row) => sum + (statuses.includes(row.status) ? row.count : 0), 0);
  return { model, pages, matchedDocuments: count(['READY','FAILED','PARTIAL','RUNNING','PENDING','RETRYING']), readyDocuments: count(['READY']), failedDocuments: count(['FAILED','PARTIAL']), processingDocuments: count(['RUNNING','RETRYING']) };
}

type RagSearchRow = SemanticRow & { page_text: string };
/** Uses existing RAG page text as the digest authority; CRM's extractor can differ. */
export async function searchRagLibrary(query: RagQuery, assets: SchematicAsset[], embedding: number[], model: RagModel, minimumScore: number) {
  if (embedding.length !== model.dimensions || embedding.some(value => !Number.isFinite(value))) throw new Error('Invalid RAG embedding');
  const rows = await query<RagSearchRow>(`${CURRENT_RAG_DOCUMENTS_SQL}
    SELECT d.asset_id,d.asset_sha256,p.page_number,p.extracted_text AS page_text,c.content,
      CASE WHEN p.extraction_method='OCR' THEN 'ocr' ELSE 'text' END AS source,
      1-(c.embedding <=> $2::vector) AS score
    FROM documents d JOIN rag_pages p ON p.document_id=d.id
    JOIN rag_chunks c ON c.page_id=p.id AND c.document_id=d.id
    JOIN rag_model_versions m ON m.id=c.model_version_id AND m.active=true
    WHERE d.status='READY' AND p.status='READY' AND m.id=$3::uuid AND m.dimensions=1024
      AND c.embedding IS NOT NULL AND 1-(c.embedding <=> $2::vector)>=$4
    ORDER BY c.embedding <=> $2::vector LIMIT 40`,
  [JSON.stringify(ragAssetManifest(assets)), `[${embedding.join(',')}]`, model.id, minimumScore]);
  const pages: SearchablePage[] = [];
  const matches: SemanticRow[] = [];
  for (const row of rows) {
    const asset = assets.find(candidate => candidate.id === row.asset_id && candidate.sha256 === row.asset_sha256);
    if (!asset || !Number.isSafeInteger(row.page_number) || row.page_number < 1 || !Number.isFinite(row.score)
      || !row.content.trim() || !row.page_text.replace(/\s+/g, ' ').includes(row.content.replace(/\s+/g, ' '))) continue;
    const digest = createHash('sha256').update(row.page_text).digest('hex');
    pages.push({ asset, page: row.page_number, text: row.page_text, source: row.source, contentSha256: digest });
    matches.push({ asset_id: row.asset_id, asset_sha256: row.asset_sha256, page_number: row.page_number,
      source: row.source, score: row.score, content: row.content, content_sha256: digest });
  }
  return { pages, rows: matches };
}
