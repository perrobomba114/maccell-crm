"use server";

import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export interface TechnicianPerformance {
    id: string;
    name: string;
    repairedCount: number;
    avgTime: string;
}

export async function getTechnicianPerformance(date: Date = new Date()) {
    try {
        const start = startOfDay(date);
        const end = endOfDay(date);

        // Fetch technicians (Role: TECHNICIAN)
        const techs = await db.user.findMany({
            where: { role: "TECHNICIAN" },
            select: { id: true, name: true }
        });

        const stats: TechnicianPerformance[] = [];

        for (const tech of techs) {
            // Find repairs COMPLETED/UPDATED to distinct "Done" status by this tech in the date range
            // Status: 5, 6, 7, 10
            // Logic: A repair is "done" by a tech if they are assigned to it AND it is in a done status.
            // Problem: If repair was done weeks ago but updated today (e.g. pickup), does it count?
            // "Cuanto repararon cada dia". Usually implies "Finished Date" or "UpdatedAt" when status became Done.
            // We'll use `updatedAt` within the day filter AND status in Done list.

            const repairs = await db.repair.findMany({
                where: {
                    assignedUserId: tech.id,
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: { gte: start, lte: end }
                },
                select: {
                    startedAt: true,
                    finishedAt: true, // If available
                    updatedAt: true,
                    estimatedTime: true // As fallback for calc? No, avg time means actual duration if possible.
                }
            });

            const count = repairs.length;
            let totalMinutes = 0;
            let validTimeCount = 0;

            repairs.forEach(r => {
                if (r.startedAt && r.finishedAt) {
                    const diff = new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
                    const mins = diff / (1000 * 60);
                    if (mins > 0) {
                        totalMinutes += mins;
                        validTimeCount++;
                    }
                } else if (r.estimatedTime) {
                    // Fallback to estimated time if no precise tracking? 
                    // Or ignore? ignoring is safer for "Average Time" metric accuracy.
                    // But if they don't track start/finish, will be 0.
                    // Let's use estimate as fallback if validTimeCount is low? No.
                }
            });

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
