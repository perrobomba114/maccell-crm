import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CerebroV2Sources } from '../components/cerebro-v2/cerebro-v2-sources';
import { CerebroV2Message } from '../components/cerebro-v2/cerebro-v2-message';
import { CerebroV2Header } from '../components/cerebro-v2/cerebro-v2-header';
import type { CerebroPublicSource } from '../lib/cerebro-v2/types';
import type { DiagnosticPlan } from '../lib/cerebro-v2/diagnostic-plan';

// The repository preserves JSX for Next; the standalone Node renderer needs its runtime.
Object.assign(globalThis, { React });

const repair: CerebroPublicSource = { documentId:'case-1',sourceType:'REPAIR',authority:'CONFIRMED_SUCCESS',brand:'MOTOROLA',model:'E7',title:'Reparación MAC1-00000241',pageNumber:null,excerpt:'No se dispone de repuestos' };

test('historical authority alone never renders a successful repair badge', () => {
    const html=renderToStaticMarkup(<CerebroV2Sources sources={[repair]} onOpen={() => {}} />);
    assert.match(html,/Evidencia incompleta/);
    assert.doesNotMatch(html,/Verificación registrada|check-circle/);
    assert.match(html,/Ver antecedente completo/);
});

test('repair intervention stays visible while noisy documents are collapsed', () => {
    const html=renderToStaticMarkup(<CerebroV2Sources sources={[{...repair,repairSummary:{ticketNumber:'MAC1-00000241',symptom:'No enciende',rootCause:'Batería',intervention:'Se reemplazó batería',verification:'Tres arranques correctos',outcome:'verified',caveat:''}}, {...repair,documentId:'pdf-1',sourceType:'PDF',title:'Esquemático E7'}]} onOpen={() => {}} />);
    assert.match(html,/Se reemplazó batería/);
    assert.match(html,/Tres arranques correctos/);
    assert.match(html,/<details[^>]*><summary[^>]*>Documentación técnica/);
    assert.ok(html.indexOf('Se reemplazó batería')<html.indexOf('Documentación técnica'));
});

test('one next check precedes explanation and references', () => {
    const plan: DiagnosticPlan={id:'step-1',kind:'clarification',stage:'Confirmar dato',question:'¿Con qué instrumento se midió?',reason:'Necesitamos distinguir consumo y tensión',conditions:'Sin repetir la prueba',instrument:'',point:'',expected:'Lectura identificada',branches:[],evidenceIds:[],options:[]};
    const html=renderToStaticMarkup(<CerebroV2Message message={{id:'a',role:'assistant',parts:[{type:'text',text:'Evaluación del equipo'}],metadata:{promptVersion:'v4',provider:'test',sources:[repair],diagnosticPlan:plan}}} disabled={false} onOpenSource={() => {}} onGuidedAnswer={() => {}} />);
    assert.ok(html.indexOf('¿Con qué instrumento')<html.indexOf('Evaluación del equipo'));
    assert.equal((html.match(/aria-label="Próxima comprobación"/g)??[]).length,1);
});

test('header offers technical closure for an existing repair session and explains availability', () => {
    const html=renderToStaticMarkup(<CerebroV2Header selectedRepair={null} activeSession={{id:'s',repairId:'r',ticketNumber:'MAC1-1',brand:'MOTOROLA',model:'E7',title:'E7',createdAt:new Date(),updatedAt:new Date()}} health="degraded" healthDetails={['Búsqueda semántica no disponible']} onChooseRepair={() => {}} onHistory={() => {}} onNewChat={() => {}} onCloseRepair={() => {}} />);
    assert.match(html,/Registrar cierre técnico/);
    assert.match(html,/Búsqueda semántica no disponible/);
});

test('choosing another repair detaches the previous conversation and source', async () => {
    const { cerebroUiReducer, cerebroInitialState } = await import('../lib/cerebro-v2/ui-state');
    const next=cerebroUiReducer({...cerebroInitialState, activeSessionId:'old',activeSource:repair,sourcePanelOpen:true},{type:'repair-selected'});
    assert.equal(next.activeSessionId,null);
    assert.equal(next.activeSource,null);
    assert.equal(next.sourcePanelOpen,false);
});
