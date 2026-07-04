"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getRepairDateFilterRange } from "@/lib/repair-date-filter";
import { getCurrentUser } from "@/actions/auth-actions";
import { buildAdminRepairSearchFilters } from "@/lib/admin-repairs-search";
import {
    FINAL_REPAIR_STATUS_IDS,
    TECHNICIAN_REPAIR_TIME_SAMPLE_SIZE,
    formatRepairTimeMinutes,
    getAverageRepairTimeMinutes,
} from "@/lib/repair-time-metrics";

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
            toStatusId: { in: [...FINAL_REPAIR_STATUS_IDS] }, // Only finalized repairs for ranking
            fromStatusId: { notIn: [...FINAL_REPAIR_STATUS_IDS] }, // Avoid internal transitions
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
                },
            }),
        ]);

        const averageRepairWhere = buildPerformanceRepairWhere({
            branchId: filters.branchId,
            warrantyOnly: filters.warrantyOnly,
        });

        const averageSamplesByTech = await Promise.all(
            techs.map(async (tech) => {
                const samples = await db.repair.findMany({
                    where: {
                        ...averageRepairWhere,
                        assignedUserId: tech.id,
                        statusId: { in: [...FINAL_REPAIR_STATUS_IDS] },
                        finishedAt: { not: null },
                    },
                    select: {
                        startedAt: true,
                        finishedAt: true,
                    },
                    orderBy: { finishedAt: "desc" },
                    take: TECHNICIAN_REPAIR_TIME_SAMPLE_SIZE,
                });

                return [tech.id, samples] as const;
            }),
        );

        const averageTimeByTech = new Map(
            averageSamplesByTech.map(([techId, samples]) => [
                techId,
                samples.length > 0
                    ? formatRepairTimeMinutes(getAverageRepairTimeMinutes(samples))
                    : "-",
            ]),
        );

        const performanceByTech = new Map<string, {
            repairIds: Set<string>;
        }>();

        for (const entry of historyEntries) {
            if (!entry.userId) continue;

            const techPerformance = performanceByTech.get(entry.userId) ?? {
                repairIds: new Set<string>(),
            };

            if (!techPerformance.repairIds.has(entry.repairId)) {
                techPerformance.repairIds.add(entry.repairId);
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
                avgTime: averageTimeByTech.get(tech.id) ?? "-",
            };
        });

        return { success: true, data: stats };

    } catch (error) {
        console.error("Error fetching technician performance:", error);
        return { success: false, error: "Error al cargar estadísticas", data: [] };
    }
}
