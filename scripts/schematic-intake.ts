/** Publish reviewed batches; filenames alone never authorize a device identity. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, copyFile, link, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, chmod } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { parsePcbe } from '../src/lib/schematics/pcbe';
import { declaredIdentity } from '../src/lib/schematics/physical-inventory';
import type { SchematicAsset } from '../src/lib/schematics/catalog-types';
import samsung from './data/schematic-samsung-reference.json';

const run = promisify(execFile);
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export type IntakeEntry = { source: string; target: string; sha256: string; size: number; evidence: string };
export type IntakeManifest = { version: 1; reviewedBy: string; entries: IntakeEntry[] };
const phoneBrands = new Set(['Samsung','iPhone','iPad','Motorola','Xiaomi','Huawei','Honor','LG','Realme','Vivo','Oppo','OnePlus','Infinix','Tecno','Nokia','ZTE','Google','Sony']);
function safeParts(value: string): string[] {
  const parts = value.split('/');
  if (!value || parts.some(p => !p || p.startsWith('.') || p !== p.trim() || /[\\\x00-\x1f]/.test(p))) throw Error('Ruta no permitida');
  return parts;
}
export function validateIntakeTarget(target: string): void {
  const p = safeParts(target);
  if (!['pdf','pcbe'].includes(p[0]) || !/\.(pdf|pcbe|pcb)$/i.test(p.at(-1)!)) throw Error('Tipo o raíz no permitidos');
  if ((p[0] === 'pdf') !== /\.pdf$/i.test(p.at(-1)!)) throw Error('Extensión incompatible con carpeta');
  const platform = ['Consolas','Laptop-PC'].includes(p[1]);
  if (p.length !== (platform ? 5 : 4) || (!platform && !phoneBrands.has(p[1]))) throw Error('Estructura no canónica');
  if (/\b(?:VIP|FREE|General|Por revisar)\b/i.test(p.slice(1,-1).join(' '))) throw Error('Identidad pendiente o carpeta de proveedor');
  if (platform && !declaredIdentity('sources/'+target,p.at(-1)!).brand) throw Error('Fabricante no reconocido');
  if (['iPhone','iPad'].includes(p[1]) && new RegExp('^'+p[1]+'\\b','i').test(p[2])) throw Error('Familia Apple repetida');
  if (p[1] === 'Samsung') {
    const code = p[2].match(/\b(?:SM|GT|SCH|SGH|SHV|SC)-[A-Z0-9]+$/)?.[0];
    if (!code) throw Error('Samsung requiere código técnico explícito');
    const pairs = samsung.codeModels as Record<string,string[]>;
    const key = Object.keys(pairs).filter(k => code.startsWith(k)).sort((a,b)=>b.length-a.length)[0];
    if (!key || !pairs[key].some(model => p[2] === model+' '+code)) throw Error('Código Samsung sin asociación canónica comprobada');
  }
}
async function contained(root: string, relative: string, createParents = false): Promise<string> {
  const parts = safeParts(relative);
  let current = root;
  for (const [i,part] of parts.entries()) {
    current = path.join(current,part);
    if (createParents && i < parts.length-1) await mkdir(current,{mode:0o755}).catch(e=>{if(e.code!=='EEXIST')throw e;});
    try { if ((await lstat(current)).isSymbolicLink()) throw Error('Enlace simbólico no permitido'); }
    catch(e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT' || !createParents) throw e; }
  }
  return current;
}
export async function validateIntakeContent(bytes: Buffer, name: string): Promise<void> {
  if (/\.pdf$/i.test(name)) {
    if (!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw Error('No es un PDF');
    const temp = await mkdtemp(path.join(tmpdir(),'intake-pdf-'));
    try {
      const file=path.join(temp,'source.pdf'); await writeFile(file,bytes);
      const {stdout}=await run('pdfinfo',[file],{timeout:30000,maxBuffer:1024*1024,env:{...process.env,LC_ALL:'C'}});
      if(!/^Pages:\s+[1-9]\d*/m.test(stdout) || /^Encrypted:\s+yes/m.test(stdout))throw Error('PDF sin páginas legibles o cifrado');
    } finally {await rm(temp,{recursive:true,force:true});}
  } else {
    const board = parsePcbe(new Uint8Array(bytes),name);
    if (!board.validHeader || !board.geometry.length) throw Error('Placa sin geometría decodificable');
  }
}
const identity = (target: string) => {const d=declaredIdentity('sources/'+target,path.basename(target));return `${d.brand}|${d.model}`;};

