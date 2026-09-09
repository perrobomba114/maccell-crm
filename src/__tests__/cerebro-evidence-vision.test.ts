import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEvidenceVision } from '../lib/cerebro-v2/evidence-vision';
import type { CerebroSource } from '../lib/cerebro-v2/types';

const source:CerebroSource={chunkId:'c',documentId:'d',sourceType:'PDF',authority:'TECHNICAL_DOCUMENT',brand:'MOTOROLA',model:'E7',title:'Esquemático E7',pageNumber:12,workbenchUrl:'/technician/schematics?asset=d',content:'PWRKEY',score:1};

test('visual reading routes a library page through renderer and retains its citation',async()=>{
    let requested:CerebroSource|undefined;
    const result=await loadEvidenceVision([source],[],{requestPage:async input=>{requested=input;return new Uint8Array([1]);},describe:async()=> 'PWRKEY legible, pin ilegible'});
    assert.equal(requested,source);
    assert.match(result.facts,/E1, Esquemático E7, página 12/);
    assert.match(result.facts,/pin ilegible/);
});

test('bounded vision reports skipped attachments and failed page reading',async()=>{
    let count=0;
    const result=await loadEvidenceVision([],['one','two','three'],{requestPage:async()=>new Uint8Array(),describe:async()=>{count++;return 'Visible';}});
    assert.equal(count,2);
    assert.match(result.warnings.join(' '),/primeras dos/);
    const failed=await loadEvidenceVision([source],[],{requestPage:async()=>{throw new Error('not found');},describe:async()=> 'unused'});
    assert.equal(failed.facts,'');
    assert.match(failed.warnings[0],/página 12/);
});

test('bounded repair context preserves the intervention and verification after a long intake', async () => {
    const { buildEvidenceContext }=await import('../lib/cerebro-v2/diagnostic-prompt');
    const context=buildEvidenceContext([{...source,sourceType:'REPAIR',content:`PROBLEMA: ${'Ingreso extenso. '.repeat(300)}\nDIAGNOSTICO: batería defectuosa\nSOLUCION: Cambio de batería\nVERIFICACION: Probado con tres arranques correctos`,pageNumber:null}]);
    assert.match(context,/Cambio de batería/);
    assert.match(context,/tres arranques correctos/);
});
