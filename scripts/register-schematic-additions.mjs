import {readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import pg from 'pg';

const manifest=JSON.parse(await readFile(new URL('./schematic-additions.json',import.meta.url),'utf8'));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
async function main(){
 const root=await realpath(process.env.SCHEMATICS_ROOT??'upload/schematics');
 let relative=manifest.asset.relativePath,file;
 try{file=await realpath(path.join(root,relative));}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  if(process.env.NODE_ENV==='production'){process.stderr.write('[SCHEMATICS IMPORT] PDF pendiente de carga; se conserva la biblioteca actual\n');return;}
  relative=manifest.localRelativePath;file=await realpath(path.join(root,relative));
 }
 if(!file.startsWith(root+path.sep))throw new Error('Archivo fuera de biblioteca');
 const bytes=await readFile(file);
 if(bytes.length!==manifest.asset.size||createHash('sha256').update(bytes).digest('hex')!==manifest.asset.sha256)throw new Error('El PDF no coincide con el archivo verificado');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const previous=(await client.query('SELECT metadata FROM schematics.assets WHERE id=$1 FOR UPDATE',[manifest.asset.id])).rows[0]?.metadata;
  // This marker records PDF registration; boards may arrive in a later catalog import.
  // Reconcile each missing link on every run without replacing existing associations.
  if(previous&&previous.sha256!==manifest.asset.sha256)throw new Error('Conflicto de archivo: se conserva registro existente');
  const asset={...manifest.asset,relativePath:relative,sourceImportId:manifest.importId};
  await client.query(`INSERT INTO schematics.assets(id,relative_path,sha256,kind,model_key,metadata) VALUES($1,$2,$3,$4,$5,$6)
   ON CONFLICT(id) DO UPDATE SET metadata=schematics.assets.metadata || jsonb_build_object('sourceImportId',$7::text)`,[asset.id,relative,asset.sha256,asset.kind,asset.modelKey,JSON.stringify(asset),manifest.importId]);
  let paired=0,pending=0;
  for(const board of manifest.pairedBoards){
   const current=(await client.query('SELECT metadata FROM schematics.assets WHERE id=$1 FOR UPDATE',[board.id])).rows[0]?.metadata;
   if(!current||current.sha256!==board.sha256){pending++;continue;}
   const boardFile=await realpath(path.join(root,current.relativePath));
   if(!boardFile.startsWith(root+path.sep))throw new Error('Placa fuera de biblioteca');
   if(createHash('sha256').update(await readFile(boardFile)).digest('hex')!==board.sha256)throw new Error('La placa cambió respecto de la evidencia');
   const link={assetId:asset.id,sha256:asset.sha256,sourceSha256:board.sha256,confirmedBy:`technical-review:${manifest.importId}`,confirmedAt:manifest.evidence.reviewedAt};
   const links=current.documentLinks??[];
   if(!links.some(item=>item.assetId===asset.id)){
    await client.query('UPDATE schematics.assets SET metadata=metadata || $2::jsonb,updated_at=now() WHERE id=$1',[board.id,JSON.stringify({documentLinks:[...links,link]})]);paired++;
   }
  }
  await client.query(`INSERT INTO schematics.index_jobs(asset_id,asset_sha256,status) VALUES($1,$2,'pending') ON CONFLICT(asset_id) DO NOTHING`,[asset.id,asset.sha256]);
  await client.query('COMMIT');
  process.stdout.write(`[SCHEMATICS IMPORT] PDF registrado; ${paired} placas vinculadas por evidencia verificada; ${pending} pendientes del catálogo\n`);
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
try{await main();}catch(error){process.stderr.write(`[SCHEMATICS IMPORT] ${error.message}\n`);process.exitCode=1;}finally{await pool.end();}
