export type RepairEvidenceSummary = {
    ticketNumber: string;
    symptom: string;
    rootCause: string;
    intervention: string;
    verification: string;
    outcome: "verified" | "reported" | "incomplete" | "unrepaired";
    caveat: string;
};

const field = (content: string, labels: string[]): string => {
    for (const label of labels) {
        const value = content.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([\\s\\S]*?)(?=\\n[A-ZÁÉÍÓÚÑ_ ]{3,}:|$)`, "i"))?.[1].trim();
        if (value) return sanitizeTechnicalField(value);
    }
    return "";
};

function sanitizeTechnicalField(value: string): string {
    return value
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REMOVIDO]")
        .replace(/(?<!\d)(?:\+?54\s*)?0?266\s*\d{7}(?!\d)/g, "[TELEFONO_REMOVIDO]")
        .replace(/(?:ARS\s*|\$\s*)\d[\d.,]*/gi, "[PRECIO_REMOVIDO]")
        .replace(/\b(?:CLIENTE|NOMBRE|APELLIDO|DNI|CUIT|TEL[ÉE]FONO)\s*:\s*[^;|\n]*/gi, "[DATO_CLIENTE_REMOVIDO]")
        .replace(/\s+/g, " ").trim();
}

const ADMINISTRATIVE = /(?:NO\s+SE\s+DISPONE\s+DE\s+REPUESTOS|NO\s+AUTORIZ|SIN\s+AUTORIZ|NO\s+ACEPT|PRESUPUESTO\s+RECHAZ|SIN\s+REPUEST|FALTA\s+DE\s+REPUEST|ENTREGAD[OA]\s+SIN\s+REPAR|NO\s+REPARAD[OA]|REPARACI[ÓO]N\s+(?:NO\s+REALIZADA|TOMADA\s+POR\s+T[ÉE]CNICO))/i;
const VERIFIED = /(?:PROBAD[OA]|VERIFICAD[OA]|FUNCIONANDO|FUNCIONA\s+CORRECTAMENTE|TEST\s+OK|CARGA\s+ESTABLE|IMAGEN\s+CORRECTA)/i;
const NEGATED_VERIFICATION = /(?:\b(?:NO|SIN)\b.{0,28}\b(?:PROBAD|VERIFIC|FUNCION|TEST|CARGA|IMAGEN)|\b(?:PENDIENTE|INCONCLUS|NO\s+CONFIRM|FALL[ÓO]))/i;
const INTERVENTION = /(?:REEMPLAZ|CAMBIO|SOLDAD|PUENTE|RECONEXI[ÓO]N|REBALL|RESOLD)/i;
const REPORTED = new RegExp(`(?:OK|CORRECT[OA]|PROBAD[OA]|SOLUCIONAD[OA]|${INTERVENTION.source})`, "i");

export function summarizeRepairEvidence(content: string, title: string): RepairEvidenceSummary {
    const symptom = field(content, ["SINTOMA_CONFIRMADO", "SÍNTOMA_CONFIRMADO", "SINTOMA", "SÍNTOMA", "PROBLEMA", "INGRESO"]);
    const confirmedCause = field(content, ["CAUSA_CONFIRMADA", "CAUSA RAIZ", "CAUSA RAÍZ", "CAUSA"]);
    const diagnosis = field(content, ["DIAGNOSTICO_CONFIRMADO", "DIAGNÓSTICO_CONFIRMADO", "DIAGNOSTICO", "DIAGNÓSTICO"]);
    const rawIntervention = field(content, ["INTERVENCION_CONFIRMADA", "INTERVENCIÓN_CONFIRMADA", "INTERVENCION", "INTERVENCIÓN", "SOLUCION", "SOLUCIÓN", "TRABAJO REALIZADO"]);
    const verification = field(content, ["VERIFICACION_FINAL", "VERIFICACIÓN_FINAL", "VERIFICACION", "VERIFICACIÓN", "PRUEBA FINAL", "EVIDENCIA"]);
    const lastCycle = field(content, ["RESULTADO_ULTIMO_CICLO"]);
    const result = field(content, ["RESULTADO", "ESTADO"]);
    const administrativeSolution = ADMINISTRATIVE.test(`${diagnosis} ${rawIntervention}`);
    const diagnosisIntervention = INTERVENTION.test(diagnosis) ? diagnosis : "";
    const intervention = (!rawIntervention || administrativeSolution) ? diagnosisIntervention : rawIntervention;
    const rootCause = confirmedCause || diagnosis;
    const ticketNumber = title.match(/\b[A-Z0-9]{2,10}-\d{4,}\b/i)?.[0] ?? "";
    const unrepaired = /UNREPAIRED/i.test(lastCycle) || ADMINISTRATIVE.test(`${rootCause} ${rawIntervention} ${result}`);
    const repaired = /REPAIRED/i.test(lastCycle);
    const positiveVerification = Boolean(verification) && VERIFIED.test(`${verification} ${result}`)
        && !NEGATED_VERIFICATION.test(`${verification} ${result}`);
    const outcome = unrepaired ? "unrepaired"
        : positiveVerification ? "verified"
            : (repaired || (intervention && REPORTED.test(`${intervention} ${result}`))) ? "reported"
                : "incomplete";
    const outcomeCaveat = unrepaired ? "Cierre administrativo o sin reparación técnica."
        : outcome === "reported" ? "La intervención fue informada sin una verificación final específica."
            : outcome === "incomplete" ? "El antecedente no documenta una solución técnica completa."
                : "";
    const enteredOffOnly = /INGRES[ÓO]\s+APAGAD[OA]/i.test(symptom)
        && !/\b(?:NO\s+(?:ENCIENDE|PRENDE|ARRANCA)|MUERT[OA])\b/i.test(symptom);
    const contextCaveat = enteredOffOnly ? "El ingreso apagado no confirma ausencia de arranque; usar solo como contexto." : "";
    const uncertainCause = !rootCause || /(?:NO\s+DETERMIN|SIN\s+DETERMIN|NO\s+CONFIRM|DESCONOCID|HIP[ÓO]TESIS|POSIBLE|PROBABLE)/i.test(rootCause);
    const causeCaveat = uncertainCause ? "La causa no fue establecida en el antecedente." : "";
    const caveat = [outcomeCaveat, contextCaveat, causeCaveat].filter(Boolean).join(" ");
    return { ticketNumber, symptom, rootCause, intervention, verification, outcome, caveat };
}

export function repairEvidenceIsUsable(content: string, title: string): boolean {
    const summary = summarizeRepairEvidence(content, title);
    return summary.outcome === "verified" || summary.outcome === "reported";
}

export function repairEvidenceMatchesSymptom(summary: RepairEvidenceSummary, query: string): boolean {
    const noPowerSearch = /\b(?:NO\s+(?:ENCIENDE|PRENDE|ARRANCA)|MUERT[OA])\b/i.test(query);
    if (!noPowerSearch || /\b(?:NO\s+(?:ENCIENDE|PRENDE|ARRANCA)|MUERT[OA])\b/i.test(summary.symptom)) return true;
    const enteredOff = /INGRES[ÓO]\s+APAGAD[OA]/i.test(summary.symptom);
    const powerContext = /BATER[IÍ]A|CARGA|PIN\s+DE\s+CARGA|HUMED|MOJAD|OXID|CONSUMO|PMIC|POWER/i
        .test(`${summary.rootCause} ${summary.intervention}`);
    return enteredOff && powerContext;
}

export function formatRepairEvidenceContent(summary: RepairEvidenceSummary): string {
    return [
        ["SÍNTOMA", summary.symptom], ["CAUSA", summary.rootCause],
        ["INTERVENCIÓN", summary.intervention], ["VERIFICACIÓN", summary.verification],
        ["RESULTADO", summary.outcome], ["SALVEDAD", summary.caveat],
    ].filter((entry) => entry[1]).map(([label, value]) => `${label}: ${value}`).join("\n");
}
