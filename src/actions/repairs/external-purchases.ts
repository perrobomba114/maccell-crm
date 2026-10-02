"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { canAccessExternalPurchases } from "@/lib/repairs/external-purchases";

export async function getRepairExternalPurchases(repairId: string) {
    const actor = await getCurrentUser();
    if (!actor || !["ADMIN", "TECHNICIAN"].includes(actor.role)) return { allowed: false as const, purchases: [] };
    const repair = await db.repair.findUnique({
        where: { id: repairId }, select: { branchId: true, assignedUserId: true },
    });
    if (!repair || !canAccessExternalPurchases(actor, repair)) return { allowed: false as const, purchases: [] };
    const purchases = await db.repairExternalPurchase.findMany({
        where: { repairId }, orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
    });
    return { allowed: true as const, purchases: purchases.map(p => ({
        id: p.id, description: p.description, supplier: p.supplier, quantity: p.quantity,
        unitCost: p.unitCost.toString(), totalCost: p.totalCost.toString(),
        purchasedAt: p.purchasedAt.toISOString().slice(0, 10), receipt: p.receipt, userName: p.user.name,
    })) };
}
