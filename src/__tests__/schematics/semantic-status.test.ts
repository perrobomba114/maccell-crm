import test from 'node:test';
import assert from 'node:assert/strict';
import { readSemanticStatus, type SemanticStatusDependencies } from '../../lib/schematics/semantic-status';

const environment = { DATABASE_URL: 'private-db', RAG_DATABASE_URL: 'private-rag', RAG_INTERNAL_API_SECRET: 'private-secret', SCHEMATICS_EMBEDDING_VERSION: 'model-v1' };
const page = { assetId: 'a', assetSha256: 'file-v1', page: 1, contentSha256: 'text-v1' };
function dependencies(): SemanticStatusDependencies {
  return {
    pages: async () => [page, {...page, page: 2}],
    vectors: async () => ({ tableExists: true, chunks: [ {...page, chunks: 3} ], worker: {status:'idle',counters:{failed:0,model:'model-v1'}} }),
  };
}
test('missing configuration reports only variable names and never connects to the RAG database', async () => {
  const deps=dependencies();deps.vectors=async()=>{throw new Error('should not connect');};
  const result=await readSemanticStatus({...environment,RAG_INTERNAL_API_SECRET:' ',SCHEMATICS_EMBEDDING_VERSION:undefined},deps);
  assert.equal(result.status,'not_configured');assert.equal(result.indexablePages,2);
  assert.deepEqual(result.missingKeys,['RAG_INTERNAL_API_SECRET','SCHEMATICS_EMBEDDING_VERSION']);
  assert.equal(JSON.stringify(result).includes('private-'),false);
});
test('coverage counts only matching current asset and page hashes under the explicit model', async () => {
  const deps=dependencies();let requested='';
  deps.vectors=async model=>{requested=model;return {tableExists:true,chunks:[{...page,chunks:3},{...page,assetSha256:'old-file',page:2,chunks:8},{...page,contentSha256:'old-text',chunks:7},{...page,assetId:'deleted',chunks:5}],worker:{status:'idle',counters:{model,failed:0}}};};
  const result=await readSemanticStatus(environment,deps);
  assert.equal(requested,'model-v1');assert.equal(result.currentChunks,3);assert.equal(result.pagesWithVectors,1);
  assert.equal(result.pagesWithoutVectors,1);assert.equal(result.status,'pending');
});
test('RAG failure does not expose credentials or discard available technical page counts', async () => {
  const deps=dependencies();deps.vectors=async()=>{throw new Error('postgres://private-secret@host');};
  const result=await readSemanticStatus(environment,deps);
  assert.equal(result.status,'unavailable');assert.equal(result.indexablePages,2);assert.equal(result.currentChunks,null);
  assert.equal(JSON.stringify(result).includes('private-secret'),false);
});
test('missing table differs from empty index and worker failures are restricted to the selected model', async () => {
  const deps=dependencies();deps.vectors=async()=>({tableExists:false,chunks:[],worker:null});
  assert.equal((await readSemanticStatus(environment,deps)).status,'not_indexed');
  deps.vectors=async()=>({tableExists:true,chunks:[],worker:{status:'partial',counters:{model:'model-v1',failed:4,password:'hidden'}}});
  const failed=await readSemanticStatus(environment,deps);assert.equal(failed.workerFailedPages,4);assert.equal(failed.status,'partial');assert.equal(JSON.stringify(failed).includes('hidden'),false);
  deps.vectors=async()=>({tableExists:true,chunks:[],worker:{status:'failed',counters:{model:'old-model',failed:40}}});
  const old=await readSemanticStatus(environment,deps);assert.equal(old.workerFailedPages,null);assert.equal(old.workerStatus,null);
});
test('source failures remain unavailable and empty libraries are not reported as completed indexing', async () => {
  const deps=dependencies();deps.pages=async()=>{throw new Error('private-db');};
  const result=await readSemanticStatus(environment,deps);assert.equal(result.status,'unavailable');assert.equal(result.indexablePages,null);
  deps.pages=async()=>[];deps.vectors=async()=>({tableExists:true,chunks:[],worker:null});
  assert.equal((await readSemanticStatus(environment,deps)).status,'empty');
});
