import { identityKey, sameDevice, verifiedSameDevice, type SchematicAsset } from './catalog-types';

/** Read a model explicitly declared by a filename/document, never its directory. */
export function declaredModel(text: string): string | null {
  const match = text.match(/\biphone[\s_-]*(\d{1,2})(?:[\s_-]*(pro[\s_-]*max|pro|plus|mini))?(?![a-z0-9])/i);
  return match ? identityKey(`iphone${match[1]}${match[2] ?? ''}`) : null;
}
export function catalogQuery(value: string): string {
  return value.replace(/\b(?:iphone[\s_-]*)?(\d{1,2})\s*(pm|pro\s*max)\b/gi, 'iphone $1 pro max');
}
export function documentRole(asset: SchematicAsset): 'schematic' | 'board' | 'accessory' | 'repair' | 'document' {
  const name = asset.name.toLowerCase();
  if (/repair.?case|case.?repair|malfunction|fault|failure|common.?issue/.test(name)) return 'repair';
  if (/flexible|flat.?cable|face.?id|front.?camera|flex\b/.test(name)) return 'accessory';
  if (asset.kind === 'pcbe') return 'board';
  // A combined schematic + layout still contains the electrical schematic.
  if (/schematic|esquem[aá]tico|circuit.?diagram|diagrama.?de.?circuito|(?:^|[ _-])sch(?:[ _-]|\.pdf$)/i.test(name)) return 'schematic';
  // A rendered board image/layout alone is not an electrical schematic.
  if (/\b(?:image|board.?view|pcb.?layer|board.?image|layout)\b/.test(name)) return 'document';
  return 'document';
}
export const roleLabels = {schematic:'Esquema',board:'Placa',accessory:'Flex / accesorio',repair:'Caso de reparación',document:'Documento'};
export function assetPriority(asset: SchematicAsset): number {
  return {schematic:0,board:1,accessory:2,document:3,repair:4}[documentRole(asset)];
}
export function preferredCounterpart(compatible: SchematicAsset[]): SchematicAsset | null {
  const seen = new Set<string>();
  const primary = compatible.filter(asset => {
    if (asset.status !== 'ready' || documentRole(asset) !== 'schematic' || seen.has(asset.sha256)) return false;
    seen.add(asset.sha256);return true;
  });
  if (primary.length === 1) return primary[0];
  // Never open an arbitrary image, boardview or repair PDF as a schematic.
  if (!primary.length && compatible.some(asset => asset.kind === 'pdf')) return null;
  const wholeBoard = compatible.filter(asset => asset.kind === 'pcbe' && documentRole(asset) === 'board' && /(?:^|\s)boardview\.pcbe$/i.test(asset.name) && !/\b(?:AP|BB)\b|PCB.?layer|820[-\s]\d/i.test(asset.name));
  return wholeBoard.length === 1 ? wholeBoard[0] : null;
}
/** Candidates share physical device identity; this ranking is not electrical proof. */
export function schematicCandidates(anchor: SchematicAsset, catalog: SchematicAsset[]): SchematicAsset[] {
  const codes = (asset: SchematicAsset) => asset.name.match(/\b820[- ]\d{4,5}\b/gi)?.map(code => code.toUpperCase().replace(/ /g,'-')) ?? [];
  const boardCodes = new Set(codes(anchor));
  const score = (asset: SchematicAsset) => (pairIsVerified(anchor,asset) ? 100 : 0)
    + (codes(asset).some(code => boardCodes.has(code)) ? 20 : 0)
    + (/complete|completo|full/i.test(asset.name) ? 3 : 0);
  const sorted = catalog.filter(asset => asset.status === 'ready' && asset.kind === 'pdf' && sameDevice(anchor,asset) && documentRole(asset) === 'schematic')
    .sort((a,b) => score(b)-score(a) || a.name.localeCompare(b.name,'es',{numeric:true}) || a.relativePath.localeCompare(b.relativePath));
  const seen = new Set<string>();
  return sorted.filter(asset => { if(seen.has(asset.sha256))return false;seen.add(asset.sha256);return true; });
}
export function recommendedCounterpartId(anchor: SchematicAsset, compatible: SchematicAsset[], verifiedIds: ReadonlySet<string>): string | null {
  if (anchor.kind === 'pcbe') {
    const candidates = schematicCandidates(anchor,compatible);
    return candidates.find(asset => verifiedIds.has(asset.id))?.id ?? candidates[0]?.id ?? null;
  }
  const verifiedRecommended = preferredCounterpart(compatible.filter(asset => verifiedIds.has(asset.id)))?.id;
  const automatic = preferredCounterpart(compatible);
  return verifiedRecommended
    ?? automatic?.id
    // A PDF anchor may still open a compatible board when no schematic PDF is
    // available. A PCBE anchor must never fall back to an arbitrary document.
    ?? (anchor.kind === 'pdf' ? compatible.find(asset => documentRole(asset) === 'board')?.id : undefined)
    ?? null;
}
export function confirmedPair(a: SchematicAsset, b: SchematicAsset): boolean {
  if (a.kind === b.kind || a.status !== 'ready' || b.status !== 'ready' || !sameDevice(a,b)) return false;
  return !![...a.documentLinks?.filter(link=>link.sourceSha256===a.sha256 && link.assetId===b.id && link.sha256===b.sha256) ?? [],
    ...b.documentLinks?.filter(link=>link.sourceSha256===b.sha256 && link.assetId===a.id && link.sha256===a.sha256) ?? []]
    .find(link=>link.confirmedBy && link.confirmedAt);
}
export function pairIsVerified(a: SchematicAsset, b: SchematicAsset): boolean {
  return verifiedSameDevice(a,b) || confirmedPair(a,b);
}
/** A declaration of the exact device AND exact board revision is required. */
export function contentPairEvidence(board: SchematicAsset, pdf: SchematicAsset, text: string): string | null {
  if (board.kind !== 'pcbe' || pdf.kind !== 'pdf' || board.status !== 'ready' || pdf.status !== 'ready' || !sameDevice(board,pdf)) return null;
  const model = declaredModel(board.name);
  if (!model || model !== declaredModel(pdf.name) || model !== declaredModel(text)) return null;
  const declared=new Set([...text.matchAll(/\biphone[\s_-]*(\d{1,2})(?:[\s_-]*(pro[\s_-]*max|pro|plus|mini))?(?![a-z0-9])/gi)].map(match=>identityKey(`iphone${match[1]}${match[2]??''}`)));
  if(declared.size!==1)return null;
  const boardCode = board.name.match(/\b820[-\s]\d{4,5}[-\s]\d{2}\b/i)?.[0].replace(/\s/g,'-');
  if (!boardCode) return null;
  const codes = text.match(/\b820[-\s]\d{4,5}[-\s]\d{2}\b/gi) ?? [];
  if(codes.some(code=>code.replace(/\s/g,'-').startsWith(boardCode.slice(0,-2))&&code.replace(/\s/g,'-')!==boardCode))return null;
  return codes.some(code=>code.replace(/\s/g,'-')===boardCode) ? `${model} · ${boardCode} declarado en el esquema` : null;
}
