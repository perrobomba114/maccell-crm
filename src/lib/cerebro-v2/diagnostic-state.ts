export type DiagnosticAnswerContext = { question: string; conditions: string };
export type DiagnosticObservation = { answerContext?: DiagnosticAnswerContext; id: string; text: string; origin: 'seller' | 'technician' | 'record'; superseded: boolean };
export type DiagnosticMeasurement = { value: string; unit: string; context: string; origin: 'seller' | 'technician' | 'record'; observationId: string };
export type DiagnosticState = {
    brand: string; model: string; sellerProblem: string;
    observations: DiagnosticObservation[];
    measurements: DiagnosticMeasurement[];
    ambiguousMeasurements: Array<{ value: string; context: string }>;
    answeredQuestions: string[];
};
export type DiagnosticHistoryMessage = { id: string; role: string; content: string; question?: string; answerContext?: DiagnosticAnswerContext };

export function cleanTechnicalText(text: string): string {
    return text.replace(/(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/gi, '[precio omitido]')
        .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[contacto omitido]')
        .replace(/\b(?:\+?54\s*)?\d{10,13}\b/g, '[contacto omitido]').trim();
}

/** Rebuild from persisted human messages, including prior sessions for the same repair. */
export function buildDiagnosticState(input: {
    brand: string; model: string; sellerProblem: string;
    observations: readonly string[]; messages: readonly DiagnosticHistoryMessage[];
}): DiagnosticState {
    const observations: DiagnosticObservation[] = [];
    const seen = new Set<string>();
    const add = (id: string, text: string, origin: DiagnosticObservation['origin'], answerContext?: DiagnosticAnswerContext) => {
        const clean = cleanTechnicalText(text);
        if (!clean || seen.has(id)) return;
        seen.add(id);
        observations.push({id, text:clean, origin, superseded:false, ...(answerContext ? { answerContext: { question: cleanTechnicalText(answerContext.question), conditions: cleanTechnicalText(answerContext.conditions) } } : {})});
    };
    add('intake', input.sellerProblem, 'seller');
    input.observations.filter(t => !/^(?:reparaci[oó]n (?:tomada|cobrada)|cliente |asignad|estado cambiad)/i.test(t))
        .forEach((t,i)=>add(`crm:${i}`,t,'record'));
    input.messages.filter(m=>m.role==='user').forEach(m=>add(m.id,m.content,'technician',m.answerContext));
    // Explicit corrections remain visible with their original provenance.
    for (let i=0; i<observations.length; i++) {
        const correction=observations[i];
        const match=correction.text.match(/^Corrección de observación \[([^\]]+)\]:/i);
        if (match) {
            const original=observations.slice(0,i).find(o=>o.id===match[1]);
            if (original) original.superseded=true;
        }
    }
    const measurements: DiagnosticMeasurement[]=[];
    for (const observation of observations) {
        if (observation.origin!=='technician' || observation.superseded || /[¿?]|deber[ií]a|hay que medir|voy a medir|no (?:med[ií]|prob[eé])/i.test(observation.text)) continue;
        for (const match of observation.text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(mA|A|mV|V|kΩ|Ω|ohms?)\b/gi)) {
            measurements.push({value:match[1].replace(',','.'),unit:match[2],context:observation.text,origin:observation.origin,observationId:observation.id});
        }
    }
    const ambiguousMeasurements: DiagnosticState['ambiguousMeasurements']=[];
    const discardedValues=new Set(observations.filter(o=>o.origin==='technician' && /no (?:med[ií]|comprob[eé])|dato de recepci[oó]n|sin comprobar|descart/i.test(o.text))
        .flatMap(o=>[...o.text.matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map(match=>match[0].replace(',','.'))));
    const intakeDiscarded=observations.some(o=>o.origin==='technician' && !o.superseded && /dato de recepci[oó]n sin comprobar|descart[aá]r? (?:el )?dato de recepci[oó]n/i.test(o.text));
    for (const observation of observations.filter(o=>!o.superseded && !(o.origin==='seller' && intakeDiscarded))) {
        for (const match of observation.text.matchAll(/(?:carga|consumo|tensi[oó]n|voltaje)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)(?![\d.,])/gi)) {
            const value=match[1].replace(',','.');
            const after=observation.text.slice((match.index??0)+match[0].length);
            if (/^\s*(?:mA|A|mV|V|kΩ|Ω|ohm)\b/i.test(after)) continue;
            const resolved=measurements.some(m=>m.origin==='technician' && m.value===value
                && /USB|fuente|mult[ií]metro|amper[ií]metro|volt[ií]metro/i.test(m.context));
            if (!resolved && !discardedValues.has(value) && !ambiguousMeasurements.some(m=>m.value===value)) ambiguousMeasurements.push({value,context:observation.text});
        }
    }
    const answeredQuestions=input.messages.flatMap((message,index)=>message.role==='assistant'
        && input.messages.slice(index+1).some(candidate=>candidate.role==='user')
        ? message.question ? [cleanTechnicalText(message.question)] : [...message.content.matchAll(/(?:^|[.!]\s+)([^?]{8,}\?)/g)].map(match=>cleanTechnicalText(match[1])) : []);
    return {brand:input.brand,model:input.model,sellerProblem:cleanTechnicalText(input.sellerProblem),observations,measurements,ambiguousMeasurements,answeredQuestions};
}

export function formatDiagnosticState(state: DiagnosticState): string {
    return JSON.stringify(state);
}
