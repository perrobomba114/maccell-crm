import { safeWorkbenchUrl } from './source-links';
import { benchTriage, followBenchReading, needsTechnicalDocuments } from './bench-triage';
import { generateText, Output } from 'ai';
import { normalizeDeviceIdentity, deviceModelAliases } from './normalization';
import { buildTechnicalSearchQuery, diagnosticSubsystemTerms } from './diagnostic-planner';
import { buildDiagnosticState, type DiagnosticHistoryMessage, type DiagnosticState } from './diagnostic-state';
import { buildIntakePlan, decisionSchema, fallbackDiagnosticPlan, planToGuidedQuestion, validateDiagnosticDecision, type DiagnosticPlan } from './diagnostic-plan';
import { buildDecisionPrompt, DIAGNOSTIC_PROMPT_VERSION } from './diagnostic-prompt';
import { findCatalogSchematics, retrieveLibrarySources } from './library-retrieval';
import { retrieveRepairFallbackSources } from './repair-evidence-retrieval';
import { retrieveTechnicalEvidence } from './resilient-retrieval';
import { toPublicSources } from './message-content';
import { buildModel, type ProviderSelection } from './provider-selection';
import { loadEvidenceVision } from './evidence-vision';
import type { CerebroRepair } from './repair-context';
import type { CerebroMessageMetadata, CerebroSource } from './types';

type RepairContext=Pick<CerebroRepair,'deviceBrand'|'deviceModel'|'problemDescription'|'observations'|'ticketNumber'|'diagnosis'|'isWet'|'isWarranty'> & {id?: string; assignedParts?: string[]};
export type DiagnoseInput={repair:RepairContext;history:readonly DiagnosticHistoryMessage[];text:string;images:readonly string[];messageId:string;answerContext?:{question:string;conditions:string}};
type DraftResult={text:string;provider:string};
export type DiagnosisDependencies={
    retrieve:typeof retrieveTechnicalEvidence;
    catalog?:typeof findCatalogSchematics;
    library?:typeof retrieveLibrarySources;
    cases?:typeof retrieveRepairFallbackSources;
    draft:(prompt:string,correction?:string)=>Promise<DraftResult>;
    vision:typeof loadEvidenceVision;
};

