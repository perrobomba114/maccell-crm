"use server";

import { db } from "@/lib/db";

/**
 * Lightweight check for the latest repair update time.
 * Used for smart polling to avoid unnecessary full data refreshes.
 */
export async function checkLatestRepairUpdate(): Promise<Date | null> {
    try {
        const latestRepair = await db.repair.findFirst({
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        });

        return latestRepair?.updatedAt || null;
    } catch (error) {
        console.error("Error checking latest repair update:", error);
        return null;
    }
}
