import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveLibrarySources } from '../lib/cerebro-v2/library-retrieval';
import { safeWorkbenchUrl } from '../lib/cerebro-v2/source-links';
const input = {brand:'SAMSUNG', model:'SM-A125M', text:'no carga USB', embedding:[]};
const assetId = 'a'.repeat(64);
const row = {assetId:assetId, metadata:{id:assetId,brand:'Samsung',model:'SM-A125M',kind:'pcbe',name:'A12',sha256:'abc',identityVerified:true,status:'ready'}, payload:{version:1,assetId:assetId,sha256:'abc',pages:[],components:[{id:'c1',name:'U100',kind:'IC',pads:[{id:'p1',name:'1',netIndex:0}]}],nets:[{id:0,name:'USB_VBUS'}]}};
test('library retrieves exact verified board symptom evidence and safe deep link',async()=>{
 const result=await retrieveLibrarySources(input,async()=>[row]);
 assert.equal(result.length,1); assert.equal(result[0].sourceType,'BOARD'); assert.match(result[0].content,/USB_VBUS/); assert.match(result[0].workbenchUrl!,/board=a{64}/);
});
test('library rejects foreign and unverified identity even from adapter',async()=>{
 for(const metadata of [{...row.metadata,brand:'Apple'},{...row.metadata,model:'SM-A125F'},{...row.metadata,identityVerified:false}]) assert.deepEqual(await retrieveLibrarySources(input,async()=>[{...row,metadata}]),[]);
});
test('library rejects E7 Plus for E7 unless the variant is an explicit alias', async () => {
 const e7Plus={...row,metadata:{...row.metadata,brand:'Motorola',model:'MOTO E7 PLUS',name:'Moto E7 Plus power.pdf'}};
 const query={brand:'MOTOROLA',model:'MOTO E7',modelAliases:['E7','MOTO E7'],text:'power no enciende',embedding:[]};
 assert.deepEqual(await retrieveLibrarySources(query,async()=>[e7Plus]),[]);
});
test('library rejects a longer hardware code that only starts with the requested code', async () => {
 const a125fn={...row,metadata:{...row.metadata,model:'SM-A125FN',name:'SM-A125FN service.pdf'}};
 const query={brand:'SAMSUNG',model:'SM-A125F',modelAliases:['SM-A125F'],text:'power no enciende',embedding:[]};
 assert.deepEqual(await retrieveLibrarySources(query,async()=>[a125fn]),[]);
});

