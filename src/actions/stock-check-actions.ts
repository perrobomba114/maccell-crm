"use server";

import { db } from "@/lib/db";

/**
 * Lightweight check for the latest stock update time in a branch.
 * Used for smart polling to avoid unnecessary full data refreshes.
 */
export async function checkLatestStockUpdate(branchId: string): Promise<Date | null> {
    if (!branchId) return null;

    try {
        const latestStock = await db.productStock.findFirst({
            where: { branchId },
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        });

        return latestStock?.updatedAt || null;
    } catch (error) {
        console.error("Error checking latest stock update:", error);
        return null;
    }
}
