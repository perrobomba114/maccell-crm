import { z } from 'zod';
import { normalizeDeviceIdentity, deviceModelAliases } from './normalization';
import type { CerebroSource, GuidedQuestion } from './types';
import type { DiagnosticState } from './diagnostic-state';

const nextCheckSchema=z.object({
    kind:z.enum(['clarification','functional','measurement','inspection','verification']),
    stage:z.string().min(1).max(100), question:z.string().min(8).max(600), reason:z.string().min(3).max(600),
    conditions:z.string().min(3).max(700), instrument:z.string().max(150).default(''),
    point:z.string().max(200).default(''), expected:z.string().max(600).default(''),
    branches:z.array(z.object({result:z.string().max(200),meaning:z.string().max(400)})).max(4).default([]),
    evidenceIds:z.array(z.string().regex(/^E\d+$/)).max(5).default([]),
    options:z.array(z.string().min(2).max(180)).max(4).default([]),
});
export type DiagnosticPlan=z.infer<typeof nextCheckSchema> & {id:string};
export const decisionSchema=z.object({
    assessment:z.string().min(3).max(1600),
    hypotheses:z.array(z.object({text:z.string().max(350),evidenceIds:z.array(z.string().regex(/^E\d+$/)).max(5)})).max(3).default([]),
    nextCheck:nextCheckSchema,
});
export type DiagnosticDecision=z.infer<typeof decisionSchema>;
const electrical=/\b\d+(?:[.,]\d+)?\s*(?:mA|A|mV|V|kΩ|Ω|ohms?)\b/gi;
const canonical=(s:string)=>s.toLowerCase().replace(',','.').replace(/\s+/g,'');
const PRICE=/(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/i;
const ACTION_IN_ASSESSMENT=/(?:^|\s)(?:med[ií]|mida|medir|comprob[aá]|compruebe|prob[aá]|pruebe|revis[aá]|revise|conect[aá]|conecte)(?=\s|[.,;:]|$)/i;
const normalizedWords=(value:string)=>new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]{3,}/g)??[]);

function repeatsAnsweredQuestion(question:string, answered:readonly string[]):boolean {
    const generic=new Set(['medi','medir','tension','comproba','comprobar','registra','registrar','con','del','las','los','una','para','equipo','telefono','que','hay']);
    const specific=(text:string)=>new Set([...normalizedWords(text)].filter(word=>!generic.has(word)));
    const words=specific(question);
    if (!words.size) return false;
    return answered.some(previous=>{
        const previousWords=specific(previous);
        const codes=(text:string):string[]=>text.toUpperCase().match(/\b(?:[RCULFDJ]\d{2,6}|TP\d{2,6})\b/g)??[];
        const currentCodes=codes(question), previousCodes=codes(previous);
        if (currentCodes.some(code=>!previousCodes.includes(code)) || previousCodes.some(code=>!currentCodes.includes(code))) return false;
        const overlap=[...previousWords].filter(word=>words.has(word)).length;
        return overlap>=3 && overlap/Math.max(words.size,previousWords.size)>=0.75;
    });
}

export function buildIntakePlan(state: DiagnosticState): DiagnosticPlan | null {
    const ambiguous=state.ambiguousMeasurements[0];
    if (!ambiguous) return null;
    return {id:crypto.randomUUID(),kind:'clarification',stage:'Confirmar medición',
        question:`El dato «${ambiguous.value}» no tiene unidad confirmada. Indicá la unidad, el instrumento y cuándo se midió.`,
        reason:'Distinguir consumo de carga, tensión y consumo de arranque antes de elegir un circuito.',
        conditions:'Si no realizaste esa lectura, indicá que es un dato de recepción sin comprobar. No repitas una prueba solo para completar un dato antiguo.',
        instrument:'',point:'',expected:'Medición identificada o dato de recepción descartado.',branches:[],evidenceIds:[],options:[]};
}

