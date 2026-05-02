"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { getDailyRange, getArgentinaDate, TIMEZONE } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";

export interface TechnicianPerformance {
    id: string;
    name: string;
    seenCount: number;
    avgTime: string;
}

type TechnicianPerformanceFilters = {
    date?: Date | string;
    query?: string;
    branchId?: string;
    warrantyOnly?: boolean;
};

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
        const words = query.split(/\s+/).filter(Boolean);
        andFilters.push(...words.map((word): Prisma.RepairWhereInput => ({
            OR: [
                { ticketNumber: { contains: word, mode: "insensitive" } },
                { customer: { name: { contains: word, mode: "insensitive" } } },
                { customer: { phone: { contains: word, mode: "insensitive" } } },
                { deviceBrand: { contains: word, mode: "insensitive" } },
                { deviceModel: { contains: word, mode: "insensitive" } },
                { branch: { name: { contains: word, mode: "insensitive" } } },
            ],
        })));
    }

    if (andFilters.length > 0) {
        repairWhere.AND = andFilters;
    }

    return repairWhere;
}

export async function getTechnicianPerformance(filters: TechnicianPerformanceFilters = { date: getArgentinaDate() }) {
    try {
        const caller = await getCurrentUser();
        if (!caller || caller.role !== "ADMIN") {
            return { success: false, error: "Unauthorized", data: [] };
        }

        const dateStr = normalizePerformanceDate(filters.date ?? getArgentinaDate());
        const { start, end } = getDailyRange(dateStr);
        const repairWhere = buildPerformanceRepairWhere(filters);

        const [techs, historyEntries] = await Promise.all([
            db.user.findMany({
                where: { role: "TECHNICIAN" },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            db.repairStatusHistory.findMany({
                where: {
                    userId: { not: null },
                    createdAt: { gte: start, lte: end },
                    repair: repairWhere,
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
