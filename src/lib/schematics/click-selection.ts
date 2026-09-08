import type { SelectionCandidate } from './boardview';

/** Pads and outlines of the same component are one technician selection. */
export function clickSelections(hits: readonly SelectionCandidate[]): SelectionCandidate[] {
  const sorted = [...hits].sort((a,b) => Number(!a.componentId)-Number(!b.componentId) || a.distance-b.distance);
  const seen = new Set<string>();
  return sorted.filter(hit => {
    const key = hit.componentId ? `component:${hit.componentId}` : hit.netId !== null ? `net:${hit.netId}` : `primitive:${hit.primitiveIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);return true;
  });
}
