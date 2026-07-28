export const REPAIR_ACCESS_TYPES = ["CODE", "PATTERN", "NONE"] as const;

export type RepairAccessType = (typeof REPAIR_ACCESS_TYPES)[number];

export type RepairIntake = {
    accessType: RepairAccessType;
    accessCredential: string | null;
    hasSimCard: boolean;
    hasMemoryCard: boolean;
};

type RawRepairIntake = {
    accessType: unknown;
    accessCredential: unknown;
    hasSimCard: unknown;
    hasMemoryCard: unknown;
};

export type RepairIntakeResult =
    | { success: true; data: RepairIntake }
    | { success: false; error: string };

export function serializePattern(points: number[]): string {
    return points.join("-");
}

export function appendPatternPoint(points: number[], point: number): number[] {
    return points.includes(point) ? points : [...points, point];
}

export function normalizeRepairIntake(raw: RawRepairIntake): RepairIntakeResult {
    const accessType = String(raw.accessType ?? "");
    if (!REPAIR_ACCESS_TYPES.includes(accessType as RepairAccessType)) {
        return { success: false, error: "Seleccioná cómo se desbloquea el equipo." };
    }
    const normalizedAccessType = accessType as RepairAccessType;
    const credential = String(raw.accessCredential ?? "").trim();

    if (normalizedAccessType === "CODE" && credential.length === 0) {
        return { success: false, error: "Ingresá el código o PIN del equipo." };
    }
    if (normalizedAccessType === "CODE" && credential.length > 128) {
        return { success: false, error: "El código no puede superar 128 caracteres." };
    }
    if (normalizedAccessType === "PATTERN") {
        const points = credential.split("-").filter(Boolean).map(Number);
        const isValidPattern = points.length >= 4
            && new Set(points).size === points.length
            && points.every((point) => Number.isInteger(point) && point >= 1 && point <= 9);

        if (!isValidPattern) {
            return { success: false, error: "El patrón debe incluir al menos 4 puntos distintos." };
        }
    }

    return {
        success: true,
        data: {
            accessType: normalizedAccessType,
            accessCredential: normalizedAccessType === "NONE" ? null : credential,
            hasSimCard: raw.hasSimCard === true || raw.hasSimCard === "true",
            hasMemoryCard: raw.hasMemoryCard === true || raw.hasMemoryCard === "true",
        },
    };
}

export function readRepairIntakeFormData(formData: FormData): RepairIntakeResult {
    return normalizeRepairIntake({
        accessType: formData.get("accessType"),
        accessCredential: formData.get("accessCredential"),
        hasSimCard: formData.get("hasSimCard"),
        hasMemoryCard: formData.get("hasMemoryCard"),
    });
}

export function formatReceivedAccessories(hasSimCard: boolean, hasMemoryCard: boolean): string {
    if (hasSimCard && hasMemoryCard) return "SIM + Tarjeta de memoria";
    if (hasSimCard) return "SIM";
    if (hasMemoryCard) return "Tarjeta de memoria";
    return "Sin SIM ni tarjeta de memoria";
}

export function formatRepairAccess(accessType: RepairAccessType): string {
    if (accessType === "CODE") return "Código/PIN registrado";
    if (accessType === "PATTERN") return "Patrón registrado";
    return "Sin código";
}

export function summarizeRepairIntake(intake: RepairIntake) {
    return {
        accessLabel: formatRepairAccess(intake.accessType),
        accessoriesLabel: formatReceivedAccessories(intake.hasSimCard, intake.hasMemoryCard),
    };
}
