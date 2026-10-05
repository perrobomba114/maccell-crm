"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";

export async function getFinishRepairParts(repairId: string) {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "TECHNICIAN") throw new Error("No autorizado");
    const repair = await db.repair.findFirst({
        where: { id: repairId, assignedUserId: actor.id },
        select: {
            parts: { select: { id: true, sparePart: { select: { name: true } } } },
            externalPurchases: { select: { id: true, description: true, supplier: true } },
        },
    });
    if (!repair) throw new Error("No tenés asignada esta reparación");
    return repair;
}
