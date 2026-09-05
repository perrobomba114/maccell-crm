import CryptoJS from "crypto-js";
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

function u8ToWordArray(bytes: Uint8Array) {
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) words[index >>> 2] = (words[index >>> 2] ?? 0) | (bytes[index] << (24 - (index % 4) * 8));
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToU8(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const bytes = new Uint8Array(wordArray.sigBytes);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = (wordArray.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff;
  return bytes;
}

export function decryptPartPayload(bytes: Uint8Array): Uint8Array {
  const key = CryptoJS.enc.Hex.parse('DCFC12AC00000000');
  const decrypted = CryptoJS.DES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext: u8ToWordArray(bytes) }), key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
  return wordArrayToU8(decrypted);
}

export function parsePartPayload(bytes: Uint8Array): GeometryPrimitive[] {
  return parsePartRecord(bytes, 'part-0').geometry.map((primitive) => {
    if (primitive.kind === 'pin') {
      const { componentId: _componentId, padId: _padId, ...legacy } = primitive;
      return legacy;
    }
    if (primitive.kind === 'outline') {
      const { componentId: _componentId, ...legacy } = primitive;
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
