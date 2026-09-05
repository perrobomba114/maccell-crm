import { load } from 'cheerio';
import type { PcbeDocument, PcbePad } from './types';

export type ReferenceBox = { text: string; x: number; y: number; width: number; height: number };
export type TechnicalPage = { page: number; text: string; source: 'text' | 'ocr'; boxes: ReferenceBox[] };
export type TechnicalIndex = {
  version: 1; complete?: boolean; assetId: string; sha256: string; fileMtimeMs?: number; fileSize?: number;
  pages: TechnicalPage[];
  components: { id: string; name: string; kind: string; pads: Pick<PcbePad, 'id' | 'name' | 'layer' | 'x' | 'y' | 'netIndex'>[] }[];
  nets: { id: number; name: string }[];
};
export function indexIsCurrent(index: { version: number; assetId: string; sha256: string } | null, asset: { id: string; sha256: string }): index is TechnicalIndex {
  return !!index && index.version === 1 && index.assetId === asset.id && index.sha256 === asset.sha256;
}
function normalizedBox(text: string, left: number, top: number, right: number, bottom: number, width: number, height: number): ReferenceBox | null {
  if (![left, top, right, bottom, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || right <= left || bottom <= top || left < 0 || top < 0 || right > width + 1 || bottom > height + 1) return null;
  return { text, x: left / width, y: top / height, width: (Math.min(right, width) - left) / width, height: (Math.min(bottom, height) - top) / height };
}
export function parseBboxXml(xml: string): TechnicalPage[] {
  const $ = load(xml, { xmlMode: true });
  return $('page').toArray().map((page, i) => {
    const width = Number($(page).attr('width')), height = Number($(page).attr('height'));
    const words: string[] = [], boxes: ReferenceBox[] = [];
    $(page).find('word').each((_, word) => {
      const text = $(word).text().replace(/\0/g, '').trim();
      if (!text) return;
      words.push(text);
      const box = normalizedBox(text, Number($(word).attr('xMin')), Number($(word).attr('yMin')), Number($(word).attr('xMax')), Number($(word).attr('yMax')), width, height);
      if (box) boxes.push(box);
    });
    return { page: i + 1, text: words.join(' '), source: 'text', boxes };
  });
}
export function parseOcrTsv(tsv: string, page: number): TechnicalPage {
  const rows = tsv.split(/\r?\n/).slice(1).map(line => line.split('\t'));
  const root = rows.find(row => row[0] === '1');
  const width = Number(root?.[8]), height = Number(root?.[9]);
  const boxes: ReferenceBox[] = [];
  for (const row of rows) {
    if (row[0] !== '5' || Number(row[10]) < 55) continue;
    const text = row.slice(11).join('\t').trim();
    if (!text) continue;
    const left = Number(row[6]), top = Number(row[7]);
    const box = normalizedBox(text, left, top, left + Number(row[8]), top + Number(row[9]), width, height);
    if (box) boxes.push(box);
  }
  return { page, text: boxes.map(box => box.text).join(' '), source: 'ocr', boxes };
}
export function indexReferenceMatches(pages: TechnicalPage[], term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'i');
  return pages.flatMap(page => {
    const position = page.text.search(pattern);
    if (position < 0) return [];
    return [{ page: page.page, excerpt: page.text.slice(Math.max(0, position - 65), position + term.length + 100), boxes: page.boxes.filter(box => pattern.test(box.text)) }];
  });
}
function databaseText(value: string): string { return value.replace(/\0/g, ''); }
export function indexBoard(board: PcbeDocument, asset: { id: string; sha256: string }): TechnicalIndex {
  if (!board.validHeader || !board.geometry.length) throw new Error('Formato de placa sin geometría decodificable');
  return { version: 1, assetId: asset.id, sha256: asset.sha256, pages: [],
    components: board.components.map(component => ({ id: databaseText(component.id), name: databaseText(component.name), kind: databaseText(component.kind),
      pads: component.pads.map(({ id, name, layer, x, y, netIndex }) => ({ id: databaseText(id), name: databaseText(name), layer, x, y, netIndex })) })),
    nets: board.netCatalog.map(({ id, name }) => ({ id, name: databaseText(name) })) };
}

export function indexFileIsCurrent(index: Pick<TechnicalIndex, 'fileMtimeMs' | 'fileSize'>, file: { mtimeMs: number; size: number }): boolean {
  return Number.isFinite(index.fileMtimeMs) && index.fileMtimeMs === file.mtimeMs && index.fileSize === file.size;
}
export function imagePagesForOcr(list: string): number[] {
  return [...new Set(list.split(/\r?\n/).flatMap(line => {
    const columns = line.trim().split(/\s+/);
    const page = Number(columns[0]);
    return Number.isSafeInteger(page) && page > 0 && columns[2] === 'image' && Number(columns[3]) >= 300 && Number(columns[4]) >= 300 ? [page] : [];
  }))];
}
export function mergeOcrPage(native: TechnicalPage, ocr: TechnicalPage): TechnicalPage {
  if (native.page !== ocr.page) throw new Error('OCR de otra página');
  if (!ocr.text.trim()) return native;
  const additions = ocr.boxes.filter(box => !native.boxes.some(existing => {
    if (existing.text.toUpperCase() !== box.text.toUpperCase()) return false;
    const intersection = Math.max(0, Math.min(existing.x + existing.width, box.x + box.width) - Math.max(existing.x, box.x)) * Math.max(0, Math.min(existing.y + existing.height, box.y + box.height) - Math.max(existing.y, box.y));
    return intersection / Math.min(existing.width * existing.height, box.width * box.height) > .5;
  }));
  const extraText = ocr.boxes.length ? additions.map(box => box.text).join(' ') : native.text.includes(ocr.text) ? '' : ocr.text;
  return { page: native.page, source: 'ocr', text: [native.text, extraText].filter(Boolean).join('\n'), boxes: [...native.boxes, ...additions] };
}
