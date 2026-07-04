export type RepairWarrantyUser = {
    name?: string | null;
    role?: string | null;
};

export type RepairWarrantyOriginal = {
    assignedTo?: { name?: string | null } | null;
    statusHistory?: {
        user?: RepairWarrantyUser | null;
    }[];
};

export function getOriginalRepairTechnicianName(originalRepair: RepairWarrantyOriginal | null | undefined): string | null {
    if (!originalRepair) return null;

    const finalTechnician = originalRepair.statusHistory?.find((history) => (
        history.user?.role === "TECHNICIAN" && Boolean(history.user.name?.trim())
    ))?.user?.name?.trim();

    if (finalTechnician) return finalTechnician;

    return originalRepair.assignedTo?.name?.trim() || null;
}
