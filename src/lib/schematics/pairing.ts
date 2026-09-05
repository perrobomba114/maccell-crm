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
  if (/schematic|esquem[aá]tico|circuit.?diagram/.test(name)) return 'schematic';
  return 'document';
}
export const roleLabels = {schematic:'Esquema',board:'Placa',accessory:'Flex / accesorio',repair:'Caso de reparación',document:'Documento'};
export function assetPriority(asset: SchematicAsset): number {
  return {schematic:0,board:1,accessory:2,document:3,repair:4}[documentRole(asset)];
}
export function preferredCounterpart(compatible: SchematicAsset[]): SchematicAsset | null {
  if (compatible.length === 1) return compatible[0];
  const primary = compatible.filter(asset => documentRole(asset) === 'schematic');
  if (primary.length === 1) return primary[0];
  const wholeBoard = compatible.filter(asset => asset.kind === 'pcbe' && documentRole(asset) === 'board' && /(?:^|\s)boardview\.pcbe$/i.test(asset.name) && !/\b(?:AP|BB)\b|PCB.?layer|820[-\s]\d/i.test(asset.name));
  return wholeBoard.length === 1 ? wholeBoard[0] : null;
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
