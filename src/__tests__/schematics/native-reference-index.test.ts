import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { jsPDF } from 'jspdf';
import { nativeReferencePages } from '../../lib/schematics/native-reference-index';
import { indexReferenceMatches } from '../../lib/schematics/unified-index';
import { searchSchematicReferences } from '../../lib/schematics/schematic-reference-search';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';

test('an unindexed real PDF exposes exact reference pages and coordinates, with SHA validation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'schematic-native-test-'));
 try {
  const doc=new jsPDF();doc.text('U40001',20,30);doc.addPage();doc.text('U4000 PP_VDD_MAIN',30,40);
  const bytes=Buffer.from(doc.output('arraybuffer'));
  await writeFile(path.join(root,'schematic.pdf'),bytes);
  const asset:SchematicAsset={id:'a'.repeat(64),sha256:createHash('sha256').update(bytes).digest('hex'),kind:'pdf',status:'ready',relativePath:'schematic.pdf',size:bytes.length,name:'schematic.pdf',model:'iPhone 11',modelKey:'iphone11'};
  const pages=await nativeReferencePages(asset,root);
  const hits=indexReferenceMatches(pages,'U4000');
  assert.deepEqual(hits.map(hit=>hit.page),[2]);
  assert.ok(hits[0].boxes.some(box=>box.text==='U4000' && box.x>0 && box.y>0));
  assert.deepEqual(await nativeReferencePages(asset,root),pages);
  await assert.rejects(nativeReferencePages({...asset,sha256:'b'.repeat(64)},root),/cambió/);
 } finally {await rm(root,{recursive:true,force:true});}
});

test('reference navigation can switch schematic within the same board model without searching unrelated documents',async()=>{
 const board:SchematicAsset={id:'board',kind:'pcbe',sha256:'board',name:'iPhone 11.pcbe',brand:'APPLE',model:'iPhone 11',modelKey:'iphone11',relativePath:'board.pcbe',size:1,status:'ready'};
 const pdf:SchematicAsset={...board,id:'pdf',kind:'pdf',sha256:'pdf',name:'schematic.pdf'};
 const alternate={...pdf,id:'alternate',sha256:'alternate'};
 const other={...pdf,id:'other',brand:'SAMSUNG'};
 const image={...pdf,id:'image',name:'image.pdf'};
 const visited:string[]=[];
 const result=await searchSchematicReferences(board,pdf.id,[other,image,alternate,pdf],'C100',async asset=>{
  visited.push(asset.id);return [{page:4,text:'C100',source:'text',boxes:[]}];
 });
 assert.deepEqual(visited,['alternate']);assert.equal(result?.asset.id,'alternate');assert.equal(result?.matches[0].page,4);
});