/** Called under the technical worker advisory lock. Only PUBLICAR.json batches opt in. */
export async function processIntake(root: string, previous: readonly SchematicAsset[], validate = validateIntakeContent): Promise<{ published: number; approved: Set<string> }> {
  const library = await realpath(path.join(root,'sources'));
  const incoming = path.join(library,'.incoming-scraping');
  let batches;
  try { batches = await readdir(incoming,{withFileTypes:true}); }
  catch(e) { if((e as NodeJS.ErrnoException).code==='ENOENT')return {published:0,approved:new Set()};throw e; }
  if ((await lstat(incoming)).isSymbolicLink()) throw Error('Staging no puede ser un enlace');
  const folders = new Map(previous.map(a => {
    const folder = path.posix.dirname(a.relativePath.replace(/^sources\//,''));
    return [folder.toLocaleLowerCase('en'),folder];
  }));
  const known = new Map(previous.map(a=>[a.sha256+'|'+identity(a.relativePath.replace(/^sources\//,'')),a.relativePath]));
  let published=0;
  const approved = new Set<string>();
  const admit = (rows: {target?: string;status: string}[]) => {for(const r of rows)if(r.target && ['published','already_published'].includes(r.status))approved.add('sources/'+r.target);};
  for (const batch of batches.filter(d=>d.isDirectory()&&!d.name.startsWith('.'))) {
    const dir=path.join(incoming,batch.name), manifestPath=path.join(dir,'PUBLICAR.json');
    let bytes:Buffer;
    try { if((await lstat(manifestPath)).isSymbolicLink())throw Error('Manifiesto enlazado');bytes=await readFile(manifestPath); }
    catch(e) { if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e; }
    const receipt=path.join(dir,`resultado-${digest(bytes)}.json`);
    try { admit(JSON.parse(await readFile(receipt,'utf8')).results);continue; } catch(e) {if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const results: {source?:string;target?:string;status:string;detail?:string}[]=[];
    try {
      const manifest=JSON.parse(bytes.toString()) as IntakeManifest;
      if(manifest.version!==1 || !manifest.reviewedBy?.trim() || !Array.isArray(manifest.entries) || !manifest.entries.length || manifest.entries.length>500)throw Error('Manifiesto inválido: versión, responsable o tamaño de lote');
      for(const sourceEntry of manifest.entries) {
        const folder = typeof sourceEntry.target === 'string' ? path.posix.dirname(sourceEntry.target) : '';
        const canonicalFolder = folders.get(folder.toLocaleLowerCase('en'));
        const entry = {...sourceEntry,target:canonicalFolder ? canonicalFolder+'/'+path.posix.basename(sourceEntry.target) : sourceEntry.target};
        try {
          validateIntakeTarget(entry.target);
          if(!entry.evidence?.trim() || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.size) || entry.size<=0)throw Error('Falta evidencia, SHA o tamaño');
          const source=await contained(dir,entry.source);
          const before=await stat(source);
          if(!before.isFile() || before.size!==entry.size)throw Error('Tamaño de origen no coincide');
          const content=await readFile(source), after=await stat(source);
          if(after.size!==before.size || after.mtimeMs!==before.mtimeMs || digest(content)!==entry.sha256)throw Error('Origen incompleto o SHA diferente');
          const key=entry.sha256+'|'+identity(entry.target);
          if(known.has(key)){results.push({...entry,status:'duplicate_exact',detail:known.get(key)});continue;}
          await validate(content,path.basename(entry.target));
          const dest=await contained(library,entry.target,true);
          try { const existing=await readFile(dest);if(digest(existing)!==entry.sha256)throw Error('Colisión: destino conservado');results.push({...entry,status:'already_published'});known.set(key,entry.target);continue; }
          catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
          const temporary=path.join(path.dirname(dest),`.intake-${randomUUID()}.pending`);
          try {
            await copyFile(source,temporary);
            if(digest(await readFile(temporary))!==entry.sha256)throw Error('Origen cambió durante copia');
            await chmod(temporary,0o644);
            await link(temporary,dest); // atomic, never replaces a destination
          } finally {await rm(temporary,{force:true});}
          known.set(key,entry.target);folders.set(path.posix.dirname(entry.target).toLocaleLowerCase('en'),path.posix.dirname(entry.target));published++;
          results.push({...entry,status:'published'});
        } catch(e) {results.push({source:entry.source,target:entry.target,status:'review',detail:e instanceof Error?e.message:'Error de validación'});}
      }
    } catch(e) {results.push({status:'review',detail:e instanceof Error?e.message:'Manifiesto inválido'});}
    const temporary=receipt+'.pending';
    await writeFile(temporary,JSON.stringify({batch:batch.name,completedAt:new Date().toISOString(),results},null,2),{mode:0o644});
    await rename(temporary,receipt);
    admit(results);
    process.stdout.write(JSON.stringify({intake:batch.name,published:results.filter(r=>r.status==='published').length,review:results.filter(r=>r.status==='review').length})+'\n');
  }
  return {published,approved};
}
