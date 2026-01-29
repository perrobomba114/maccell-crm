
/**
 * Map readable IVA Condition to AFIP ID
 * 1 = IVA Responsable Inscripto
 * 4 = IVA Sujeto Exento
 * 5 = Consumidor Final
 * 6 = Responsable Monotributo
 */
export function getIvaConditionId(condition: string): number {
    const lower = condition.toLowerCase();
    if (lower.includes("inscripto")) return 1;
    if (lower.includes("monotributo")) return 6;
    if (lower.includes("exento")) return 4;
    return 5; // Default Consumidor Final
}