async function draft(prompt:string,correction?:string):Promise<DraftResult> {
    let provider:ProviderSelection={label:'Pendiente',keyId:'pending'};
    const result=await generateText({model:buildModel(p=>{provider=p;},false,true),system:prompt,
        messages:[{role:'user',content:correction?`Corregí la decisión: ${correction}. Devolvé JSON válido y una sola comprobación respaldada.`:'Prepará la próxima comprobación con el expediente y las fuentes.'}],
        output:Output.object({schema:decisionSchema}),providerOptions:{groq:{structuredOutputs:false}},
        temperature:0.1,maxOutputTokens:900,maxRetries:0,abortSignal:AbortSignal.timeout(45_000)});
    return {text:JSON.stringify(result.output),provider:provider.keyId};
}
const defaults:DiagnosisDependencies={retrieve:retrieveTechnicalEvidence,catalog:findCatalogSchematics,cases:retrieveRepairFallbackSources,library:retrieveLibrarySources,draft,vision:loadEvidenceVision};

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
        observations:[...input.repair.observations, ...(input.repair.diagnosis ? [`Diagnóstico registrado: ${input.repair.diagnosis}`] : []), ...(input.repair.isWarranty ? ['Ticket en garantía.'] : []), ...(input.repair.assignedParts?.length ? [`Repuestos asignados al ticket (instalación pendiente de confirmar): ${input.repair.assignedParts.join(', ')}`] : []), ...(input.repair.isWet ? ["Recepción registra antecedente de humedad; su estado actual requiere comprobación."] : [])], messages:[...input.history,{id:input.messageId,role:'user',content:input.text,answerContext:input.answerContext}]});
    const request = input.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?!.]/g, '').trim();
    if (!input.images.length && /^(?:(?:decime|recordame|sabes) )?(?:que (?:equipo|celular|telefono|modelo) (?:es|tengo|estoy reparando|estamos reparando)|que (?:estoy|estamos) reparando|cual es (?:el equipo|el ticket|la falla (?:de ingreso|reportada)))$/.test(request)) {
        const text = `Ticket ${input.repair.ticketNumber} · ${state.brand} ${state.model}.\n\nRecepción registró: ${state.sellerProblem || 'Sin falla consignada.'}`;
        return {text, sources: [], metadata: {promptVersion: DIAGNOSTIC_PROMPT_VERSION, provider: 'repair-record', sources: [], diagnosticState: state}};
    }
    const locator = input.text.trim().match(/^(?:¿?d[oó]nde (?:est[aá]|queda|encuentro)|ubic[aá](?:me)?|localiz[aá])\s+(?:el |la )?((?:TP|[RCULFDJ])\d{2,6})[?!. ]*$/i);
    const wantsDiagram = /esquema|esquem[aá]tic[oa]|schematic|boardview|plano|diagrama/i.test(input.text);
    const requestedCodes = [...new Set(input.text.toUpperCase().match(/\b(?:TP|[RCULFDJ])\d{2,6}\b/g) ?? [])];
    const asksForInterpretation = /cu[aá]nto|tensi[oó]n esperada|valor esperado|qu[eé] (?:significa|mido|debo medir)|por qu[eé]/i.test(input.text);
    const browseDiagram = wantsDiagram && !asksForInterpretation;
    const requestedNets = input.text.toUpperCase().match(/\b(?:VBUS|VBAT|VDD\w*|PP_\w+)\b/g) ?? [];
    const target = locator?.[1] ?? (browseDiagram && requestedCodes.length === 1 ? requestedCodes[0] : null);
    const reading = !input.images.length && !wantsDiagram && !target ? followBenchReading(state, input.text) : null;
    if (reading) return {text: reading.reason, sources: [], metadata: buildMetadata(state, reading, [], [], 'bench-protocol')};
    const intake = wantsDiagram || target ? null : buildIntakePlan(state);
    const triage = !input.images.length && !intake && !wantsDiagram && !target ? benchTriage(state, input.text) : null;
    const firstCheck = intake ?? triage;
    if (firstCheck && !input.images.length) {
        const text = intake ? 'Falta identificar la lectura registrada antes de interpretarla.' : firstCheck.expected || firstCheck.reason;
        return { text, sources: [], metadata: buildMetadata(state, firstCheck, [], [], 'bench-protocol') };
    }
    const search=buildTechnicalSearchQuery({brand:identity.brand,model:identity.model,problem:input.repair.problemDescription,
        latestText:input.text,observations:state.observations.filter(o=>!o.superseded&&o.origin==='technician').map(o=>o.text)});
    const retrievalInput={brand:identity.brand,model:identity.model,modelAliases:deviceModelAliases(identity),
        modelFamily:identity.modelFamily,symptomText:[state.sellerProblem,input.text].join(" "),text:search,subsystemTerms:diagnosticSubsystemTerms(search,identity.brand),
        componentCodes:[...new Set(input.text.toUpperCase().match(/\b[A-Z]{1,3}\d{2,6}\b/g)??[])],excludeRepairId:input.repair.id,excludeRepairTicket:input.repair.ticketNumber,limit:10};
    let retrieved:{sources:CerebroSource[];unavailable:string[]};
    const boardContext = [input.text, input.answerContext?.question, state.sellerProblem, ...state.observations.filter(o => !o.superseded).slice(-3).map(o => o.text)].join(' ');
    const documents = wantsDiagram || needsTechnicalDocuments(boardContext) || state.measurements.length > 0 || input.images.length > 0;
    try {
        if (target && !input.images.length && dependencies.library) {
            retrieved = {sources: await dependencies.library({...retrievalInput, text: target, subsystemTerms: [], embedding: []}), unavailable: []};
        } else if (browseDiagram && requestedNets.length && dependencies.library && !input.images.length) {
            const indexed = await dependencies.library({...retrievalInput,text:requestedNets.join(' '),subsystemTerms:[],componentCodes:[],embedding:[]});
            retrieved = indexed.length ? {sources:indexed,unavailable:[]} : await dependencies.retrieve(retrievalInput);
        } else retrieved = !documents && dependencies.cases
            ? { sources: await dependencies.cases(retrievalInput), unavailable: [] }
            : await dependencies.retrieve(retrievalInput);
    }
    catch { retrieved={sources:[],unavailable:['No se pudo recuperar evidencia técnica']}; }
    const warnings=[...retrieved.unavailable];
    const models = new Set([identity.model, ...deviceModelAliases(identity)].map(model => model.toUpperCase().replace(/[^A-Z0-9]/g, '')));
    const sources = retrieved.sources.filter(source => {
        const owner = normalizeDeviceIdentity(source.brand, source.model);
        return owner.brand === identity.brand && models.has(owner.model.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    });
    if (target && !input.images.length) {
        const code = target.toUpperCase();
        const exact = sources.filter(source => {
            const link = safeWorkbenchUrl(source.workbenchUrl);
            if (!link || source.sourceType !== 'BOARD') return false;
            const target = new URLSearchParams(link.split('?')[1]);
            return target.get('board') === source.documentId && target.get('component')?.toUpperCase() === code;
        });
        const found = exact.length > 0;
        const plan: DiagnosticPlan = { id: crypto.randomUUID(), kind: 'inspection', stage: 'Ubicar componente',
            question: found ? `¿La distribución alrededor de ${code} coincide con tu placa?` : '¿Qué revisión o código de placa figura en la serigrafía?',
            reason: found ? 'Confirmar la variante física antes de usar la referencia.' : 'La revisión permite distinguir variantes del mismo modelo.',
            conditions: 'Comparación visual con el equipo desconectado.', instrument: '', point: found ? code : '',
            expected: '', branches: [], options: [], evidenceIds: found ? ['E1'] : [] };
        const text = found ? `El boardview de ${identity.model} ubica ${code}. Abrí la referencia para centrar ese componente.`
            : `La búsqueda disponible no devolvió una ubicación verificable de ${code} en ${identity.model}.`;
        return {text, sources: exact, metadata: buildMetadata(state, plan, exact, warnings, 'board-index')};
    }
    if (browseDiagram && !input.images.length) {
        const terms = diagnosticSubsystemTerms(input.text, identity.brand);
        if (!terms.length) terms.push(...diagnosticSubsystemTerms(state.sellerProblem, identity.brand));
        const nets = requestedNets;
        const anchored = sources.filter(source => {
            if (source.chunkId.endsWith(':overview') || source.sourceType === 'REPAIR') return false;
            const link = safeWorkbenchUrl(source.workbenchUrl);
            if (source.sourceType === 'BOARD' && (!link || !new URLSearchParams(link.split('?')[1]).get('component'))) return false;
            if (source.sourceType === 'PDF' && !source.pageNumber) return false;
            const tokens: string[] = source.content.toUpperCase().match(/[A-Z0-9_]+/g) ?? [];
            if (nets.length || requestedCodes.length) return [...nets,...requestedCodes].every(term => tokens.includes(term));
            return terms.length === 0 || terms.some(term => tokens.includes(term.toUpperCase()));
        });
        let catalog: CerebroSource[] = [];
        if (!anchored.length && dependencies.catalog) {
            try { catalog = await dependencies.catalog(identity.brand, [identity.model, ...deviceModelAliases(identity)]); }
            catch { warnings.push("No se pudo consultar el catálogo físico."); }
        }
        const first = anchored[0];
        const point = first?.workbenchUrl && new URLSearchParams(first.workbenchUrl.split('?')[1]).get('component');
        const ref = first ? (point ? 'componente ' + point : 'página ' + first.pageNumber) : '';
        const text = first ? `En ${first.title}, la referencia del ${identity.model} abre en ${ref} [E1].`
            : catalog.length ? `Encontré el esquemático de ${identity.model}: ${catalog[0].title} [E1]. Podés abrir el PDF completo en el visor. Confirmá la revisión de placa antes de usar sus referencias.`
            : `No recuperé una página o ubicación verificable del ${identity.model} para esta consulta.`;
        const plan: DiagnosticPlan = {id:crypto.randomUUID(), kind:'inspection', stage:'Consultar el esquemático',
            question:first ? '¿La referencia abierta coincide con la variante y la zona que tenés en el banco?' : '¿Qué código de placa o designador figura en la zona que necesitás revisar?',
            reason:text,conditions:'Contrastá el archivo con la serigrafía de la placa antes de usarlo como referencia.',instrument:'',point:point || '',expected:'',branches:[],options:[],evidenceIds:first?['E1']:[]};
        const references = anchored.length ? anchored : catalog;
        return {text,sources:references,metadata:buildMetadata(state,plan,references,warnings,'schematic-index')};
    }
    let plan: DiagnosticPlan | null = null;
    let provider = 'unavailable';
    let text = '';
    let visual:{facts:string;warnings:string[]};
    try { visual=await dependencies.vision(sources,input.images); }
    catch { visual={facts:'',warnings:['No se pudo verificar evidencia visual']}; }
    warnings.push(...visual.warnings);
    const prompt=buildDecisionPrompt(state,sources)+`\nTicket activo: ${input.repair.ticketNumber}. Equipo registrado: ${input.repair.deviceBrand} ${input.repair.deviceModel}. Esta identidad y el motivo de recepción pertenecen al equipo actual. Los antecedentes son de otros tickets.`+(visual.facts?`\nLECTURA VISUAL NO CONFIRMADA; cada lectura conserva su página. No sustituye una medición:\n${visual.facts}`:'');
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
        if (provider !== 'unavailable') warnings.push('La propuesta automática no superó la verificación técnica');
        const recovery = !documents && !input.answerContext && /hip[oó]tesis|prueba|empiezo|comprobaci[oó]n/i.test(input.text)
            ? benchTriage(state, input.text, true) : null;
        if (recovery) {
            return {text: recovery.reason, sources, metadata: buildMetadata(state, recovery, sources, warnings, 'bench-protocol')};
        }
        plan=fallbackDiagnosticPlan('La evidencia disponible no permite validar una medición de placa específica.',state);
        if (!documents && plan.stage === 'Revisión de evidencia') {
            plan = {...plan, kind: 'clarification', stage: 'Revisar el caso con el técnico',
                question: '¿Qué resultado observado necesitás interpretar o comparar?',
                conditions: 'Podés registrar el resultado en texto para retomar el caso.',
                reason: 'El servicio no produjo una interpretación verificable del último turno.',
                expected: 'Resultado y condiciones registrados.'};
            text = 'No obtuve una interpretación verificable para este turno. Tu observación quedó en el expediente.';
        } else text=plan.kind==='clarification'
            ? 'El dato de recepción quedó sin confirmar. Falta distinguir si el equipo no arranca o no muestra imagen; los antecedentes todavía no confirman la causa.'
            : 'No pude validar una próxima medición con las fuentes actuales. Conservé el expediente y los antecedentes para continuar con una referencia verificable.';
    }
    return {text,sources,metadata:buildMetadata(state,plan,sources,warnings,provider)};
}

function buildMetadata(state:DiagnosticState,plan:DiagnosticPlan,sources:CerebroSource[],warnings:string[],provider:string):CerebroMessageMetadata {
    return {promptVersion:DIAGNOSTIC_PROMPT_VERSION,provider,sources:toPublicSources(sources),retrievalWarnings:warnings,
        diagnosticState:state,diagnosticPlan:plan,guidedQuestion:planToGuidedQuestion(plan,sources)};
}
