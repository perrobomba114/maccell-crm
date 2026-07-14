const CEREBRO_V2_ROLES = new Set(["ADMIN", "TECHNICIAN"]);

export function canUseCerebroV2(role: string | undefined): boolean {
    return role !== undefined && CEREBRO_V2_ROLES.has(role);
}
