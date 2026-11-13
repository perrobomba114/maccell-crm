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

test('un logo seguido de reinicio conserva la señal de arranque aun si ingresó apagado', async () => {
    const result = await diagnoseRepair({...input, repair: {...repair, problemDescription: 'Llega al logo y reinicia. Ingresó apagado.'}}, offline);
    assert.match(result.metadata.diagnosticPlan!.question, /reinicio/);
    assert.doesNotMatch(result.metadata.diagnosticPlan!.question, /pantalla negra|detección USB/);
});

test('ante una caída del proveedor, una pregunta de banco sobre señal conserva una prueba pertinente', async () => {
    const result = await diagnoseRepair({...input, repair: {...repair, problemDescription: 'Presenta problema de señal'}, text: '¿Qué prueba conviene hacer?'}, offline);
    assert.match(result.metadata.diagnosticPlan!.question, /SIM/);
    assert.ok(result.metadata.retrievalWarnings?.some(w => w.includes('proveedor')));
});

test('una grilla de colores sin entrada de contacto no valida el táctil', async () => {
    const nextCheck={kind:'functional',stage:'Pantalla',question:'¿Qué muestra la prueba de píxeles?',reason:'Evaluar el táctil',conditions:'Equipo encendido'};
    const result=await diagnoseRepair({...input,repair:{...repair,problemDescription:'Falla el táctil'},text:'¿Qué prueba conviene hacer?'}, {
        ...offline,cases:async()=>[],vision:async()=>({facts:'',warnings:[]}),
        draft:async()=>({provider:'fixture',text:JSON.stringify({assessment:'Falta caracterizar el síntoma.',hypotheses:[],nextCheck})})
    });
    assert.doesNotMatch(result.metadata.diagnosticPlan!.question,/píxeles/);
    assert.match(result.metadata.diagnosticPlan!.question,/dedo/);
});

test('identifica la reparación activa desde el CRM aun con proveedor caído', async () => {
    const result = await diagnoseRepair({...input,text:'¿Qué estoy reparando?', repair:{...repair,ticketNumber:'BENCH-42',problemDescription:'Sin audio en llamadas',isWarranty:true,assignedParts:['1 × Altavoz']}},offline);
    assert.equal(result.metadata.provider,'repair-record');
    assert.match(result.text,/BENCH-42/);
    assert.match(result.text,/Sin audio en llamadas/);
    assert.ok(result.metadata.diagnosticState?.observations.some(o=>o.text.includes('instalación pendiente de confirmar')));
    assert.ok(result.metadata.diagnosticState?.observations.some(o=>o.text.includes('garantía')));
});

test('conserva rango y unidad, y no asigna una unidad al siguiente valor por su cuenta', async () => {
    const first = 'Se registró consumo de 0 a 125 miliamperios.';
    const result = await diagnoseRepair({...input, text:first}, offline);
    assert.deepEqual(result.metadata.diagnosticState?.measurements.map(m => [m.value,m.unit]), [['0','mA'],['125','mA']]);
    const next = await diagnoseRepair({...input, history:[{id:'first',role:'user',content:first}],text:'Luego cae a 0.'},offline);
    assert.match(next.text,/sin unidad/);
    assert.match(next.metadata.diagnosticPlan?.question ?? '', /misma medición/);
});

test('un valor de consumo informado en mV conserva la discrepancia al incorporar otro turno', async () => {
    const result = await diagnoseRepair({...input, history:[{id:'first',role:'user',content:'Consumo de 108 mV.'}],text:'Se estabilizó en 69 mV.'},offline);
    assert.match(result.text,/108 mV → 69 mV/);
    assert.match(result.text,/corriente queda sin determinar/);
    assert.doesNotMatch(result.text,/mA/);
});

test('pedir el esquema de una red después de medir abre una página verificable y omite coincidencias parciales', async () => {
    const id = 'a'.repeat(64);
    const page:CerebroSource = {sourceType:'PDF',authority:'TECHNICAL_DOCUMENT',documentId:id,chunkId:'page:10',title:'Plano',brand:repair.deviceBrand,model:repair.deviceModel,content:'VBUS',score:1,pageNumber:10,workbenchUrl:'/technician/schematics?pdf='+id+'&page=10'};
    const result = await diagnoseRepair({...input,history:[{id:'reading',role:'user',content:'Medí 150 mA.'}],text:'Mostrame VBUS en el esquema del equipo.'},
        {...offline,library:async()=>[{...page,content:'VBUS_OTHER'},page]});
    assert.equal(result.metadata.provider,'schematic-index');
    assert.deepEqual(result.sources,[page]);
    assert.match(result.text,/página 10/);
});
