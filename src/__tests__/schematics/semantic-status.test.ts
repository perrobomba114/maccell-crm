import test from 'node:test';
import assert from 'node:assert/strict';
import { readSemanticStatus, type SemanticStatusDependencies } from '../../lib/schematics/semantic-status';
import type { SchematicAsset } from '../../lib/schematics/catalog-types';
import type { RagCoverage } from '../../lib/schematics/rag-library';
const environment = { DATABASE_URL: 'private-db', RAG_DATABASE_URL: 'private-rag', RAG_INTERNAL_API_SECRET: 'private-secret' };
const asset: SchematicAsset = { id:'a',sha256:'a'.repeat(64),name:'phone.pdf',kind:'pdf',status:'ready',relativePath:'sources/iPhone/phone.pdf',model:'phone',modelKey:'phone',size:500 };
const page = {assetId:asset.id,assetSha256:asset.sha256,page:1,contentSha256:'local-digest'};
const ragPage = {...page,chunks:3,status:'READY',documentStatus:'READY'};
const coverage: RagCoverage = {model:{id:'version-uuid',model_name:'BAAI/bge-m3',dimensions:1024},pages:[ragPage],matchedDocuments:1,readyDocuments:1,failedDocuments:0,processingDocuments:0};
function dependencies(): SemanticStatusDependencies {
  return {source:async()=>({assets:[asset],pages:[page]}),vectors:async()=>coverage};
}
test('existing RAG coverage works without a new schematics model variable and without local extraction',async()=>{
  const deps=dependencies();deps.source=async()=>({assets:[asset],pages:[]});
  const result=await readSemanticStatus(environment,deps);
  assert.equal(result.status,'idle');assert.equal(result.source,'cerebro_rag');assert.equal(result.indexablePages,1);
  assert.equal(result.currentChunks,3);assert.equal(result.activeModel,'BAAI/bge-m3');assert.deepEqual(result.missingKeys,[]);
});
test('missing database reports key names only and never calls vectors',async()=>{
  const deps=dependencies();deps.vectors=async()=>{throw new Error('must not connect');};
  const result=await readSemanticStatus({...environment,RAG_DATABASE_URL:undefined},deps);
  assert.equal(result.status,'not_configured');assert.deepEqual(result.missingKeys,['RAG_DATABASE_URL']);assert.equal(result.indexablePages,1);
  assert.equal(JSON.stringify(result).includes('private-'),false);
});
test('missing worker secret still exposes existing read-only RAG coverage',async()=>{
  const result=await readSemanticStatus({...environment,RAG_INTERNAL_API_SECRET:undefined},dependencies());
  assert.equal(result.status,'not_configured');assert.equal(result.currentChunks,3);assert.deepEqual(result.missingKeys,['RAG_INTERNAL_API_SECRET']);
});
test('same PDF page counts once despite different extractors; stale file hashes and non-ready rows never count',async()=>{
  const deps=dependencies();deps.vectors=async()=>({...coverage,pages:[ragPage,{...ragPage,assetSha256:'old',chunks:40},{...ragPage,page:2,status:'FAILED',chunks:80}]});
  const result=await readSemanticStatus(environment,deps);
  assert.equal(result.indexablePages,2);assert.equal(result.pagesWithVectors,1);assert.equal(result.currentChunks,3);assert.equal(result.workerFailedPages,1);assert.equal(result.status,'partial');
});
test('RAG errors preserve technical counts without exposing provider messages',async()=>{
  const deps=dependencies();deps.vectors=async()=>{throw new Error('postgres://private-secret@host');};
  const result=await readSemanticStatus(environment,deps);
  assert.equal(result.status,'unavailable');assert.equal(result.indexablePages,1);assert.equal(result.currentChunks,null);assert.equal(JSON.stringify(result).includes('private-secret'),false);
});
test('missing RAG documents remain pending even before local text indexing',async()=>{
  const deps=dependencies();deps.source=async()=>({assets:[asset],pages:[]});deps.vectors=async()=>({...coverage,pages:[],matchedDocuments:0,readyDocuments:0});
  assert.equal((await readSemanticStatus(environment,deps)).status,'pending');
  deps.vectors=async()=>({...coverage,model:null,pages:[]});assert.equal((await readSemanticStatus(environment,deps)).status,'not_indexed');
  deps.source=async()=>({assets:[],pages:[]});deps.vectors=async()=>({...coverage,pages:[],matchedDocuments:0,readyDocuments:0});assert.equal((await readSemanticStatus(environment,deps)).status,'empty');
});
