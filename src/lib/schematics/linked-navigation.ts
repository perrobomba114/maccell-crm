import { verifiedSameDevice, type SchematicAsset } from './catalog-types';

export type PdfBox = { text: string; x: number; y: number; width: number; height: number };
export function compatibleCounterparts(asset: SchematicAsset, candidates: SchematicAsset[]) {
  return candidates.filter(candidate => candidate.kind !== asset.kind && candidate.status === 'ready' && verifiedSameDevice(asset, candidate));
}
export function containsReference(text: string, term: string): boolean {
  if (!term.trim()) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'i').test(text);
}
/** Return labels, preserving measured whole-box geometry rather than inventing glyph positions. */
export function referencesInText(text: string, references: ReadonlySet<string>): string[] {
  const tokens = text.toUpperCase().match(/[A-Z0-9_]+(?:[.+/-][A-Z0-9_]+)*/g) ?? [];
  const result = new Set<string>();
  for (const token of tokens) {
    if (references.has(token)) result.add(token);
    else for (const part of token.split(/[.+/-]/)) if (references.has(part)) result.add(part);
  }
  return [...result];
}
export function validPdfBox(box: PdfBox): boolean {
  return typeof box.text === 'string' && [box.x, box.y, box.width, box.height].every(Number.isFinite)
    && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0
    && box.x + box.width <= 1.001 && box.y + box.height <= 1.001;
}
export function referenceOccurrences(matches: { page: number; boxes?: PdfBox[] }[], term: string) {
  return matches.flatMap<{ page: number; box?: PdfBox; index: number }>(match => {
    const boxes = match.boxes?.filter(box => validPdfBox(box) && containsReference(box.text, term)) ?? [];
    return boxes.length ? boxes.map((box, index) => ({ page: match.page, box, index })) : [{ page: match.page, box: undefined, index: 0 }];
  });
}

export function readableReferenceZoom(currentZoom: number, boxHeight: number, renderedPageHeight: number): number {
  const pixels = boxHeight * renderedPageHeight;
  if (!Number.isFinite(pixels) || pixels <= 0) return currentZoom;
  return Math.min(12, Math.max(currentZoom, currentZoom * 14 / pixels));
}
