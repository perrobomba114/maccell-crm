import 'server-only';
import { databasePages } from './database';
import { readTechnicalIndex } from './index-store';
import { sameDevice, type SchematicAsset } from './catalog-types';
import { assetPriority, contentPairEvidence, pairIsVerified, preferredCounterpart } from './pairing';

export async function resolvePairings(anchor: SchematicAsset, catalog: SchematicAsset[]) {
  const assets = catalog.filter(asset=>asset.id!==anchor.id && asset.kind!==anchor.kind && sameDevice(anchor,asset))
    .sort((a,b)=>assetPriority(a)-assetPriority(b) || a.name.localeCompare(b.name,'es',{numeric:true}));
  const evidence: Record<string,string> = {};
  for (const asset of assets) {
    if (pairIsVerified(anchor,asset)) { evidence[asset.id]='Compatibilidad confirmada'; continue; }
    const board = anchor.kind==='pcbe' ? anchor : asset;
    const pdf = anchor.kind==='pdf' ? anchor : asset;
    // Do not read a large index unless both filenames declare this exact model.
    if (!contentPairEvidence(board,pdf,`${pdf.name} ${board.name}`)) continue;
    const pages = await databasePages(pdf.id,pdf.sha256) ?? (await readTechnicalIndex(pdf))?.pages ?? [];
    if (!contentPairEvidence(board,pdf,pages.map(page=>page.text).join('\n'))) continue;
    const reason = pages.map(page=>contentPairEvidence(board,pdf,page.text)).find(Boolean);
    if (reason) evidence[asset.id]=reason;
  }
  return {assets,verifiedIds:Object.keys(evidence),evidence,recommendedId:preferredCounterpart(assets.filter(asset=>evidence[asset.id]))?.id ?? null};
}
