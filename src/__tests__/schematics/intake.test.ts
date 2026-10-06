import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {workerCyclePauseMs} from '../../../scripts/technical-worker-queue';
import {processIntake,validateIntakeTarget,validateIntakeContent} from '../../../scripts/schematic-intake';
import {discoverPhysicalAssets} from '../../lib/schematics/physical-inventory';

test('canonical targets keep regional codes and reject conflicting/unknown identities',()=>{
 for(const code of ['F','M','G'])validateIntakeTarget(`pdf/Samsung/A02 SM-A022${code}/circuit.pdf`);
 validateIntakeTarget('pcbe/iPhone/14 Pro Max/AP.pcbe');
 for(const target of ['pdf/Samsung/A02 SM-A025F/a.pdf','pdf/Samsung/A02/a.pdf','pdf/Samsung/A02 SM-A99999/a.pdf','pdf/Apple/iPhone/14 Pro Max/a.pdf','pcbe/iPhone/iPhone 14 Pro Max/a.pcbe','pdf/iPhone/../a.pdf','pdf/iPhone/14 Pro Max/a.pcbe'])assert.throws(()=>validateIntakeTarget(target),target);
});

test('intake is opt-in, rejects changed bytes and collisions, preserves sources, resumes idempotently',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'schematic-intake-'));
 const batch=path.join(root,'sources','.incoming-scraping','test');
 const content=Buffer.from('%PDF-1.7 test fixture');
 const sha256=createHash('sha256').update(content).digest('hex');
 const entry={source:'input.pdf',target:'pdf/Samsung/A02 SM-A022M/service.pdf',sha256,size:content.length,evidence:'Modelo y código leídos en portada'};
 try{
  await mkdir(batch,{recursive:true});await writeFile(path.join(batch,entry.source),content);
  const validate=async()=>{};
  assert.equal((await processIntake(root,[],validate)).published,0);
  await writeFile(path.join(batch,'PUBLICAR.json'),JSON.stringify({version:1,reviewedBy:'test',entries:[entry,{...entry,target:'pdf/Samsung/A02 SM-A022F/bad.pdf',sha256:'a'.repeat(64)},{...entry,source:'../escape.pdf'}]}));
  const first=await processIntake(root,[],validate);assert.equal(first.published,1);assert(first.approved.has('sources/'+entry.target));
  assert.deepEqual(await readFile(path.join(root,'sources',entry.target)),content);
  assert.deepEqual(await readFile(path.join(batch,entry.source)),content);
  const repeated=await processIntake(root,[],validate);assert.equal(repeated.published,0);assert.equal(repeated.approved.size,1);
  const receipts=(await readdir(batch)).filter(n=>n.startsWith('resultado-'));
  const result=JSON.parse(await readFile(path.join(batch,receipts[0]),'utf8'));
  assert.deepEqual(result.results.map((r:{status:string})=>r.status),['published','review','review']);
  const different=Buffer.from('%PDF-1.7 different bytes');await writeFile(path.join(batch,'other.pdf'),different);
  await writeFile(path.join(batch,'PUBLICAR.json'),JSON.stringify({version:1,reviewedBy:'test',entries:[{...entry,source:'other.pdf',size:different.length,sha256:createHash('sha256').update(different).digest('hex')}]}));
  assert.equal((await processIntake(root,[],validate)).published,0);
  assert.deepEqual(await readFile(path.join(root,'sources',entry.target)),content);
  await mkdir(path.join(root,'sources','CURSO'),{recursive:true});await writeFile(path.join(root,'sources','CURSO','course.pdf'),content);
  await writeFile(path.join(root,'sources','loose.pdf'),content);
  const assets=await discoverPhysicalAssets(root,[],first.approved);
  assert.deepEqual(assets.map(a=>a.relativePath),['sources/'+entry.target]);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('intake refuses source symlinks and false board downloads',async()=>{
 await assert.rejects(validateIntakeContent(Buffer.from('catalog html'),'board.pcbe'));
 await assert.rejects(validateIntakeContent(Buffer.from('not a PDF'),'a.pdf'));
 const root=await mkdtemp(path.join(tmpdir(),'intake-link-'));
 try{
  const batch=path.join(root,'sources','.incoming-scraping','test');await mkdir(batch,{recursive:true});
  const bytes=Buffer.from('%PDF fake');await writeFile(path.join(root,'outside.pdf'),bytes);await symlink(path.join(root,'outside.pdf'),path.join(batch,'linked.pdf'));
  await writeFile(path.join(batch,'PUBLICAR.json'),JSON.stringify({version:1,reviewedBy:'test',entries:[{source:'linked.pdf',target:'pdf/iPhone/14 Pro Max/a.pdf',evidence:'test',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]}));
  assert.equal((await processIntake(root,[],async()=>{})).published,0);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('continuous worker pause stays bounded under invalid configuration',()=>{
 assert.equal(workerCyclePauseMs('300000'),300000);
 for(const value of [undefined,'invalid','0','-1'])assert.equal(workerCyclePauseMs(value),15000);
 assert.equal(workerCyclePauseMs('9000000'),900000);
});
