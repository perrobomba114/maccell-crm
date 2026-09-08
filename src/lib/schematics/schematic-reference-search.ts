import type { SchematicAsset } from './catalog-types';
import { schematicCandidates } from './pairing';
import { indexReferenceMatches, type TechnicalPage } from './unified-index';

/** Search only electrical schematics of the current board, never unrelated model PDFs. */
export async function searchSchematicReferences(
  anchor: SchematicAsset, currentId: string, catalog: SchematicAsset[], term: string,
  pagesFor: (asset:SchematicAsset)=>Promise<TechnicalPage[]>, signal?:AbortSignal,
) {
  for (const asset of schematicCandidates(anchor,catalog).filter(asset=>asset.id!==currentId)) {
    signal?.throwIfAborted();
    const pages = await pagesFor(asset);
    const matches = indexReferenceMatches(pages,term);
    if (matches.length) return {asset,matches,sources:[...new Set(pages.map(page=>page.source))]};
  }
  return null;
}
