import type { GeometryPrimitive } from "./types";

export type BoardDetail = "clean" | "tracks" | "all";
/** Drawing layers may store the real outline separately from a component's pads. */
export function workshopGeometry(geometry: GeometryPrimitive[], layers: Set<number>, detail: BoardDetail, vias: boolean): GeometryPrimitive[] {
  const visibleComponents = new Set(geometry.flatMap(item => item.kind === "pin" && layers.has(item.layer) && item.componentId ? [item.componentId] : []));
  return geometry.filter(item => visiblePrimitive(item, layers, detail, vias) || (item.kind === "outline" && !!item.componentId && visibleComponents.has(item.componentId)));
}
export function initialLayer(geometry: GeometryPrimitive[]): number {
  const counts = new Map<number, number>();
  for (const item of geometry) counts.set(item.layer, (counts.get(item.layer) ?? 0) + (item.kind === "pin" ? 100 : item.kind === "outline" ? 10 : 1));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}
export function visiblePrimitive(item: GeometryPrimitive, layers: Set<number>, detail: BoardDetail, vias: boolean): boolean {
  if (!layers.has(item.layer) && !(item.kind === "via" && (layers.has(item.layerA) || layers.has(item.layerB)))) return false;
  if (item.kind === "via") return vias;
  if (detail === "clean") return item.kind === "pin" || item.kind === "outline";
  if (detail === "tracks") return item.kind !== "text" && item.kind !== "arc";
  return true;
}
