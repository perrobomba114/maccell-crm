import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ragAssetManifest, readRagModel, readRagCoverage, searchRagLibrary, type RagQuery } from '../../lib/schematics/rag-library';
import { validatedSemanticMatches } from '../../lib/schematics/search';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
const asset: SchematicAsset = {id:'pdf',sha256:'a'.repeat(64),relativePath:'sources/iPhone/13ProMax.pdf',name:'13ProMax.pdf',kind:'pdf',status:'ready',model:'13 Pro Max',modelKey:'13promax',size:100};
const model = {id:'model-uuid',model_name:'BAAI/bge-m3',dimensions:1024};
function mockQuery(respond:(sql:string,params:readonly unknown[])=>unknown[]):RagQuery {
  return async <T extends Record<string,unknown>>(sql:string,params:readonly unknown[])=>respond(sql,params) as T[];
}
test('only the mount prefix is removed; paths and SHA stay exact, invalid sources excluded',()=>{
  assert.deepEqual(ragAssetManifest([asset]),[{asset_id:'pdf',asset_sha256:asset.sha256,relative_path:'iPhone/13ProMax.pdf'}]);
  assert.equal(ragAssetManifest(['sources/../iPhone/a.pdf','/iPhone/a.pdf','sources/iPhone\\a.pdf'].map(relativePath=>({...asset,relativePath}))).length,0);
  assert.equal(ragAssetManifest([{...asset,status:'locked'},{...asset,sha256:'invalid'},{...asset,kind:'pcbe'}]).length,0);
});
test('active version is explicit from DB; absent, conflicting and unsupported models fail safely',async()=>{
  assert.deepEqual(await readRagModel(mockQuery(()=>[model])),model);
  assert.equal(await readRagModel(mockQuery(()=>[])),null);
  await assert.rejects(()=>readRagModel(mockQuery(()=>[model]),'different-model'));
  await assert.rejects(()=>readRagModel(mockQuery(()=>[model,model])));
  await assert.rejects(()=>readRagModel(mockQuery(()=>[{...model,dimensions:384}])));
});
test('coverage queries match source path AND sha and exclude retired documents and inactive vectors',async()=>{
  const calls:string[]=[];
  const query=mockQuery((sql,params)=>{calls.push(sql);if(sql.startsWith('SELECT id::text'))return[model];
    assert.match(sql,/d.relative_path=a.relative_path AND d.sha256=a.asset_sha256/);
    assert.match(sql,/d.source_type='PDF' AND d.retired_at IS NULL/);
    assert.deepEqual(JSON.parse(params[0] as string),ragAssetManifest([asset]));
    return sql.includes('GROUP BY status')?[{status:'READY',count:1}]:[];
  });
  const result=await readRagCoverage(query,[asset]);assert.equal(result.matchedDocuments,1);assert.equal(result.readyDocuments,1);
  assert.match(calls[2],/c.model_version_id=\$2::uuid/);assert.match(calls[2],/m.active=true/);assert.match(calls[2],/d.status='READY' AND p.status='READY'/);
});
test('search validates RAG page text independently of local extraction and retains exact file and pairing guard',async()=>{
  const pageText='U4400\nPP_VDD_MAIN is a power rail with enough context.';
  const row={asset_id:asset.id,asset_sha256:asset.sha256,page_number:2,page_text:pageText,content:'U4400 PP_VDD_MAIN',score:.9,source:'text'};
  const query=mockQuery((sql,params)=>{
    assert.match(sql,/d.status='READY' AND p.status='READY'/);assert.match(sql,/m.id=\$3::uuid/);assert.equal(params[2],model.id);
    return[row,{...row,asset_sha256:'old'},{...row,page_number:3,content:'invented rail'},{...row,page_number:4,score:NaN}];
  });
  const result=await searchRagLibrary(query,[asset],Array(1024).fill(.1),model,.5);
  assert.equal(result.rows.length,1);assert.equal(result.pages[0].contentSha256,createHash('sha256').update(pageText).digest('hex'));
  assert.equal(validatedSemanticMatches(asset,[asset],result.pages,result.rows,[],.5).length,1);
  const board={...asset,id:'board',kind:'pcbe' as const};
  assert.equal(validatedSemanticMatches(board,[asset],result.pages,result.rows,[],.5).length,0);
  assert.equal(validatedSemanticMatches(board,[asset],result.pages,result.rows,[],.5,new Set([asset.id])).length,1);
  await assert.rejects(()=>searchRagLibrary(query,[asset],[.1],model,.5));
});
