type ImageActor = { id: string; role: string; branch: { id: string } | null };
type ImageRepair = { branchId: string; assignedUserId: string | null };

export function canManageRepairImages(actor: ImageActor | null, repair: ImageRepair) {
    if (!actor) return false;
    if (actor.role === "ADMIN") return true;
    if (actor.role === "TECHNICIAN") return repair.assignedUserId === actor.id;
    return actor.role === "VENDOR" && actor.branch?.id === repair.branchId;
}
