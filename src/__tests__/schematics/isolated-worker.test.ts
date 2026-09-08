import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('isolated worker reads its mounted connection as literal data',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'isolated-index-'));
 try{
  await copyFile('scripts/start-isolated-technical-worker.mjs',path.join(root,'start.mjs'));
  const value='postgresql://test:literal$NOT_EXPANDED@host/db?x=1&y=2';
  await writeFile(path.join(root,'worker.env'),`DATABASE_URL=${value}\n`);
  await writeFile(path.join(root,'technical-worker.cjs'),'process.stdout.write(process.env.DATABASE_URL)');
  const {DATABASE_URL:_ignored,...env}=process.env;
  const result=await promisify(execFile)(process.execPath,[path.join(root,'start.mjs')],{env:{...env,SCHEMATICS_WORKER_ENV_FILE:path.join(root,'worker.env')}});
  assert.equal(result.stdout,value);
 }finally{await rm(root,{recursive:true,force:true});}
});
