import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { SchematicAsset } from './catalog-types';
import type { ReferenceBox } from './unified-index';
import { containsReference } from './linked-navigation';
import { CURRENT_RAG_DOCUMENTS_SQL, ragAssetManifest, type RagQuery } from './rag-library';

type ReferenceMatch = { page: number; excerpt: string; boxes?: ReferenceBox[] };
type RagReferenceRow = { asset_sha256: string; page_number: number | null; excerpt: string | null; source: 'text' | 'ocr' | null };

/** The catalog fingerprint alone cannot rule out an unregistered physical replacement. */
export async function currentReferenceFile(asset: SchematicAsset, libraryRoot: string): Promise<boolean> {
  const root = await realpath(libraryRoot);
  const file = await realpath(path.join(root, asset.relativePath));
  if (!file.startsWith(root + path.sep)) throw new Error('Archivo fuera de la biblioteca');
  const before = await stat(file);
  if (!before.isFile() || before.size !== asset.size) return false;
  const digest = createHash('sha256');
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  const after = await stat(file);
  return before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs
    && digest.digest('hex') === asset.sha256;
}

/** Reuse existing extracted text; this operation neither embeds nor generates coordinates. */
export async function readRagReferenceMatches(query: RagQuery, asset: SchematicAsset, term: string) {
  const manifest = ragAssetManifest([asset]);
  if (!manifest.length || term.length < 2 || term.length > 100) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = `(.{0,65}(?:^|[^A-Za-z0-9_])${escaped}(?:$|[^A-Za-z0-9_]).{0,100})`;
  const rows = await query<RagReferenceRow>(`${CURRENT_RAG_DOCUMENTS_SQL}, matched_pages AS (
    SELECT d.asset_id,p.page_number,
      (regexp_match(p.extracted_text,$2,'is'))[1] AS excerpt,
      CASE WHEN p.extraction_method='OCR' THEN 'ocr' ELSE 'text' END AS source
    FROM documents d JOIN rag_pages p ON p.document_id=d.id
    WHERE d.status='READY' AND p.status='READY' AND p.extraction_method IN ('NATIVE','OCR')
  ), hits AS (
    SELECT * FROM matched_pages WHERE excerpt IS NOT NULL ORDER BY page_number LIMIT 50
  )
  SELECT d.asset_sha256,h.page_number,h.excerpt,h.source
  FROM documents d LEFT JOIN hits h ON h.asset_id=d.asset_id
  WHERE d.status='READY' ORDER BY h.page_number`, [JSON.stringify(manifest), pattern]);
  if (!rows.some(row => row.asset_sha256 === asset.sha256)) return null;
  const valid = rows.filter(row => row.asset_sha256 === asset.sha256 && row.page_number !== null
    && Number.isSafeInteger(row.page_number) && row.page_number > 0 && row.excerpt !== null
    && containsReference(row.excerpt, term) && (row.source === 'text' || row.source === 'ocr'));
  return {
    matches: valid.map(row => ({ page: row.page_number!, excerpt: row.excerpt! })),
    sources: [...new Set(valid.map(row => row.source!))],
  };
}

export function mergeReferenceMatches(primary: ReferenceMatch[], supplemental: ReferenceMatch[]): ReferenceMatch[] {
  const pages = new Map(supplemental.map(match => [match.page, match]));
  for (const match of primary) pages.set(match.page, match);
  return [...pages.values()].sort((a, b) => a.page - b.page).slice(0, 50);
}
