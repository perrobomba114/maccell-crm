import { cipher, util } from "node-forge";
import type { PcbeComponent, GeometryPrimitive } from "./types";
function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('gb18030').decode(bytes);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  }
}

function readString(view: DataView, offset: number, length: number): string {
  return decodeText(new Uint8Array(view.buffer, view.byteOffset + offset, length)).replace(/\0+$/, '');
}

// PCBE stores legacy part records as DES-ECB with PKCS#7 padding.
export function decryptPartPayload(bytes: Uint8Array): Uint8Array {
  const decoder = cipher.createDecipher("DES-ECB", util.hexToBytes("DCFC12AC00000000"));
  decoder.start();
  decoder.update(util.createBuffer(bytes.slice().buffer));
  if (!decoder.finish()) throw new Error("Registro de componente PCBE inválido");
  return util.binary.raw.decode(decoder.output.getBytes());
}

export function parsePartPayload(bytes: Uint8Array): GeometryPrimitive[] {
  return parsePartRecord(bytes, 'part-0').geometry.map((primitive) => {
    if (primitive.kind === 'pin' || primitive.kind === 'outline') {
      const legacy = { ...primitive };
      delete legacy.componentId;
      if (legacy.kind === 'pin') delete legacy.padId;
      return legacy;
    }
    return primitive;
  });
}

function componentKind(name: string): string {
  const prefix = name.trim().match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? '';
  if (prefix.startsWith('U') || prefix.startsWith('IC')) return 'IC';
  if (prefix.startsWith('C')) return 'Capacitor';
  if (prefix.startsWith('R')) return 'Resistor';
  if (prefix.startsWith('L')) return 'Inductor';
  if (prefix.startsWith('D')) return 'Diode';
  if (prefix.startsWith('Q')) return 'Transistor';
  if (prefix.startsWith('J') || prefix.startsWith('P')) return 'Connector';
  return 'Componente';
}

export function parsePartRecord(bytes: Uint8Array, componentId: string): { component: PcbeComponent; geometry: GeometryPrimitive[] } {
  const empty: PcbeComponent = { id: componentId, name: componentId, kind: 'Componente', pads: [], outlineCount: 0 };
  if (bytes.length < 26) return { component: empty, geometry: [] };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const partSize = view.getUint32(0, true);
  const end = Math.min(bytes.length, 4 + partSize);
  const nameSize = view.getUint32(22, true);
  let offset = 26 + nameSize;
  if (offset > end) return { component: empty, geometry: [] };
  const name = readString(view, 26, nameSize).trim() || componentId;
  const component: PcbeComponent = { id: componentId, name, kind: componentKind(name), pads: [], outlineCount: 0 };
  if (offset > end) return { component, geometry: [] };
  const primitives: GeometryPrimitive[] = [];
  while (offset + 5 <= end) {
    const type = view.getUint8(offset);
    const size = view.getUint32(offset + 1, true);
    const dataStart = offset + 5;
    const blockEnd = dataStart + size;
    if (blockEnd > end || blockEnd <= dataStart) break;
    if (type === 0x06 && size >= 30) {
      const textSize = view.getUint32(dataStart + 26, true);
      if (30 + textSize <= size) {
        const reference = readString(view, dataStart + 30, textSize).trim();
        if (reference) {
          component.name = reference;
          component.kind = componentKind(reference);
        }
      }
    } else if (type === 0x05 && size >= 28) {
      primitives.push({ kind: 'outline', layer: view.getUint32(dataStart, true), x1: view.getInt32(dataStart + 4, true), y1: view.getInt32(dataStart + 8, true), x2: view.getInt32(dataStart + 12, true), y2: view.getInt32(dataStart + 16, true), width: view.getUint32(dataStart + 20, true), componentId });
      component.outlineCount += 1;
    } else if (type === 0x09 && size >= 32) {
      const pinNameSize = view.getUint32(dataStart + 20, true);
      const pinNameStart = dataStart + 24;
      const pinDataStart = pinNameStart + pinNameSize;
      if (pinDataStart + 8 <= blockEnd) {
        const height = view.getUint32(pinDataStart, true);
        const width = view.getUint32(pinDataStart + 4, true);
        // In XZZPCB part records the pad/net association is stored after the
        // fixed pad geometry. It is not a nested string block: the first byte
        // is part of the pad shape and the net id starts at an unaligned offset.
        const netOffset = pinDataStart + 32;
        const netIndex: number | null = netOffset + 4 <= blockEnd ? view.getUint32(netOffset, true) : null;
        const x = view.getUint32(dataStart + 4, true);
        const y = view.getUint32(dataStart + 8, true);
        const pinName = readString(view, pinNameStart, pinNameSize);
        const radius = Math.max(1000, Math.min(height, width) / 2);
        const padId = `${componentId}:${pinName || component.pads.length + 1}`;
        component.pads.push({ id: padId, name: pinName, componentId, layer: 29, x, y, radius, netIndex });
        primitives.push({ kind: 'pin', layer: 29, x, y, radius, netIndex, name: pinName, componentId, padId });
      }
    }
    offset = blockEnd;
  }
  return { component, geometry: primitives };
}