test('library preserves the actual source model instead of relabeling it as the query', async () => {
 const source={...row,metadata:{...row.metadata,model:'SM-A125M',aliases:['GALAXY A12'],name:'A12 charging.pdf'}};
 const query={...input,model:'GALAXY A12',modelAliases:['GALAXY A12','SM-A125M']};
 const [result]=await retrieveLibrarySources(query,async()=>[source]);
 assert.equal(result.model,'SM-A125M');
});
test('library rejects stale hash and unrelated symptoms',async()=>{
 assert.deepEqual(await retrieveLibrarySources(input,async()=>[{...row,payload:{...row.payload,sha256:'old'}}]),[]);
 assert.deepEqual(await retrieveLibrarySources({...input,text:'camera'},async()=>[row]),[]);
});
test('library query reads the asset name from metadata instead of a missing table column', async () => {
 let emittedSql = '';
 await retrieveLibrarySources(input, async (sql) => {
  emittedSql = sql;
  return [];
 });
 assert.match(emittedSql, /a\.metadata->>'name'/);
 assert.doesNotMatch(emittedSql, /a\.name/);
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
 assert.deepEqual(result.sources,indexed); assert.deepEqual(result.unavailable,['búsqueda semántica','búsqueda de reparaciones históricas']);
 assert.equal(toPublicSources(indexed)[0].workbenchUrl,indexed[0].workbenchUrl);
});
test('missing index table preserves existing evidence and reports library unavailable',async()=>{
 const indexed=await retrieveLibrarySources(input,async()=>[row]);
 const result=await retrieveTechnicalEvidence(input,{embed:async()=>[],rag:async()=>indexed,library:async()=>{throw new Error('missing relation');}});
 assert.deepEqual(result.sources,indexed); assert.deepEqual(result.unavailable,['biblioteca técnica','búsqueda de reparaciones históricas']);
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
 const sources=[{...board,sourceType:'PDF' as const,title:'manual',content:'X'.repeat(8000)},board,{...board,sourceType:'REPAIR' as const,content:'PROBLEMA: no carga\nDIAGNOSTICO: pin dañado\nSOLUCION: cambio de pin REPAIR_CONFIRMED_MARKER'}];
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
test('balanced evidence keeps up to three relevant repairs and deduplicates mirrored PDFs', async () => {
 const [board]=await retrieveLibrarySources(input,async()=>[row]);
 const repairs=Array.from({length:4},(_,index)=>({...board,chunkId:`repair-${index}`,documentId:`repair-${index}`,sourceType:'REPAIR' as const,title:`Repair ${index}`,content:'PROBLEMA: no carga\nDIAGNOSTICO: puerto dañado\nSOLUCION: reemplazo del pin de carga\nVERIFICACION: carga estable'}));
 const pdf={...board,sourceType:'PDF' as const,title:'A12 service manual',pageNumber:4};
 const mirrored={...pdf,chunkId:'mirror',documentId:'mirror',model:'GALAXY A12'};
 const result=await retrieveTechnicalEvidence({...input,limit:6},{embed:async()=>[],library:async()=>[pdf],rag:async()=>[mirrored,...repairs]});
 assert.equal(result.sources.filter(source=>source.sourceType==='REPAIR').length,3);
 assert.equal(result.sources.filter(source=>source.sourceType==='PDF').length,1);
});
test('schematic matches by title when page text is empty and produces workbench deep link',async()=>{
 const unextractedPdf={
  assetId:'b'.repeat(64),
  metadata:{id:'b'.repeat(64),brand:'SAMSUNG',model:'SM-A037M',aliases:['SM-A037','A03S'],kind:'pdf',name:'Sm-a037 lineas de backlight.pdf',sha256:'def',identityVerified:true,status:'ready'},
  payload:{version:1,assetId:'b'.repeat(64),sha256:'def',pages:[],components:[],nets:[]}
 };
 const query={brand:'Samsung',model:'SM-A037M',modelAliases:['SM-A037','A03S'],text:'lineas de backlight falla imagen',embedding:[]};
 const sources=await retrieveLibrarySources(query,async()=>[unextractedPdf]);
 assert.equal(sources.length,1);
 assert.equal(sources[0].sourceType,'PDF');
 assert.match(sources[0].title,/Sm-a037 lineas de backlight/);
 assert.match(sources[0].workbenchUrl!,/pdf=b{64}&page=1/);
 assert.match(sources[0].content,/Documento técnico/);
});
test('jargon query expansion maps tail plug to charging circuit and matches document',async()=>{
 const chargingPdf={
  assetId:'c'.repeat(64),
  metadata:{id:'c'.repeat(64),brand:'Apple',model:'iPhone 13 Pro',aliases:['13P'],kind:'pdf',name:'Iphone 13 pro not charging fault.pdf',sha256:'13p',identityVerified:true,status:'ready'},
  payload:{version:1,assetId:'c'.repeat(64),sha256:'13p',pages:[],components:[],nets:[]}
 };
 const query={brand:'Apple',model:'iPhone 13 Pro',modelAliases:['13P'],text:'tail plug dock flex no carga',embedding:[]};
 const sources=await retrieveLibrarySources(query,async()=>[chargingPdf]);
 assert.equal(sources.length,1);
 assert.match(sources[0].title,/Iphone 13 pro not charging fault/);
 assert.match(sources[0].workbenchUrl!,/pdf=c{64}&page=1/);
});

test('retrieves Motorola G22 and XT2231 schematics with short model tokens', async () => {
  const g22Pdf = {
    assetId: 'd'.repeat(64),
    metadata: { id: 'd'.repeat(64), brand: 'Motorola', model: 'Moto g22', kind: 'pdf', name: 'Esquematico completo xt2231-x (moto g22).pdf', sha256: 'g22', identityVerified: true, status: 'ready' },
    payload: { version: 1, assetId: 'd'.repeat(64), sha256: 'g22', pages: [{ page: 2, text: 'backlight display power circuit' }], components: [], nets: [] }
  };
  const query = { brand: 'MOTOROLA', model: 'MOTO G22', modelAliases: ['G22', 'MOTO G22', 'XT2231'], text: 'backlight display', embedding: [] };
  const sources = await retrieveLibrarySources(query, async () => [g22Pdf]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].sourceType, 'PDF');
  assert.match(sources[0].title, /xt2231-x/);
});

test('retrieves Samsung A54 and A10 documents with short alphanumeric tokens', async () => {
  const a54Pdf = {
    assetId: 'e'.repeat(64),
    metadata: { id: 'e'.repeat(64), brand: 'Samsung', model: 'Samsung A54 5G SM-A546B', kind: 'pdf', name: 'Sm-a546b_esquematico completo.pdf', sha256: 'a54', identityVerified: true, status: 'ready' },
    payload: { version: 1, assetId: 'e'.repeat(64), sha256: 'a54', pages: [{ page: 5, text: 'sub board USB charging vbus circuit' }], components: [], nets: [] }
  };
  const query = { brand: 'SAMSUNG', model: 'A54', modelAliases: ['A54', 'GALAXY A54', 'SM-A546', 'SM-A546B'], text: 'USB charging vbus', embedding: [] };
  const sources = await retrieveLibrarySources(query, async () => [a54Pdf]);
  assert.equal(sources.length, 1);
  assert.match(sources[0].title, /Sm-a546b/);
});

test('retrieves LG and Huawei documents across brand aliases', async () => {
  const k40Pdf = {
    assetId: 'f'.repeat(64),
    metadata: { id: 'f'.repeat(64), brand: 'LG', model: 'K40s', aliases: ['LM-X430'], kind: 'pdf', name: 'Lg k40s schematics.pdf', sha256: 'k40', identityVerified: true, status: 'ready' },
    payload: { version: 1, assetId: 'f'.repeat(64), sha256: 'k40', pages: [{ page: 1, text: 'audio codec speaker amplifier' }], components: [], nets: [] }
  };
  const lgQuery = { brand: 'LG', model: 'K40s', modelAliases: ['K40S', 'LG K40S', 'LM-X430'], text: 'audio codec speaker', embedding: [] };
  const lgSources = await retrieveLibrarySources(lgQuery, async () => [k40Pdf]);
  assert.equal(lgSources.length, 1);
  assert.match(lgSources[0].title, /k40s/i);

  const honorPdf = {
    assetId: '1'.repeat(64),
    metadata: { id: '1'.repeat(64), brand: 'HUAWEI', model: 'Honor 10 lite', kind: 'pdf', name: 'Honor 10 lite schematic.pdf', sha256: 'h10', identityVerified: true, status: 'ready' },
    payload: { version: 1, assetId: '1'.repeat(64), sha256: 'h10', pages: [{ page: 1, text: 'camera sensor power lines' }], components: [], nets: [] }
  };
  const huaweiQuery = { brand: 'HONOR', model: 'Honor 10 lite', modelAliases: ['HONOR 10 LITE', 'HUAWEI HONOR 10 LITE'], text: 'camera sensor', embedding: [] };
  const huaweiSources = await retrieveLibrarySources(huaweiQuery, async () => [honorPdf]);
  assert.equal(huaweiSources.length, 1);
  assert.match(huaweiSources[0].title, /Honor 10 lite/i);
});
