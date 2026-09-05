import type { GeometryPrimitive } from "./types";

/** Return only decoded copper segments carrying an explicit selected net ID. */
export function physicalTracks(geometry: GeometryPrimitive[], nets: Set<number>) {
  return geometry.filter((item): item is Extract<GeometryPrimitive, {kind: "segment"}> => item.kind === "segment" && nets.has(item.netIndex));
}
