"use server";

import { db } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";
import { getDailyRange, getArgentinaDate, TIMEZONE } from "@/lib/date-utils";

export interface TechnicianPerformance {
    id: string;
    name: string;
    repairedCount: number;
    avgTime: string;
}

export async function getTechnicianPerformance(date: Date = getArgentinaDate()) {
    try {
        // Use AR timezone-aware string format so day boundaries match Argentina local time
        // Using date.toISOString() causes late-night AR times (e.g. 21:30) to overflow into tomorrow in UTC
        const dateStr = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
        
        const { start, end } = getDailyRange(dateStr);

        // Fetch technicians (Role: TECHNICIAN)
        const techs = await db.user.findMany({
            where: { role: "TECHNICIAN" },
            select: { id: true, name: true }
        });

        const stats: TechnicianPerformance[] = [];

        for (const tech of techs) {
            // Find status history entries where THIS tech moved a repair to "DONE" statuses (5, 6, 7)
            const historyEntries = await db.repairStatusHistory.findMany({
                where: {
                    userId: tech.id,
                    toStatusId: { in: [5, 6, 7] },
                    createdAt: { gte: start, lte: end }
                },
                include: {
                    repair: {
                        select: {
                            id: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    }
                }
            });

            const uniqueRepairs = new Set<string>();
            let totalMinutes = 0;
            let validTimeCount = 0;

            historyEntries.forEach(entry => {
                if (!uniqueRepairs.has(entry.repairId)) {
                    uniqueRepairs.add(entry.repairId);
                    
                    // Calculate estimated time from creation to completion
                    const diff = new Date(entry.createdAt).getTime() - new Date(entry.repair.createdAt).getTime();
                    const mins = diff / (1000 * 60);
                    if (mins > 0) {
                        totalMinutes += mins;
                        validTimeCount++;
                    }
                }
            });

            const count = uniqueRepairs.size;

            const avgMins = validTimeCount > 0 ? Math.round(totalMinutes / validTimeCount) : 0;
            const hours = Math.floor(avgMins / 60);
            const mins = avgMins % 60;
            const avgTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

            if (count > 0) {
                stats.push({
                    id: tech.id,
                    name: tech.name,
                    repairedCount: count,
                    avgTime: avgTimeStr
                });
            } else {
                // Include tech even with 0 repairs? "3 cards con nombres de los tecnicos".
                // User likely wants to see them even if 0 to know they did nothing.
                stats.push({
                    id: tech.id,
                    name: tech.name,
                    repairedCount: 0,
                    avgTime: "-"
                });
            }
        }

        // Return top 3 or all? "3 cards". I will return top 3 by count + any others if I have < 3?
        // Actually, if there are exactly 3 technicians in the shop, returning all is correct.
        // I will return all and let UI grid handle it.
        return { success: true, data: stats };

    } catch (error) {
        console.error("Error fetching technician performance:", error);
        return { success: false, error: "Error al cargar estadísticas", data: [] };
    }
}
