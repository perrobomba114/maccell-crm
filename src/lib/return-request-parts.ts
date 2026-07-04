export type ReturnPartSnapshot = {
    id?: string;
    sparePartId: string;
    quantity: number;
};

export function readReturnPartsSnapshot(value: unknown): ReturnPartSnapshot[] {
    if (!Array.isArray(value)) return [];

    return value.filter((part): part is ReturnPartSnapshot => {
        if (typeof part !== "object" || part === null || Array.isArray(part)) return false;
        const candidate = part as Record<string, unknown>;
        return typeof candidate.sparePartId === "string"
            && typeof candidate.quantity === "number"
            && Number.isFinite(candidate.quantity)
            && (candidate.id === undefined || typeof candidate.id === "string");
    });
}
