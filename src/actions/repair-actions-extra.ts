"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getRepairDateFilterRange } from "@/lib/repair-date-filter";
import { getCurrentUser } from "@/actions/auth-actions";
import { buildAdminRepairSearchFilters } from "@/lib/admin-repairs-search";

export interface TechnicianPerformance {
    id: string;
    name: string;
    seenCount: number;
    avgTime: string;
}

type TechnicianPerformanceFilters = {
    date?: Date | string | null;
    query?: string;
    branchId?: string;
    warrantyOnly?: boolean;
};

function formatAverageTime(totalMinutes: number, count: number) {
    if (count === 0) return "-";

    const avgMins = Math.round(totalMinutes / count);
    const hours = Math.floor(avgMins / 60);
    const mins = avgMins % 60;

    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}

function buildPerformanceRepairWhere(filters: TechnicianPerformanceFilters): Prisma.RepairWhereInput {
    const repairWhere: Prisma.RepairWhereInput = {};
    const andFilters: Prisma.RepairWhereInput[] = [];
    const query = filters.query?.trim();

    if (filters.branchId && filters.branchId !== "ALL") {
        repairWhere.branchId = filters.branchId;
    }

    if (filters.warrantyOnly) {
        repairWhere.isWarranty = true;
    }

    if (query) {
        andFilters.push(...buildAdminRepairSearchFilters(query));
    }

    if (andFilters.length > 0) {
        repairWhere.AND = andFilters;
    }

    return repairWhere;
}

export async function getTechnicianPerformance(filters: TechnicianPerformanceFilters = {}) {
    try {
        const caller = await getCurrentUser();
        if (!caller || caller.role !== "ADMIN") {
            return { success: false, error: "Unauthorized", data: [] };
        }

        const dateRange = getRepairDateFilterRange(filters.date);
        const repairWhere = buildPerformanceRepairWhere(filters);
        const historyWhere: Prisma.RepairStatusHistoryWhereInput = {
            userId: { not: null },
            toStatusId: { in: [5, 6, 7, 10] }, // Only finalized repairs for ranking
            fromStatusId: { notIn: [5, 6, 7, 10] }, // Avoid internal transitions
            ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
            repair: repairWhere,
        };

        const [techs, historyEntries] = await Promise.all([
            db.user.findMany({
                where: { role: "TECHNICIAN" },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            db.repairStatusHistory.findMany({
                where: historyWhere,
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
            const seenCount = techPerformance?.repairIds.size ?? 0;

            return {
                id: tech.id,
                name: tech.name,
                seenCount,
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
