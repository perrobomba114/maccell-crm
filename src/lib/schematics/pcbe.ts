import { buildLayerCatalog, buildNetCatalog } from "./boardview";
import { decryptPartPayload, parsePartRecord } from "./parts";
import type { PcbeHeader, PcbeBlock, PcbeNetEntry, PcbeDocument, PcbeComponent, GeometryPrimitive } from "./types";
export type * from "./types";
const SIGNATURE = 'XZZPCB V1.0';
const POST_V6_MARKER = new Uint8Array([0x76, 0x36, 0x76, 0x36, 0x35, 0x35, 0x35, 0x76, 0x36, 0x76, 0x36]);
const BLOCK_NAMES: Record<number, string> = {
  0x01: 'Arcos',
  0x02: 'Vías',
  0x03: 'Formas',
  0x05: 'Líneas',
  0x06: 'Textos',
  0x07: 'Partes y pads',
  0x09: 'Taladros',
};

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return Array.from(bytes.subarray(start, start + length), (value) => String.fromCharCode(value)).join('').replace(/\0+$/, '');
}

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

function findSequence(bytes: Uint8Array, sequence: Uint8Array): number {
  outer: for (let index = 0; index <= bytes.length - sequence.length; index += 1) {
    for (let part = 0; part < sequence.length; part += 1) {
      if (bytes[index + part] !== sequence[part]) continue outer;
    }
    return index;
  }
  return -1;
}

function normalizeBytes(input: Uint8Array, warnings: string[]): Uint8Array {
  const bytes = new Uint8Array(input);
  if (bytes.length <= 0x10 || bytes[0x10] === 0) return bytes;

  const key = bytes[0x10];
  const marker = findSequence(bytes, POST_V6_MARKER);
  const end = marker >= 0 ? marker : bytes.length;
  for (let index = 0; index < end; index += 1) bytes[index] ^= key;
  warnings.push(`Se aplicó XOR 0x${key.toString(16).padStart(2, '0')} hasta el offset 0x${end.toString(16)}`);
  return bytes;
}

function emptyHeader(): PcbeHeader {
  return { xorIndicator: 0, addressesSize: 0, imageBlockStart: 0, netBlockStart: 0, mainDataSize: 0 };
}

function readHeader(view: DataView, warnings: string[]): PcbeHeader {
  if (view.byteLength < 0x44) {
    warnings.push('Cabecera incompleta: se requieren al menos 0x44 bytes');
    return emptyHeader();
  }
  return {
    xorIndicator: view.getUint8(0x10),
    addressesSize: view.getUint32(0x20, true),
    imageBlockStart: view.getUint32(0x24, true),
    netBlockStart: view.getUint32(0x28, true),
    mainDataSize: view.getUint32(0x40, true),
  };
}

function blockName(type: number): string {
  return BLOCK_NAMES[type] ?? `Desconocido 0x${type.toString(16).padStart(2, '0')}`;
}

function safeUint32(view: DataView, offset: number): number | null {
  return offset + 4 <= view.byteLength ? view.getUint32(offset, true) : null;
}

function safeInt32(view: DataView, offset: number): number | null {
  return offset + 4 <= view.byteLength ? view.getInt32(offset, true) : null;
}

function safeBlockPayload(view: DataView, payloadStart: number, payloadSize: number, required: number): boolean {
  return payloadSize >= required && payloadStart >= 0 && payloadStart + required <= view.byteLength;
}

function readString(view: DataView, offset: number, length: number): string {
  return decodeText(new Uint8Array(view.buffer, view.byteOffset + offset, length)).replace(/\0+$/, '');
}

