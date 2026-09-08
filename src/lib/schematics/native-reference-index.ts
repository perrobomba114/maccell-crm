import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SchematicAsset } from './catalog-types';
import { parseBboxXml, type TechnicalPage } from './unified-index';

const run = promisify(execFile);
type NativeSnapshot = { sha256: string; size: number; mtimeMs: number; pages: TechnicalPage[] };
const state = globalThis as typeof globalThis & {
  schematicNativeReferences?: { pending: Map<string,Promise<TechnicalPage[]>>; tail: Promise<void> };
};
const queue = state.schematicNativeReferences ??= { pending:new Map(), tail:Promise.resolve() };

/** Read real PDF text/coordinates on demand, independently of OCR and embedding jobs. */
export async function nativeReferencePages(asset: SchematicAsset, library: string): Promise<TechnicalPage[]> {
  if (asset.kind !== 'pdf' || asset.status !== 'ready' || !/^[a-f0-9]{64}$/.test(asset.sha256) || !/^[a-f0-9]{64}$/.test(asset.id)) return [];
  const root = await realpath(library);
  const file = await realpath(path.join(root,asset.relativePath));
  if (!file.startsWith(root+path.sep)) throw new Error('PDF fuera de la biblioteca');
  const facts = await stat(file);
  const cache = path.join(root,'.native-references',`${asset.id}-${asset.sha256}.json`);
  try {
    const saved = JSON.parse(await readFile(cache,'utf8')) as NativeSnapshot;
    if (saved.sha256 === asset.sha256 && saved.size === facts.size && saved.mtimeMs === facts.mtimeMs) return saved.pages;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const key = `${file}:${asset.sha256}:${facts.size}:${facts.mtimeMs}`;
  const pending = queue.pending.get(key);
  if (pending) return pending;
  const task = queue.tail.then(async () => {
    const bytes = await readFile(file);
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('PDF cambió respecto del catálogo');
    const {stdout} = await run('pdftotext',['-bbox','-enc','UTF-8',file,'-'],{timeout:30_000,maxBuffer:32*1024*1024});
    const after = await stat(file);
    if (after.size !== facts.size || after.mtimeMs !== facts.mtimeMs) throw new Error('PDF cambió durante la búsqueda');
    const pages = parseBboxXml(stdout);
    if (!pages.length) throw new Error('PDF sin páginas extraíbles');
    await mkdir(path.dirname(cache),{recursive:true});
    const pendingFile = `${cache}.${randomUUID()}.pending`;
    await writeFile(pendingFile,JSON.stringify({sha256:asset.sha256,size:facts.size,mtimeMs:facts.mtimeMs,pages}));
    await rename(pendingFile,cache);
    return pages;
  });
  queue.pending.set(key,task);
  // The caller receives extraction errors; keep the serialization queue usable.
  queue.tail = task.then(()=>undefined,()=>undefined);
  try { return await task; } finally { queue.pending.delete(key); }
}
