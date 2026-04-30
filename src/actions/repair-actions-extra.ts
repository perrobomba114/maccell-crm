"use server";

import { db } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";
import { getDailyRange, getArgentinaDate, TIMEZONE } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";

export interface TechnicianPerformance {
    id: string;
    name: string;
    repairedCount: number;
    avgTime: string;
}

function normalizePerformanceDate(date: Date | string = getArgentinaDate()) {
    if (typeof date === "string") {
        return date.trim().slice(0, 10);
    }

    return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

function formatAverageTime(totalMinutes: number, count: number) {
    if (count === 0) return "-";

    const avgMins = Math.round(totalMinutes / count);
    const hours = Math.floor(avgMins / 60);
    const mins = avgMins % 60;

    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}

export async function getTechnicianPerformance(date: Date | string = getArgentinaDate()) {
    try {
        const caller = await getCurrentUser();
        if (!caller || caller.role !== "ADMIN") {
            return { success: false, error: "Unauthorized", data: [] };
        }

        const dateStr = normalizePerformanceDate(date);
        const { start, end } = getDailyRange(dateStr);

        const [techs, historyEntries] = await Promise.all([
            db.user.findMany({
                where: { role: "TECHNICIAN" },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            db.repairStatusHistory.findMany({
                where: {
                    userId: { not: null },
                    toStatusId: { in: [5, 6, 7] },
                    createdAt: { gte: start, lte: end },
                },
                select: {
                    repairId: true,
                    userId: true,
                    createdAt: true,
                    repair: {
                        select: {
                            createdAt: true,
                        },
                    },
                },
            }),
        ]);

        const performanceByTech = new Map<string, {
            repairIds: Set<string>;
            totalMinutes: number;
            validTimeCount: number;
        }>();

        for (const entry of historyEntries) {
            if (!entry.userId) continue;

            const techPerformance = performanceByTech.get(entry.userId) ?? {
                repairIds: new Set<string>(),
                totalMinutes: 0,
                validTimeCount: 0,
            };

            if (!techPerformance.repairIds.has(entry.repairId)) {
                techPerformance.repairIds.add(entry.repairId);

                const diffMs = entry.createdAt.getTime() - entry.repair.createdAt.getTime();
                const minutes = diffMs / (1000 * 60);
                if (minutes > 0) {
                    techPerformance.totalMinutes += minutes;
                    techPerformance.validTimeCount++;
                }
            }

            performanceByTech.set(entry.userId, techPerformance);
        }

        const stats: TechnicianPerformance[] = techs.map((tech) => {
            const techPerformance = performanceByTech.get(tech.id);
            const repairedCount = techPerformance?.repairIds.size ?? 0;

            return {
                id: tech.id,
                name: tech.name,
                repairedCount,
                avgTime: techPerformance
                    ? formatAverageTime(techPerformance.totalMinutes, techPerformance.validTimeCount)
                    : "-",
            };
        });

        return { success: true, data: stats };

    } catch (error) {
        console.error("Error fetching technician performance:", error);
        return { success: false, error: "Error al cargar estadísticas", data: [] };
    }
}
