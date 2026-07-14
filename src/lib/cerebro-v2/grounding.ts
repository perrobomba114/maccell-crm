const MEASUREMENT_PATTERN = /\b\d+(?:[.,]\d+)?\s*(?:mA|A|mV|V|kΩ|Ω|ohms?|kohms?)\b/gi;
const PRICE_PATTERN = /(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/gi;

function canonicalMeasurement(value: string): string {
    return value.toLowerCase().replace(",", ".").replace(/\s+/g, "");
}

export function suppressUnsupportedMeasurements(answer: string, evidence: readonly string[]): string {
    const supported = new Set(
        evidence.flatMap((content) => content.match(MEASUREMENT_PATTERN) ?? [])
            .map(canonicalMeasurement),
    );
    let replaced = false;
    const sanitized = answer.replace(MEASUREMENT_PATTERN, (measurement) => {
        if (supported.has(canonicalMeasurement(measurement))) return measurement;
        replaced = true;
        return "un valor no respaldado por la evidencia";
    });
    if (!replaced) return sanitized;
    return `${sanitized}\n\n> Los valores numéricos sin respaldo documental se omitieron. Registrá el valor real medido para continuar.`;
}

export type ObservedFactsContext = {
    device: string;
    sellerProblem: string;
    technicianInput: string;
};

function cleanObservedFact(value: string): string {
    return value.replace(PRICE_PATTERN, "[PRECIO_REMOVIDO]").replace(/\s+/g, " ").trim();
}

export function ensureObservedFacts(answer: string, context: ObservedFactsContext): string {
    const evidenceHeader = answer.search(/^## EVIDENCIA\s*$/m);
    const observedHeader = answer.search(/^## DATOS OBSERVADOS\s*$/m);
    if (observedHeader < 0 || evidenceHeader <= observedHeader) return answer;
    const deterministic = [
        "## DATOS OBSERVADOS",
        `- Dispositivo: ${cleanObservedFact(context.device)}`,
        `- Ingreso del vendedor: ${cleanObservedFact(context.sellerProblem)}`,
        `- Consulta del técnico: ${cleanObservedFact(context.technicianInput)}`,
        "",
    ].join("\n");
    return `${answer.slice(0, observedHeader)}${deterministic}${answer.slice(evidenceHeader)}`;
}