export function validateDiagnosticDecision(value: unknown, state: DiagnosticState, sources: readonly CerebroSource[]):
    {valid:true;decision:DiagnosticDecision} | {valid:false;reason:string} {
    const parsed=decisionSchema.safeParse(value);
    if (!parsed.success) return {valid:false,reason:'La decisión no tiene el formato esperado'};
    const decision=parsed.data;
    const all=JSON.stringify(decision);
    if (PRICE.test(all)) return {valid:false,reason:'El diagnóstico técnico no admite precios'};
    if ([decision.assessment,...decision.hypotheses.map(h=>h.text)].some(text=>ACTION_IN_ASSESSMENT.test(text))) return {valid:false,reason:'El resumen contiene una segunda comprobación'};
    if (repeatsAnsweredQuestion(decision.nextCheck.question,state.answeredQuestions)) return {valid:false,reason:'La comprobación ya fue respondida'};
    if (state.brand!=='APPLE' && /panic[- ](?:full|base)|thermalmonitord|\biOS\b|Lightning|Tristar|Tigris|Hydra/i.test(all)) {
        return {valid:false,reason:'La instrucción pertenece a otra plataforma'};
    }
    const references=[...decision.nextCheck.evidenceIds,...decision.hypotheses.flatMap(h=>h.evidenceIds)];
    if (references.some(id=>!sources[Number(id.slice(1))-1])) return {valid:false,reason:'La cita no existe'};
    const identity=normalizeDeviceIdentity(state.brand,state.model);
    const allowedModels=new Set([identity.model,...deviceModelAliases(identity)].map(model=>model.replace(/[^A-Z0-9]/gi,'').toUpperCase()));
    const sameIdentity=(source:CerebroSource)=>{
        const actual=normalizeDeviceIdentity(source.brand,source.model);
        return actual.brand===identity.brand && allowedModels.has(actual.model.replace(/[^A-Z0-9]/gi,'').toUpperCase());
    };
    if (references.some(id=>!sameIdentity(sources[Number(id.slice(1))-1]))) return {valid:false,reason:'La cita pertenece a otro dispositivo'};
    const cited=decision.nextCheck.evidenceIds.map(id=>sources[Number(id.slice(1))-1]).filter(source=>source.sourceType==='PDF'||source.sourceType==='BOARD');
    const next=decision.nextCheck;
    if (/\bpin\b[^.\n]{0,70}\[\d+\]|\b[A-Z_]+\[\d+\]/i.test(`${next.question} ${next.point}`)) {
        return {valid:false,reason:'Una referencia entre hojas no identifica un pin físico'};
    }
    // The model may explain hypotheses but cannot order irreversible work as an unverified next check.
    if (/\b(?:puentea|puentear|reballing|inyecta|inyectar|desuelda|desoldar|retir[aá].{0,25}blindaje)\b/i.test(JSON.stringify(next))) {
        return {valid:false,reason:'La intervención requiere un procedimiento verificado y revisión técnica'};
    }
    const codes=(`${next.point} ${next.question}`).match(/\b(?:[RCULFDJ]\d{2,6}|TP\d{2,6})\b/g)??[];
    if (codes.some(code=>!cited.some(s=>new RegExp(`\\b${code}\\b`,'i').test(s.content)))) {
        return {valid:false,reason:'El punto de prueba no está respaldado por las fuentes citadas'};
    }
    const physicalPin=(`${next.point} ${next.question}`).match(/\bpin\s+(\d{1,3})\b/i)?.[1];
    const pinAnchor=codes[0] ?? next.point.trim();
    if (physicalPin && (!pinAnchor || !cited.some(source=>{
        const index=source.content.toUpperCase().indexOf(pinAnchor.toUpperCase());
        if (index<0) return false;
        return new RegExp(`\\bpin\\s*${physicalPin}\\b`,'i').test(source.content.slice(Math.max(0,index-100),index+220));
    }))) {
        return {valid:false,reason:'El pin físico no está respaldado por la fuente citada'};
    }
    if (next.kind==='measurement' && (!next.instrument || !next.point || !cited.length)) {
        return {valid:false,reason:'Falta instrumento, punto o fuente para la medición'};
    }
    // Values are rendered with their human provenance in the dossier. Free prose cannot move them to another point.
    if ([decision.assessment,...decision.hypotheses.map(h=>h.text)].some(text=>(text.match(electrical)??[]).length>0)) {
        return {valid:false,reason:'Los valores medidos se muestran en el expediente con punto y procedencia; no los reasignes en texto libre'};
    }
    if (next.kind==='measurement' && !cited.some(source=>source.content.toUpperCase().includes(next.point.toUpperCase()))) {
        return {valid:false,reason:'El punto de medición no aparece en la documentación citada'};
    }
    for (const measurement of JSON.stringify(next).match(electrical)??[]) {
        // Expected values must occur near the exact test point in the cited source, never merely elsewhere in a PDF.
        const supported=Boolean(next.point) && cited.some(source=>{
            const index=source.content.toUpperCase().indexOf(next.point.toUpperCase());
            if (index<0) return false;
            const context=source.content.slice(Math.max(0,index-100),index+220);
            return !/Vout\s*=|\(\s*1\s*\+/i.test(context) && (context.match(electrical)??[]).some(v=>canonical(v)===canonical(measurement));
        });
        if (!supported) return {valid:false,reason:'El valor esperado no está vinculado al punto de prueba'};
    }
    return {valid:true,decision};
}

export function planToGuidedQuestion(plan: DiagnosticPlan, sources: readonly CerebroSource[]): GuidedQuestion {
    return {id:plan.id,prompt:plan.question,measurement:plan.reason,conditions:plan.conditions,
        options:plan.options.map((label,i)=>({id:`result-${i}`,label,observation:{kind:'behavior',value:label,conditions:plan.conditions}})),
        sourceDocumentIds:plan.evidenceIds.flatMap(id=>sources[Number(id.slice(1))-1]?.documentId??[]),allowFreeText:true};
}

export function fallbackDiagnosticPlan(reason: string, state?: DiagnosticState): DiagnosticPlan {
    const human=state?.observations.filter(o=>o.origin==='technician'&&!o.superseded).map(o=>o.text).join(' ')??'';
    const startupKnown=/vibra|sonido|detect|imagen|pantalla/i.test(human) || state?.answeredQuestions.some(q=>/vibra|sonido|detect|imagen|pantalla/i.test(q));
    if (state && /no (?:enciende|arranca)/i.test(state.sellerProblem) && /dato de recepci[oó]n sin comprobar/i.test(human) && !startupKnown) {
        return {id:crypto.randomUUID(),kind:'clarification',stage:'Distinguir arranque de imagen',
            question:'Con las comprobaciones ya realizadas, ¿observaste vibración, sonido o detección USB aunque la pantalla esté negra?',
            reason:'Distinguir ausencia de arranque de un posible problema de imagen sin atribuir todavía una causa.',
            conditions:'Respondé solo por lo ya observado. No conectes ni alimentes el equipo para contestar; si no se comprobó, indicá esa opción.',
            instrument:'',point:'',expected:'Signos de actividad identificados o comprobación pendiente.',branches:[],evidenceIds:[],
            options:['Sí, observé signos de actividad','No observé signos de actividad','Todavía no lo comprobé']};
    }
    return {id:crypto.randomUUID(),kind:'inspection',stage:'Revisión de evidencia',question:'Adjuntá una imagen legible de la zona o página que estás revisando e indicá qué comprobación ya realizaste.',
        reason,conditions:'Conservá las mediciones registradas. No intervengas componentes basándote en una referencia sin verificar.',instrument:'',point:'',expected:'Ubicación y comprobación identificables para continuar.',branches:[],evidenceIds:[],options:[]};
}