function decodeGeometry(type: number, view: DataView, payloadStart: number, payloadSize: number, components: PcbeComponent[]): GeometryPrimitive[] {
  if (type === 0x01 && safeBlockPayload(view, payloadStart, payloadSize, 32)) {
    const layer = safeUint32(view, payloadStart);
    const x = safeUint32(view, payloadStart + 4);
    const y = safeUint32(view, payloadStart + 8);
    const radius = safeInt32(view, payloadStart + 12);
    const startAngle = safeInt32(view, payloadStart + 16);
    const endAngle = safeInt32(view, payloadStart + 20);
    const width = safeInt32(view, payloadStart + 24);
    if ([layer, x, y, radius, startAngle, endAngle, width].every((value) => value !== null)) {
      return [{ kind: 'arc', layer: layer!, x: x!, y: y!, radius: Math.abs(radius!), startAngle: startAngle!, endAngle: endAngle!, width: Math.abs(width!) }];
    }
  }

  if (type === 0x02 && safeBlockPayload(view, payloadStart, payloadSize, 32)) {
    const x = safeInt32(view, payloadStart);
    const y = safeInt32(view, payloadStart + 4);
    const outerRadius = safeInt32(view, payloadStart + 8);
    const innerRadius = safeInt32(view, payloadStart + 12);
    const layerA = safeUint32(view, payloadStart + 16);
    const layerB = safeUint32(view, payloadStart + 20);
    const netIndex = safeUint32(view, payloadStart + 24);
    const textLength = safeUint32(view, payloadStart + 28);
    if ([x, y, outerRadius, innerRadius, layerA, layerB, netIndex, textLength].every((value) => value !== null) && 32 + textLength! <= payloadSize) {
      return [{ kind: 'via', layer: layerA!, x: x!, y: y!, outerRadius: Math.abs(outerRadius!), innerRadius: Math.abs(innerRadius!), layerA: layerA!, layerB: layerB!, netIndex: netIndex!, text: readString(view, payloadStart + 32, textLength!) }];
    }
  }

  if (type === 0x05 && safeBlockPayload(view, payloadStart, payloadSize, 28)) {
    const layer = safeUint32(view, payloadStart);
    const x1 = safeInt32(view, payloadStart + 4);
    const y1 = safeInt32(view, payloadStart + 8);
    const x2 = safeInt32(view, payloadStart + 12);
    const y2 = safeInt32(view, payloadStart + 16);
    const width = safeInt32(view, payloadStart + 20);
    const netIndex = safeUint32(view, payloadStart + 24);
    if ([layer, x1, y1, x2, y2, width, netIndex].every((value) => value !== null)) {
      return [{ kind: 'segment', layer: layer!, x1: x1!, y1: y1!, x2: x2!, y2: y2!, width: Math.abs(width!), netIndex: netIndex! }];
    }
  }

  if (type === 0x06 && safeBlockPayload(view, payloadStart, payloadSize, 30)) {
    const x = safeUint32(view, payloadStart + 4);
    const y = safeUint32(view, payloadStart + 8);
    const size = safeUint32(view, payloadStart + 12);
    const textLength = safeUint32(view, payloadStart + 26);
    if ([x, y, size, textLength].every((value) => value !== null) && 30 + textLength! <= payloadSize) {
      return [{ kind: 'text', layer: 0, x: x!, y: y!, size: size!, text: readString(view, payloadStart + 30, textLength!) }];
    }
  }

  if (type === 0x07) {
    try {
      const componentId = `part-${components.length + 1}`;
      const parsed = parsePartRecord(decryptPartPayload(new Uint8Array(view.buffer, view.byteOffset + payloadStart, payloadSize)), componentId);
      components.push(parsed.component);
      return parsed.geometry;
    } catch { return []; }
  }

  return [];
}

