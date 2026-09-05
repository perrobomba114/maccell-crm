import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import pg from 'pg';
import { extractTechnicalIndex } from '../src/lib/schematics/technical-extractor';
import { indexFileIsCurrent, indexIsCurrent, type TechnicalIndex } from '../src/lib/schematics/unified-index';
import type { SchematicAsset, SchematicCatalog } from '../src/lib/schematics/catalog-types';
import { persistTechnicalIndex } from './technical-index-database';

const root = path.resolve(process.env.SCHEMATICS_ROOT ?? 'upload/schematics');
const stop = new AbortController();
process.once('SIGTERM', () => stop.abort());
process.once('SIGINT', () => stop.abort());
let catalogSignature = '';
async function catalog(client: pg.PoolClient): Promise<SchematicAsset[]> {
  let local: SchematicAsset[] = [];
  let nextSignature = '';
  try { const info=await stat(path.join(root,'catalog.json'));nextSignature=`${info.mtimeMs}:${info.size}`;
    if(nextSignature!==catalogSignature) local = (JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8')) as SchematicCatalog).assets; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  for (const asset of local) {
    // Refresh file facts atomically without overwriting concurrent identity edits.
    await client.query(`INSERT INTO schematics.assets AS previous(id,relative_path,sha256,kind,model_key,metadata) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(id) DO UPDATE SET relative_path=excluded.relative_path,sha256=excluded.sha256,kind=excluded.kind,
      metadata=(previous.metadata - 'detail' - 'components' - 'nets') || jsonb_strip_nulls(jsonb_build_object(
        'relativePath',excluded.relative_path,'sha256',excluded.sha256,'kind',excluded.kind,'name',excluded.metadata->'name',
        'size',excluded.metadata->'size','status',excluded.metadata->'status','detail',excluded.metadata->'detail',
        'components',excluded.metadata->'components','nets',excluded.metadata->'nets'))
        || CASE WHEN previous.sha256<>excluded.sha256 THEN '{"identityVerified":false,"identityVerifiedBy":null,"identityVerifiedAt":null}'::jsonb ELSE '{}'::jsonb END,
      updated_at=CASE WHEN previous.sha256<>excluded.sha256 OR previous.relative_path<>excluded.relative_path THEN now() ELSE previous.updated_at END`, [asset.id,asset.relativePath,asset.sha256,asset.kind,asset.modelKey,JSON.stringify(asset)]);
  }
  catalogSignature=nextSignature;
  return (await client.query<{ metadata: SchematicAsset }>('SELECT metadata FROM schematics.assets ORDER BY kind,relative_path')).rows.map(row => row.metadata);
}
async function cycle(client: pg.PoolClient) {
  const acquired = (await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(748193205) AS locked')).rows[0].locked;
  if (!acquired) return;
  const summary = { indexed: 0, cached: 0, failed: 0, unsupported: 0 };
  try {
    const assets = await catalog(client);
    await mkdir(path.join(root, '.technical'), { recursive: true });
    await mkdir(path.join(root, '.index'), { recursive: true });
    for (const asset of assets) {
      if (stop.signal.aborted) break;
      if (asset.status !== 'ready') { summary.unsupported++; continue; }
      try {
        const actualRoot = await realpath(root), file = await realpath(path.join(actualRoot,asset.relativePath));
        if (!file.startsWith(actualRoot + path.sep)) throw new Error('Archivo fuera de la biblioteca');
        const physical = await stat(file);
        const job = (await client.query<{ status: string; asset_sha256: string }>('SELECT status,asset_sha256 FROM schematics.index_jobs WHERE asset_id=$1', [asset.id])).rows[0];
        const existing = (await client.query<{ payload: TechnicalIndex; updated_at: string }>(`SELECT jsonb_build_object('version',index_version,'assetId',asset_id,'sha256',asset_sha256,'fileMtimeMs',file_mtime_ms,'fileSize',file_size) AS payload,updated_at::text FROM schematics.technical_indexes WHERE asset_id=$1`, [asset.id])).rows[0];
        const current = existing && indexIsCurrent(existing.payload,asset) && indexFileIsCurrent(existing.payload,physical);
        if (current && (!job || job.status === 'indexed') && !process.argv.includes('--force')) { summary.cached++; continue; }
        if (job?.status === 'failed' && job.asset_sha256 === asset.sha256 && !process.argv.includes('--retry-failed') && !process.argv.includes('--force')) continue;
        await client.query(`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status,attempts) VALUES($1,$2,'processing',1)
          ON CONFLICT(asset_id) DO UPDATE SET status='processing',asset_sha256=excluded.asset_sha256,error=NULL,attempts=schematics.index_jobs.attempts+1,updated_at=now()`,[asset.id,asset.sha256]);
        const cachedFile = path.join(root,'.technical',`${asset.id}.json`);
        let index: TechnicalIndex | null = null;
        if (!job && !process.argv.includes('--force')) {
          try { const candidate = JSON.parse(await readFile(cachedFile,'utf8')) as TechnicalIndex; if (indexIsCurrent(candidate,asset) && indexFileIsCurrent(candidate,physical)) index = candidate; }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        const ocrPages = asset.kind === 'pdf' ? (await client.query<{ page_number: number }>("SELECT page_number FROM schematics.pages WHERE asset_id=$1 AND asset_sha256=$2 AND source='ocr'",[asset.id,asset.sha256])).rows.map(row=>row.page_number) : [];
        index ??= await extractTechnicalIndex(asset,file,ocrPages);
        await persistTechnicalIndex(client,asset,index,existing?.updated_at ?? null);
        const pending = `${cachedFile}.${process.pid}.pending`;
        await writeFile(pending,JSON.stringify(index));
        await rename(pending,cachedFile);
        if (asset.kind === 'pdf') {
          const legacy = path.join(root,'.index',`${asset.id}.json`);
          await writeFile(`${legacy}.pending`,JSON.stringify(index.pages.map(page=>({...page,sha256:asset.sha256}))));
          await rename(`${legacy}.pending`,legacy);
        }
        summary.indexed++;
        process.stdout.write(JSON.stringify({asset:asset.name,pages:index.pages.length,components:index.components.length,nets:index.nets.length,status:'indexed'})+'\n');
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0,500) : 'Error al extraer el archivo';
        const status = message.startsWith('INDEX_WRITE_CONFLICT:') ? 'pending' : 'failed';
        await client.query(`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status,error) VALUES($1,$2,$3,$4)
          ON CONFLICT(asset_id) DO UPDATE SET status=excluded.status,error=excluded.error,updated_at=now() WHERE schematics.index_jobs.asset_sha256=excluded.asset_sha256`,[asset.id,asset.sha256,status,message]);
        summary.failed++;
        process.stderr.write(JSON.stringify({asset:asset.name,status,error:message})+'\n');
      }
    }
    if (summary.indexed || summary.failed || !process.argv.includes('--watch')) process.stdout.write(JSON.stringify(summary)+'\n');
  } finally { await client.query('SELECT pg_advisory_unlock(748193205)'); }
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es requerida');
  const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
  try {
    do {
      let client: pg.PoolClient | undefined;
      try { client = await pool.connect(); await cycle(client); }
      catch (error) { if (!process.argv.includes('--watch')) throw error; process.stderr.write(`[TECHNICAL INDEX] ${error instanceof Error ? error.message : 'Fallo de ciclo'}\n`); }
      finally { client?.release(); }
      if (!process.argv.includes('--watch') || stop.signal.aborted) break;
      try { await pause(15_000,undefined,{signal:stop.signal}); } catch (error) { if (!stop.signal.aborted) throw error; }
    } while (!stop.signal.aborted);
  } finally { await pool.end(); }
}
main().catch((error: unknown)=>{process.stderr.write((error instanceof Error ? error.message : 'No se pudo indexar')+'\n');process.exitCode=1;});
