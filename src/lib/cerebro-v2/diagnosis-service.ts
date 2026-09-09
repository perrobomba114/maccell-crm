import { generateText, Output } from 'ai';
import { normalizeDeviceIdentity, deviceModelAliases } from './normalization';
import { buildTechnicalSearchQuery, diagnosticSubsystemTerms } from './diagnostic-planner';
import { buildDiagnosticState, type DiagnosticHistoryMessage, type DiagnosticState } from './diagnostic-state';
import { buildIntakePlan, fallbackDiagnosticPlan, planToGuidedQuestion, validateDiagnosticDecision, type DiagnosticPlan } from './diagnostic-plan';
import { buildDecisionPrompt, DIAGNOSTIC_PROMPT_VERSION } from './diagnostic-prompt';
import { retrieveTechnicalEvidence } from './resilient-retrieval';
import { toPublicSources } from './message-content';
import { buildModel, type ProviderSelection } from './provider-selection';
import { loadEvidenceVision } from './evidence-vision';
import type { CerebroRepair } from './repair-context';
import type { CerebroMessageMetadata, CerebroSource } from './types';

type RepairContext=Pick<CerebroRepair,'deviceBrand'|'deviceModel'|'problemDescription'|'observations'|'ticketNumber'|'diagnosis'|'isWet'|'isWarranty'>;
export type DiagnoseInput={repair:RepairContext;history:readonly DiagnosticHistoryMessage[];text:string;images:readonly string[];messageId:string;answerContext?:{question:string;conditions:string}};
type DraftResult={text:string;provider:string};
export type DiagnosisDependencies={
    retrieve:typeof retrieveTechnicalEvidence;
    draft:(prompt:string,correction?:string)=>Promise<DraftResult>;
    vision:typeof loadEvidenceVision;
};

async function draft(prompt:string,correction?:string):Promise<DraftResult> {
    let provider:ProviderSelection={label:'Pendiente',keyId:'pending'};
    const result=await generateText({model:buildModel(p=>{provider=p;},false),system:prompt,
        messages:[{role:'user',content:correction?`Corregí la decisión: ${correction}. Devolvé JSON válido y una sola comprobación respaldada.`:'Prepará la próxima comprobación con el expediente y las fuentes.'}],
        output:Output.json(),providerOptions:{openrouter:{reasoning:{effort:'minimal'}}},
        temperature:0.1,maxOutputTokens:3000,maxRetries:0,abortSignal:AbortSignal.timeout(30_000)});
    return {text:result.text,provider:provider.keyId};
}
const defaults:DiagnosisDependencies={retrieve:retrieveTechnicalEvidence,draft,vision:loadEvidenceVision};

function parseDraft(text:string):unknown {
    const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    try {return JSON.parse(clean);} catch {return null;}
}

export function renderDiagnosticText(assessment:string,hypotheses:Array<{text:string;evidenceIds:string[]}>):string {
    return [assessment,...(hypotheses.length?['\n**Posibilidades a contrastar**',...hypotheses.map(h=>`- ${h.text}${h.evidenceIds.length?` (${h.evidenceIds.join(', ')})`:''}`)]:[])].join('\n');
}

export async function diagnoseRepair(input:DiagnoseInput,dependencies:DiagnosisDependencies=defaults):Promise<{text:string;metadata:CerebroMessageMetadata;sources:CerebroSource[]}> {
    const identity=normalizeDeviceIdentity(input.repair.deviceBrand,input.repair.deviceModel);
    const state=buildDiagnosticState({brand:identity.brand,model:identity.model,sellerProblem:input.repair.problemDescription,
        observations:[...input.repair.observations, ...(input.repair.diagnosis ? [`Diagnóstico registrado: ${input.repair.diagnosis}`] : []), ...(input.repair.isWet ? ["Recepción registra antecedente de humedad; su estado actual requiere comprobación."] : [])], messages:[...input.history,{id:input.messageId,role:'user',content:input.text,answerContext:input.answerContext}]});
    const search=buildTechnicalSearchQuery({brand:identity.brand,model:identity.model,problem:input.repair.problemDescription,
        latestText:input.text,observations:state.observations.filter(o=>!o.superseded&&o.origin==='technician').map(o=>o.text)});
    const retrievalInput={brand:identity.brand,model:identity.model,modelAliases:deviceModelAliases(identity),
        modelFamily:identity.modelFamily,text:search,subsystemTerms:diagnosticSubsystemTerms(search,identity.brand),
        componentCodes:[...new Set(input.text.toUpperCase().match(/\b[A-Z]{1,3}\d{3,5}\b/g)??[])],excludeRepairTicket:input.repair.ticketNumber,limit:10};
    let retrieved:{sources:CerebroSource[];unavailable:string[]};
    try { retrieved=await dependencies.retrieve(retrievalInput); }
    catch { retrieved={sources:[],unavailable:['No se pudo recuperar evidencia técnica']}; }
    const warnings=[...retrieved.unavailable];
    const sources=retrieved.sources;
    let plan=buildIntakePlan(state);
    let provider='diagnostic-intake';
    let text='El dato de recepción todavía no permite distinguir consumo de carga de una tensión. Los antecedentes se muestran como comparación; no confirman la causa de este equipo.';
    if (!plan) {
        let visual:{facts:string;warnings:string[]};
        try { visual=await dependencies.vision(sources,input.images); }
        catch { visual={facts:'',warnings:['No se pudo verificar evidencia visual']}; }
        warnings.push(...visual.warnings);
        const prompt=buildDecisionPrompt(state,sources)+(visual.facts?`\nLECTURA VISUAL NO CONFIRMADA; cada lectura conserva su página. No sustituye una medición:\n${visual.facts}`:'');
        let correction:string|undefined;
        for (let attempt=0;attempt<2;attempt++) {
            let result:DraftResult;
            try { result=await dependencies.draft(prompt,correction); }
            catch {
                warnings.push('El proveedor de diagnóstico no estuvo disponible');
                provider='unavailable';
                break;
            }
            provider=result.provider;
            const validation=validateDiagnosticDecision(parseDraft(result.text),state,sources);
            if (validation.valid) {
                plan={...validation.decision.nextCheck,id:crypto.randomUUID()};
                text=renderDiagnosticText(validation.decision.assessment,validation.decision.hypotheses);
                break;
            }
            correction=validation.reason;
            console.warn('[CEREBRO] Decision rejected', {provider,attempt:attempt+1,reason:validation.reason});
        }
        if (!plan) {
            warnings.push('La propuesta automática no superó la verificación técnica');
            plan=fallbackDiagnosticPlan('La evidencia disponible no permite validar una medición de placa específica.',state);
            text=plan.kind==='clarification'
                ? 'El dato de recepción quedó sin confirmar. Falta distinguir si el equipo no arranca o no muestra imagen; los antecedentes todavía no confirman la causa.'
                : 'No pude validar una próxima medición con las fuentes actuales. Conservé el expediente y los antecedentes para continuar con una referencia verificable.';
        }
    }
    return {text,sources,metadata:buildMetadata(state,plan,sources,warnings,provider)};
}

function buildMetadata(state:DiagnosticState,plan:DiagnosticPlan,sources:CerebroSource[],warnings:string[],provider:string):CerebroMessageMetadata {
    return {promptVersion:DIAGNOSTIC_PROMPT_VERSION,provider,sources:toPublicSources(sources),retrievalWarnings:warnings,
        diagnosticState:state,diagnosticPlan:plan,guidedQuestion:planToGuidedQuestion(plan,sources)};
}
