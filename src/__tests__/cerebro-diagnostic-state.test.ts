import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDiagnosticState } from '../lib/cerebro-v2/diagnostic-state';
import { buildIntakePlan, validateDiagnosticDecision } from '../lib/cerebro-v2/diagnostic-plan';

const base = { brand: 'MOTOROLA', model: 'MOTO E7', sellerProblem: 'Ingresa apagado, recibe carga 0.6', observations: [] };
test('ambiguous intake is clarified instead of acquiring voltage from a PDF', () => {
  const state = buildDiagnosticState({...base, messages: [{id:'1',role:'user',content:'no enciende'}]});
  assert.equal(state.ambiguousMeasurements[0]?.value, '0.6');
  const plan = buildIntakePlan(state);
  assert.equal(plan?.kind, 'clarification');
  assert.match(plan?.question ?? '', /unidad|instrumento/i);
  assert.doesNotMatch(plan?.question ?? '', /0\.6\s*V/);
});
test('a later explicit measurement resolves intake ambiguity and keeps earlier technician evidence past eight turns', () => {
  const messages = [{id:'1',role:'user',content:'0.6 A en medidor USB, con cargador al intentar encender'},
    ...Array.from({length:12},(_,i)=>({id:String(i+2),role:'user',content:`Observación ${i}: sin cambios`}))];
  const state=buildDiagnosticState({...base,messages});
  assert.equal(state.ambiguousMeasurements.length,0);
  assert.ok(state.measurements.some(m=>m.value==='0.6' && m.unit==='A' && m.origin==='technician'));
  assert.ok(state.observations.some(o=>o.text.includes('medidor USB')));
});
test('assistant hypotheses never become observed measurements', () => {
  const state=buildDiagnosticState({...base,messages:[{id:'a',role:'assistant',content:'La batería tiene 3.8 V'}]});
  assert.equal(state.measurements.length,0);
});
test('unperformed suggested measurements do not resolve an ambiguous intake value', () => {
  const state=buildDiagnosticState({...base,messages:[{id:'a',role:'user',content:'¿Debería medir 0.6 V en la placa?'}]});
  assert.equal(state.ambiguousMeasurements.length,1);
});
test('an explicitly discarded intake number is not asked again', () => {
  const state=buildDiagnosticState({...base,messages:[{id:'1',role:'user',content:'No medí 0.6; es un dato de recepción sin comprobar'}]});
  assert.equal(state.ambiguousMeasurements.length,0);
  assert.equal(buildIntakePlan(state),null);
});
test('a question already answered by the technician cannot be repeated', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[
    {id:'a',role:'assistant',content:'¿El equipo vibra o emite sonido al encender?'},
    {id:'u',role:'user',content:'No vibra ni emite sonido'},
  ]});
  const decision={assessment:'El equipo no presenta signos funcionales confirmados.',hypotheses:[],nextCheck:{kind:'functional',stage:'Triage',question:'Comprobá si el equipo vibra o emite sonido al encender',reason:'Separar imagen de arranque',conditions:'Intento de encendido normal',instrument:'',point:'',expected:'Registrar el comportamiento',branches:[],evidenceIds:[],options:[]}};
  assert.equal(validateDiagnosticDecision(decision,state,[]).valid,false);
});
test('assessment cannot hide a second measurement or include a price', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[]});
  const nextCheck={kind:'functional',stage:'Triage',question:'Probá encender con un módulo conocido bueno',reason:'Separar periférico de placa',conditions:'Sin intervenir placa',instrument:'',point:'',expected:'Registrar si inicia',branches:[],evidenceIds:[],options:[]};
  assert.equal(validateDiagnosticDecision({assessment:'Medí también la batería antes de continuar',hypotheses:[],nextCheck},state,[]).valid,false);
  assert.equal(validateDiagnosticDecision({assessment:'La reparación cuesta ARS 9000',hypotheses:[],nextCheck},state,[]).valid,false);
});
test('a claimed pin from cross-sheet notation cannot become a physical measurement instruction', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[]});
  const decision={assessment:'Falta medir',hypotheses:[],nextCheck:{kind:'measurement',stage:'Circuito',question:'Medí el pin PWRKEY[4]',reason:'Verificar',conditions:'Equipo encendido',instrument:'Multímetro',point:'PWRKEY[4]',expected:'Cambio de nivel',branches:[],evidenceIds:['E1'],options:[]}};
  const source={chunkId:'x',documentId:'x',sourceType:'PDF' as const,authority:'TECHNICAL_DOCUMENT' as const,brand:'MOTOROLA',model:'MOTO E7',title:'Esquema',pageNumber:12,content:'PWRKEY[4]',score:1};
  assert.equal(validateDiagnosticDecision(decision,state,[source]).valid,false);
});
test('a physical pin must appear beside the cited component, not elsewhere on the page', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[]});
  const decision={assessment:'Falta caracterizar la señal.',hypotheses:[],nextCheck:{kind:'measurement',stage:'Circuito',question:'Registrá la lectura en pin 4 de U1234',reason:'Caracterizar señal',conditions:'Equipo encendido',instrument:'Multímetro',point:'U1234 pin 4',expected:'Registrar el valor',branches:[],evidenceIds:['E1'],options:[]}};
  const source={chunkId:'x',documentId:'x',sourceType:'PDF' as const,authority:'TECHNICAL_DOCUMENT' as const,brand:'MOTOROLA',model:'MOTO E7',title:'Esquema',pageNumber:12,content:`U1234 pin 1 alimentación ${'x'.repeat(300)} pin 4 de J200`,score:1};
  assert.equal(validateDiagnosticDecision(decision,state,[source]).valid,false);
});
test('Android restart does not accept iOS-specific instructions', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'se reinicia',messages:[]});
  const decision={assessment:'Reinicio',hypotheses:[],nextCheck:{kind:'inspection',stage:'Triage',question:'Abrí panic-full en Ajustes de iOS',reason:'Ver registro',conditions:'No borrar datos',instrument:'',point:'',expected:'Registro',branches:[],evidenceIds:[],options:[]}};
  assert.equal(validateDiagnosticDecision(decision,state,[]).valid,false);
});

