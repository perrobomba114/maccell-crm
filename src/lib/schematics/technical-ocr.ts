import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseOcrTsv, type TechnicalPage } from './unified-index';

export type OcrRunner = (command: string, args: string[], options: { signal?: AbortSignal; timeout: number; maxBuffer: number }) => Promise<{ stdout: string }>;
const execute = promisify(execFile);
const runOcr: OcrRunner = (command,args,options) => execute(command,args,options);

function isTesseractTimeout(error: unknown): boolean {
  // execFile's own deadline kills the child with SIGTERM and a null exit code.
  // AbortError, executable failures and maxBuffer errors must not enter this fallback.
  return error instanceof Error && error.name !== 'AbortError'
    && 'killed' in error && error.killed === true
    && 'signal' in error && error.signal === 'SIGTERM'
    && 'code' in error && error.code === null;
}

/** One timeout-only OCR fallback for dense diagrams; TSV dimensions keep coordinates normalized. */
export async function recognizeTechnicalPage(source: string, raster: string, page: number, languages: string, signal?: AbortSignal, run: OcrRunner = runOcr): Promise<TechnicalPage> {
  const render = async (scale: number) => {
    signal?.throwIfAborted();
    await run('pdftoppm', ['-f',String(page),'-l',String(page),'-singlefile','-scale-to',String(scale),'-png',source,raster], {signal,timeout:60_000,maxBuffer:1024*1024});
  };
  const recognize = async (fallback: boolean) => {
    signal?.throwIfAborted();
    const result = await run('tesseract', [`${raster}.png`,'stdout','-l',languages,...(fallback ? ['--psm','11'] : []),'tsv'], {signal,timeout:90_000,maxBuffer:16*1024*1024});
    signal?.throwIfAborted();
    return parseOcrTsv(result.stdout,page);
  };
  // Bound raster pixels: large schematic sheets must not exhaust server memory.
  await render(4000);
  try { return await recognize(false); }
  catch (error) {
    signal?.throwIfAborted();
    if (!isTesseractTimeout(error)) throw error;
    console.warn(`[SCHEMATICS OCR] Página ${page}: timeout; único reintento a 2000 px con texto disperso.`);
    await render(2000);
    const recovered = await recognize(true);
    if (!recovered.text.trim() || !recovered.boxes.length) throw new Error(`OCR_FALLBACK_EMPTY: la página ${page} no produjo texto legible después del timeout`);
    return recovered;
  }
}
