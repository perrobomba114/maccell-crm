import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsePcbe } from './pcbe';
import { imagePagesForOcr, indexFileIsCurrent, mergeOcrPage, indexBoard, parseBboxXml, parseOcrTsv, type TechnicalIndex } from './unified-index';
import type { SchematicAsset } from './catalog-types';
const run = promisify(execFile);

export async function extractTechnicalIndex(asset: SchematicAsset, file: string, forceOcrPages: number[] = []): Promise<TechnicalIndex> {
  const before = await stat(file);
  const fingerprint = { fileMtimeMs: before.mtimeMs, fileSize: before.size };
  const bytes = await readFile(file);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('El archivo cambió: actualizá el catálogo antes de indexarlo');
  if (asset.kind === 'pcbe') {
    if (!indexFileIsCurrent(fingerprint, await stat(file))) throw new Error('El archivo cambió durante la lectura');
    return { ...indexBoard(parsePcbe(new Uint8Array(bytes), asset.name), asset), ...fingerprint };
  }
  const temporary = await mkdtemp(path.join(tmpdir(), 'technical-index-'));
  try {
    const source = path.join(temporary, 'source.pdf');
    await writeFile(source, bytes);
    const output = path.join(temporary, 'pages.xml');
    await run('pdftotext', ['-bbox', '-enc', 'UTF-8', source, output], { timeout: 120_000, maxBuffer: 1024 * 1024 });
    const pages = parseBboxXml(await readFile(output, 'utf8'));
    if (!pages.length) throw new Error('No se extrajeron páginas del PDF');
    const images = await run('pdfimages', ['-list', source], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
    const imagePages = new Set(imagePagesForOcr(images.stdout));
    for (const page of pages) {
      if (page.text.trim().length >= 15 && !forceOcrPages.includes(page.page) && !imagePages.has(page.page)) continue;
      const raster = path.join(temporary, `page-${page.page}`);
      // Bound raster pixels: large schematic sheets must not exhaust server memory.
      await run('pdftoppm', ['-f', String(page.page), '-l', String(page.page), '-singlefile', '-scale-to', '4000', '-png', source, raster], { timeout: 60_000, maxBuffer: 1024 * 1024 });
      const recognized = await run('tesseract', [`${raster}.png`, 'stdout', '-l', process.env.SCHEMATICS_OCR_LANGUAGES ?? 'eng', 'tsv'], { timeout: 90_000, maxBuffer: 16 * 1024 * 1024 });
      const ocr = parseOcrTsv(recognized.stdout, page.page);
      Object.assign(page, mergeOcrPage(page, ocr));
      await rm(`${raster}.png`, { force: true });
    }
    if (!indexFileIsCurrent(fingerprint, await stat(file))) throw new Error('El archivo cambió durante la extracción');
    return { ...fingerprint, version: 1, assetId: asset.id, sha256: asset.sha256, pages, components: [], nets: [] };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
