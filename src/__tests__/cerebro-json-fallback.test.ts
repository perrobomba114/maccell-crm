import assert from 'node:assert/strict';
import test from 'node:test';
import { createFallbackModel } from '@/lib/cerebro/models';

for (const bad of ['', '{"assessment":', '{"ok":true}']) {
    test(`structured generation retries unusable output ${JSON.stringify(bad)}`, async () => {
        const attempts: string[]=[];
        const instance=(id:string,text:string,finishReason:string)=>({
            doGenerate:async()=>{attempts.push(id);return {content:[{type:'text',text}],finishReason};},
            doStream:async()=>({stream:new ReadableStream()}),
        });
        const fallback=createFallbackModel([
            {instance:instance('first',bad,bad.endsWith('}')?'length':'stop'),label:'first',keyId:'first'},
            {instance:instance('second','{"ok":true}','stop'),label:'second',keyId:'second'},
        ],()=>undefined);
        const result=await fallback.doGenerate({responseFormat:{type:'json'}});
        assert.deepEqual(attempts,['first','second']);
        assert.deepEqual(result.content,[{type:'text',text:'{"ok":true}'}]);
    });
}

test('plain text generation does not require JSON',async()=>{
    const fallback=createFallbackModel([{instance:{
        doGenerate:async()=>({content:[{type:'text',text:'Respuesta técnica'}],finishReason:'stop'}),
        doStream:async()=>({stream:new ReadableStream()}),
    },label:'first',keyId:'first'}],()=>undefined);
    assert.ok(await fallback.doGenerate({}));
});
