
/**
 * Map readable IVA Condition to AFIP ID
 * 1 = IVA Responsable Inscripto
 * 4 = IVA Sujeto Exento
 * 5 = Consumidor Final
 * 6 = Responsable Monotributo
 * 13 = Monotributo Social
 */
export function getIvaConditionId(condition: string): number {
    if (!condition) return 5;
    const lower = condition.toLowerCase();

    if (lower.includes("responsable inscripto") || lower === "1") return 1;
    if (lower.includes("monotributo social") || lower === "13") return 13;
    if (lower.includes("monotributo") || lower === "6") return 6;
    if (lower.includes("exento") || lower === "4") return 4;
    if (lower.includes("no responsable") || lower === "3") return 3;

    return 5; // Default Consumidor Final
}