test('structured next checks survive message reload without entering human evidence', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[
    {id:'a',role:'assistant',content:'Todavía no hay una causa confirmada.',question:'¿El equipo vibra o emite sonido al encender?'},
    {id:'u',role:'user',content:'No vibra ni emite sonido'},
  ]});
  assert.equal(state.answeredQuestions.length,1);
  assert.equal(state.observations.filter(o=>o.origin==='technician').length,1);
});
test('the intake reply suggested by the UI discards an unverified reception value', () => {
  const state=buildDiagnosticState({...base,messages:[{id:'u',role:'user',content:'Es un dato de recepción sin comprobar'}]});
  assert.equal(state.ambiguousMeasurements.length,0);
});

test('free prose cannot move an observed voltage to another point or hide a second action', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[{id:'u',role:'user',content:'Medí 0.6 V con multímetro en PWRKEY al pulsar'}]});
  const nextCheck={kind:'functional',stage:'Triage',question:'¿Hay sonido o vibración al intentar encender?',reason:'Distinguir imagen de arranque',conditions:'Sin intervenir placa',instrument:'',point:'',expected:'Signos funcionales',branches:[],evidenceIds:[],options:[]};
  assert.equal(validateDiagnosticDecision({assessment:'La batería presenta 0.6 V y está descargada.',hypotheses:[],nextCheck},state,[]).valid,false);
  assert.equal(validateDiagnosticDecision({assessment:'Hay que caracterizar el arranque.',hypotheses:[{text:'Medí 9 V en VBAT',evidenceIds:[]}],nextCheck},state,[]).valid,false);
  assert.ok(state.measurements.some(m=>m.value==='0.6' && m.context.includes('PWRKEY')));
});

