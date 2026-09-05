import type { PcbeComponent } from "./types";

export type WorkspaceLocation = { board?: string; pdf?: string; page: number; component?: string; net?: string; repair?: string };
export function clampPdfPage(page: number, total: number): number {
  return Math.max(1, Math.min(Number.isSafeInteger(page) ? page : 1, total));
}
export function shouldNavigateReference(previousToken: number, token: number, previousQuery: string, query: string): boolean {
  return previousToken !== token || previousQuery !== query;
}
export function selectionLayers(parts: PcbeComponent[], component: string | null, net: number | null, fallback: number[]): number[] {
  const pads = component ? parts.find(part => part.id === component)?.pads ?? [] : parts.flatMap(part => part.pads).filter(pad => net !== null && pad.netIndex === net);
  return pads.length ? [...new Set(pads.map(pad => pad.layer))] : fallback;
}
export function readWorkspaceLink(params: URLSearchParams): WorkspaceLocation {
  const asset = (key: string) => { const value = params.get(key); return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined; };
  const term = (key: string) => params.get(key)?.trim().slice(0, 120) || undefined;
  const page = Number(params.get("page"));
  return { board: asset("board"), pdf: asset("pdf"), page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1, component: term("component"), net: term("net"), repair: term("repair") };
}
export function workspaceLink(state: WorkspaceLocation): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) if (value !== undefined && value !== "") params.set(key, String(value));
  return `/technician/schematics?${params}`;
}
