export function normalizeAdminRepairStatusId(value: unknown): number {
    if (typeof value !== "string" && typeof value !== "number") return 0;
    const status = Number(value);
    return Number.isSafeInteger(status) && status > 0 ? status : 0;
}
