import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveLibrarySources } from '../lib/cerebro-v2/library-retrieval';
import { safeWorkbenchUrl } from '../lib/cerebro-v2/source-links';
const input = {brand:'SAMSUNG', model:'SMA125M', text:'no carga USB', embedding:[]};
const assetId = 'a'.repeat(64);
const row = {assetId:assetId, metadata:{id:assetId,brand:'Samsung',model:'SM-A125M',kind:'pcbe',name:'A12',sha256:'abc',identityVerified:true,status:'ready'}, payload:{version:1,assetId:assetId,sha256:'abc',pages:[],components:[{id:'c1',name:'U100',kind:'IC',pads:[{id:'p1',name:'1',netIndex:0}]}],nets:[{id:0,name:'USB_VBUS'}]}};
test('library retrieves exact verified board symptom evidence and safe deep link',async()=>{
 const result=await retrieveLibrarySources(input,async()=>[row]);
 assert.equal(result.length,1); assert.equal(result[0].sourceType,'BOARD'); assert.match(result[0].content,/USB_VBUS/); assert.match(result[0].workbenchUrl!,/board=a{64}/);
});
test('library rejects foreign and unverified identity even from adapter',async()=>{
 for(const metadata of [{...row.metadata,brand:'Apple'},{...row.metadata,model:'SM-A125F'},{...row.metadata,identityVerified:false}]) assert.deepEqual(await retrieveLibrarySources(input,async()=>[{...row,metadata}]),[]);
});
test('library rejects stale hash and unrelated symptoms',async()=>{
 assert.deepEqual(await retrieveLibrarySources(input,async()=>[{...row,payload:{...row.payload,sha256:'old'}}]),[]);
 assert.deepEqual(await retrieveLibrarySources({...input,text:'camera'},async()=>[row]),[]);
});
test('workbench links reject external URLs and unexpected parameters',()=>{
 assert.equal(safeWorkbenchUrl('https://evil.test'),undefined);
 assert.equal(safeWorkbenchUrl('/technician/schematics?board=x&redirect=evil'),undefined);
 assert.equal(safeWorkbenchUrl(`/technician/schematics?board=${assetId}&component=U100`),`/technician/schematics?board=${assetId}&component=U100`);
});

import { retrieveTechnicalEvidence } from '../lib/cerebro-v2/resilient-retrieval';
import { toPublicSources } from '../lib/cerebro-v2/message-content';
import { shouldLoadVisualEvidence } from '../lib/cerebro-v2/visual-evidence';
test('worker failure preserves indexed evidence with explicit degradation', async()=>{
 const indexed=await retrieveLibrarySources(input,async()=>[row]);
 const result=await retrieveTechnicalEvidence(input,{embed:async()=>{throw new Error('offline');},rag:async()=>[],library:async()=>indexed});
 assert.deepEqual(result.sources,indexed); assert.deepEqual(result.unavailable,['búsqueda semántica']);
 assert.equal(toPublicSources(indexed)[0].workbenchUrl,indexed[0].workbenchUrl);
});
test('missing index table preserves existing evidence and reports library unavailable',async()=>{
 const indexed=await retrieveLibrarySources(input,async()=>[row]);
 const result=await retrieveTechnicalEvidence(input,{embed:async()=>[],rag:async()=>indexed,library:async()=>{throw new Error('missing relation');}});
 assert.deepEqual(result.sources,indexed); assert.deepEqual(result.unavailable,['biblioteca técnica']);
});
test('indexed PDF keeps OCR label and never calls legacy page image endpoint',async()=>{
 const pdf={...row,metadata:{...row.metadata,kind:'pdf'},payload:{...row.payload,components:[],pages:[{page:3,text:'USB charging circuit test',source:'ocr'}]}};
 const sources=await retrieveLibrarySources(input,async()=>[pdf]);
 assert.match(sources[0].content,/EVIDENCIA OCR/); assert.match(sources[0].workbenchUrl!,/pdf=a{64}&page=3/);
 assert.equal(shouldLoadVisualEvidence(sources[0]),false);
});
test('reference U10 must not retrieve U100',async()=>{
 assert.deepEqual(await retrieveLibrarySources({...input,text:'U10',componentCodes:['U10']},async()=>[row]),[]);
});
test('sparse net ids retain correct electrical network',async()=>{
 const sparse={...row,payload:{...row.payload,nets:[{id:17,name:'USB_VBUS'}],components:[{...row.payload.components[0],pads:[{id:'p1',name:'1',netIndex:17}]}]}};
 assert.match((await retrieveLibrarySources(input,async()=>[sparse]))[0].content,/USB_VBUS/);
});
test('safe source links require unique params, sha256 ids and bounded page',()=>{
 const id='a'.repeat(64);
 for(const url of [`/technician/schematics?board=x`,`/technician/schematics?board=${id}&board=${id}`,`/technician/schematics?pdf=${id}&page=9007199254740992`]) assert.equal(safeWorkbenchUrl(url),undefined);
});
import { buildCerebroSystemPrompt } from '../lib/cerebro-v2/prompt';
test('bounded context preserves board and repair citations in public source order',async()=>{
 const [board]=await retrieveLibrarySources(input,async()=>[row]);
 const sources=[{...board,sourceType:'PDF' as const,title:'manual',content:'X'.repeat(8000)},board,{...board,sourceType:'REPAIR' as const,content:'REPAIR_CONFIRMED_MARKER'}];
 const prompt=buildCerebroSystemPrompt(input.brand,input.model,sources);
 assert.match(prompt,/REPAIR_CONFIRMED_MARKER/); assert.match(prompt,/USB_VBUS/);
 assert.match(prompt,/EVIDENCIA E2 ---\n[^\n]*"sourceType":"BOARD"/);
});
test('mixing many PDFs retains an existing repair',async()=>{
 const [board]=await retrieveLibrarySources(input,async()=>[row]);
 const repair={...board,sourceType:'REPAIR' as const,documentId:'repair'};
 const sources=await retrieveTechnicalEvidence({...input,limit:4},{embed:async()=>[],library:async()=>[board,board],rag:async()=>[{...board,sourceType:'PDF'}, {...board,sourceType:'PDF'},repair]});
 assert.ok(sources.sources.some(source=>source.documentId==='repair'));
});
