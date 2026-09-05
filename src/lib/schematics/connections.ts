import type { PcbeComponent } from "./types";

/** Direct electrical connectivity only: no inference from proximity or net names. */
export function connectionsFor(components: PcbeComponent[], component: string | null, net: number | null) {
  const selected = components.find(part => part.id === component);
  const nets = new Set<number>(net !== null ? [net] : selected?.pads.flatMap(pad => pad.netIndex === null ? [] : [pad.netIndex]) ?? []);
  return { nets, components: components.filter(part => part.id !== component && part.pads.some(pad => pad.netIndex !== null && nets.has(pad.netIndex))) };
}
