import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseRepair, type DiagnosisDependencies } from '@/lib/cerebro-v2/diagnosis-service';
import { latestCerebroTurn, parseCerebroChatRequest } from '@/lib/cerebro-v2/chat-contract';
import type { CerebroSource } from '@/lib/cerebro-v2/types';

const repair = {ticketNumber:'fixture',deviceBrand:'MOTOROLA',deviceModel:'MOTO E7',observations:[],diagnosis:null,isWet:false,isWarranty:false,problemDescription:'No carga'};
const input = {repair,history:[],text:'¿Por dónde empiezo con el síntoma de recepción?',images:[],messageId:'turn'};
const unexpected = async (): Promise<never> => { throw new Error('Dependencia inesperada'); };
const offline: DiagnosisDependencies = {retrieve:unexpected,vision:unexpected,draft:unexpected};

test('el primer paso distingue síntomas sin IA ni documentos y el segundo incorpora el resultado del banco',async()=>{
    const result = await diagnoseRepair(input, offline);
    const question = result.metadata.diagnosticPlan!;
    assert.match(question.question,/cable y cargador/);
    assert.deepEqual(result.metadata.retrievalWarnings,[]);
    let prompt = '';
    const next = await diagnoseRepair({...input,history:[{id:'turn',role:'user',content:input.text},{id:'reply',role:'assistant',content:result.text,question:question.question}],
        messageId:'turn-2',text:question.options[0],answerContext:{question:question.question,conditions:question.conditions}},
        {...offline,cases:async()=>[],vision:async()=>({facts:'',warnings:[]}),draft:async(value)=>{prompt=value;throw new Error('offline')}});
    assert.ok(prompt.includes(question.options[0]));
    assert.notEqual(next.metadata.diagnosticPlan?.question,question.question);
    assert.equal(next.metadata.provider,'unavailable');
});

test('localiza el componente en el boardview exacto y descarta otra variante y coincidencias de título',async()=>{
    const id = 'a'.repeat(64);
    const source:CerebroSource={sourceType:'BOARD',documentId:id,chunkId:'component',authority:'TECHNICAL_DOCUMENT',brand:'MOTOROLA',model:'MOTO E7',title:'Placa',score:1,pageNumber:null,content:'Componente J100',workbenchUrl:`/technician/schematics?board=${id}&component=J100`};
    for (const found of [true,false]) {
        const result=await diagnoseRepair({...input,text:'¿Dónde está J100?'},{...offline,retrieve:async()=>({sources:[{...source,model:'MOTO E7 PLUS'},{...source,workbenchUrl:'/technician/schematics?board=board'},...(found?[source]:[])],unavailable:[]})});
        assert.equal(result.metadata.provider,'board-index');
        assert.equal(result.sources.length,found?1:0);
        if(found) assert.equal(result.metadata.sources[0].workbenchUrl,source.workbenchUrl);
        else assert.match(result.text,/no devolvió una ubicación verificable/);
    }
});

test('descarta un diagnóstico inventado incluso cuando el designador aparece solo en la explicación',async()=>{
    const proposal={assessment:'El integrado U9000 está dañado.',hypotheses:[],nextCheck:{kind:'inspection',stage:'Inspección',question:'¿Qué observaste en la placa?',reason:'Confirmar el alcance',conditions:'Equipo desconectado'}};
    let attempts=0;
    const result=await diagnoseRepair({...input,text:'¿Por qué falla la placa?'},{...offline,retrieve:async()=>({sources:[],unavailable:[]}),vision:async()=>({facts:'',warnings:[]}),draft:async()=>{attempts++;return {text:JSON.stringify(proposal),provider:'test'}}});
    assert.equal(attempts,2);
    assert.doesNotMatch(result.text,/U9000/);
    assert.ok(result.metadata.retrievalWarnings?.length);
});

test('el turno 31 del mismo chat entra por el contrato real sin reenviar fotos o mensajes anteriores',()=>{
    const messages=Array.from({length:31},(_,i)=>({id:String(i),role:'user',parts:[{type:'text',text:String(i)}]}));
    const parsed=parseCerebroChatRequest({sessionId:crypto.randomUUID(),clientMessageId:'30',messages:latestCerebroTurn(messages)});
    assert.ok(parsed.success);
    assert.deepEqual(parsed.data.messages,[messages[30]]);
});

test('la respuesta al técnico que cambió ambos accesorios aísla una variable y explica ambos resultados',async()=>{
    const result=await diagnoseRepair({...input,text:'El equipo carga con el segundo conjunto de cable y cargador. ¿Cómo distingo cuál de los dos accesorios falla?'},offline);
    assert.equal(result.metadata.provider,'bench-protocol');
    assert.match(result.metadata.diagnosticPlan!.question,/únicamente al cable original/);
    assert.equal(result.metadata.diagnosticPlan!.branches.length,2);
});
