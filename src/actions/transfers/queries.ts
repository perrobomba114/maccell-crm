"use server";

import { db } from "@/lib/db";

export async function getPendingTransfers(branchId: string) {
    try {
        const transfers = await db.stockTransfer.findMany({
            where: {
                targetBranchId: branchId,
                status: "PENDING"
            },
            include: {
                product: true,
                sourceBranch: {
                    select: { name: true }
                },
                createdBy: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, transfers };
    } catch (error) {
        console.error("Error fetching transfers:", error);
        return { success: false, error: "Error al obtener transferencias." };
    }
}