test('document identity accepts a declared model alias while keeping source identity', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[]});
  const source={chunkId:'c',documentId:'d',sourceType:'PDF' as const,authority:'TECHNICAL_DOCUMENT' as const,brand:'Motorola',model:'E7',title:'Esquema E7',pageNumber:1,content:'Botón de encendido',score:1};
  const nextCheck={kind:'inspection',stage:'Inspección',question:'¿El botón presenta daño visible?',reason:'Identificar daño mecánico',conditions:'Equipo apagado',instrument:'',point:'',expected:'Estado del botón',branches:[],evidenceIds:['E1'],options:[]};
  assert.equal(validateDiagnosticDecision({assessment:'Falta caracterizar el botón.',hypotheses:[],nextCheck},state,[source]).valid,true);
});

test('identical answers to distinct checks remain distinct observations', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[
    {id:'u1',role:'user',content:'Sí',answerContext:{question:'¿Vibra al encender?',conditions:'Batería conectada'}},
    {id:'u2',role:'user',content:'Sí',answerContext:{question:'¿Detecta USB el equipo?',conditions:'Conectado al ordenador'}},
  ]});
  assert.equal(state.observations.filter(o=>o.origin==='technician').length,2);
  assert.match(state.observations.find(o=>o.id==='u2')?.answerContext?.question??'',/USB/);
});
test('CRM reception and unperformed question values are not technician measurements', () => {
  const state=buildDiagnosticState({...base,observations:['recibe carga 0.6 V'],messages:[
    {id:'u',role:'user',content:'No pude medir',answerContext:{question:'¿Hay 3.8 V en batería?',conditions:'Instrumento DC'}},
  ]});
  assert.equal(state.measurements.length,0);
  assert.equal(state.observations.find(o=>o.text==='recibe carga 0.6 V')?.origin,'record');
});
test('a named test point must occur in the cited document', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[]});
  const source={chunkId:'c',documentId:'d',sourceType:'PDF' as const,authority:'TECHNICAL_DOCUMENT' as const,brand:'MOTOROLA',model:'MOTO E7',title:'Esquema',pageNumber:1,content:'DISPLAY LCM',score:1};
  const nextCheck={kind:'measurement',stage:'Circuito',question:'Medí tensión en VBAT_FAKE',reason:'Caracterizar señal',conditions:'Equipo encendido',instrument:'Multímetro V DC',point:'VBAT_FAKE',expected:'Registrar el valor',branches:[],evidenceIds:['E1'],options:[]};
  assert.equal(validateDiagnosticDecision({assessment:'Falta caracterizar la señal.',hypotheses:[],nextCheck},state,[source]).valid,false);
});

test('measuring the next documented point is not confused with the previous measurement', () => {
  const state=buildDiagnosticState({...base,sellerProblem:'no enciende',messages:[
    {id:'a',role:'assistant',content:'Falta caracterizar alimentación.',question:'Medí la tensión en TP102'},
    {id:'u',role:'user',content:'En TP102 medí 0 V con multímetro'},
  ]});
  const source={chunkId:'c',documentId:'d',sourceType:'PDF' as const,authority:'TECHNICAL_DOCUMENT' as const,brand:'MOTOROLA',model:'MOTO E7',title:'Esquema',pageNumber:1,content:'TP103 test point',score:1};
  const nextCheck={kind:'measurement',stage:'Circuito',question:'Medí la tensión en TP103',reason:'Caracterizar siguiente punto',conditions:'Equipo encendido',instrument:'Multímetro V DC',point:'TP103',expected:'Registrar el valor',branches:[],evidenceIds:['E1'],options:[]};
  assert.equal(validateDiagnosticDecision({assessment:'Falta caracterizar el siguiente punto.',hypotheses:[],nextCheck},state,[source]).valid,true);
});
