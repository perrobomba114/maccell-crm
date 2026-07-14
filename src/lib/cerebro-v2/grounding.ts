const MEASUREMENT_PATTERN = /\b\d+(?:[.,]\d+)?\s*(?:mA|A|mV|V|kΩ|Ω|ohms?|kohms?)\b/gi;

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
        return "registrar el valor medido";
    });
    if (!replaced) return sanitized;
    return `${sanitized}\n\n> Los valores numéricos sin respaldo documental se omitieron. Registrá el valor real medido para continuar.`;
}