function readBlocks(view: DataView, declaredSize: number, geometry: GeometryPrimitive[], components: PcbeComponent[], warnings: string[]): PcbeBlock[] {
  const blocks: PcbeBlock[] = [];
  const streamStart = 0x44;
  const streamEnd = Math.min(streamStart + declaredSize, view.byteLength);
  if (streamStart + declaredSize > view.byteLength) warnings.push('El stream principal declarado excede el tamaño del archivo');

  let offset = streamStart;
  const undecoded = new Map<number, number>();
  while (offset < streamEnd) {
    if (offset + 4 <= streamEnd && view.getUint32(offset, true) === 0) {
      offset += 4;
      continue;
    }
    if (offset + 5 > streamEnd) {
      warnings.push(`Cabecera de bloque truncada en 0x${offset.toString(16)}`);
      break;
    }

    const type = view.getUint8(offset);
    const size = view.getUint32(offset + 1, true);
    const payloadStart = offset + 5;
    if (payloadStart + size > streamEnd || payloadStart + size > view.byteLength) {
      warnings.push(`Bloque 0x${type.toString(16).padStart(2, '0')} truncado o fuera de límites`);
      break;
    }
    const decoded = decodeGeometry(type, view, payloadStart, size, components);
    geometry.push(...decoded);
    if (!decoded.length) undecoded.set(type, (undecoded.get(type) ?? 0) + 1);
    blocks.push({ type, name: blockName(type), sizeBytes: size, offset, decoded: decoded.length > 0 });
    offset = payloadStart + size;
  }
  for (const [type, count] of undecoded) warnings.push(`${count} bloques ${blockName(type)} no decodificados; se conserva su conteo sin inventar geometría`);
  return blocks;
}

function readNets(view: DataView, header: PcbeHeader, warnings: string[]): PcbeNetEntry[] {
  const start = header.netBlockStart + 0x20;
  if (!header.netBlockStart || start + 4 > view.byteLength) return [];
  const blockSize = safeUint32(view, start);
  if (blockSize === null || start + 4 + blockSize > view.byteLength) {
    warnings.push('Bloque de nets incompleto o fuera de límites');
    return [];
  }
  const nets: PcbeNetEntry[] = [];
  let offset = start + 4;
  const end = start + 4 + blockSize;
  while (offset + 8 <= end) {
    const entrySize = view.getUint32(offset, true);
    const index = view.getUint32(offset + 4, true);
    const nameSize = entrySize - 8;
    if (entrySize < 8 || offset + 8 + nameSize > end) {
      warnings.push(`Entrada de net ${index} inválida`);
      break;
    }
    const name = readString(view, offset + 8, nameSize).trim();
    nets.push({ id: index, name });
    offset += entrySize;
  }
  return nets;
}

function buildDocument(name: string, bytes: Uint8Array, signature: string, validHeader: boolean, header: PcbeHeader, blocks: PcbeBlock[], geometry: GeometryPrimitive[], components: PcbeComponent[], netEntries: PcbeNetEntry[], warnings: string[]): PcbeDocument {
  const netCatalog = buildNetCatalog(geometry, netEntries);
  const layerCatalog = buildLayerCatalog(geometry);
  return { name, sizeBytes: bytes.byteLength, signature: signature || null, validHeader, header, blocks, geometry, components, nets: netEntries.map((entry) => entry.name), netCatalog, layerCatalog, warnings };
}

export function parsePcbe(input: Uint8Array, name: string): PcbeDocument {
  const warnings: string[] = [];
  const bytes = normalizeBytes(input, warnings);
  const signature = readAscii(bytes, 0, 11);
  const validHeader = bytes.byteLength >= 0x44 && signature === SIGNATURE;
  if (!validHeader) warnings.unshift('Firma XZZPCB ausente o inválida');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = readHeader(view, warnings);
  const geometry: GeometryPrimitive[] = [];
  const components: PcbeComponent[] = [];
  const blocks = validHeader ? readBlocks(view, header.mainDataSize, geometry, components, warnings) : [];
  const netEntries = validHeader ? readNets(view, header, warnings) : [];
  return buildDocument(name, bytes, signature, validHeader, header, blocks, geometry, components, netEntries, warnings);
}

export async function computeSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

export function blockCounts(blocks: PcbeBlock[]): Array<{ name: string; count: number; decoded: number }> {
  const counts = new Map<string, { count: number; decoded: number }>();
  for (const block of blocks) {
    const current = counts.get(block.name) ?? { count: 0, decoded: 0 };
    current.count += 1;
    if (block.decoded) current.decoded += 1;
    counts.set(block.name, current);
  }
  return Array.from(counts, ([name, value]) => ({ name, ...value }));
}
