"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { getDailyRange } from "@/lib/date-utils";
import type { AdminRepairsQuery, AdminRepairsResult } from "@/types/admin-repairs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const FINAL_REPAIR_STATUS_IDS = [5, 6, 7, 10] as const;
const FINISHED_HISTORY_STATUS_IDS = [5, 6, 7, 10] as const;

function normalizeAdminRepairsQuery(input: string | AdminRepairsQuery = ""): Required<AdminRepairsQuery> {
    const params = typeof input === "string" ? { query: input } : input;
    const pageSize = Math.min(Math.max(Number(params.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const date = params.date?.trim().slice(0, 10) || "";

    return {
        query: params.query?.trim() || "",
        branchId: params.branchId || "ALL",
        warrantyOnly: params.warrantyOnly ?? false,
        technician: params.technician?.trim() || "",
        technicianId: params.technicianId?.trim() || "",
        date,
        page: Math.max(Number(params.page) || 1, 1),
        pageSize,
    };
}

function buildAdminRepairsWhere(params: Required<AdminRepairsQuery>): Prisma.RepairWhereInput {
    const whereClause: Prisma.RepairWhereInput = {};
    const andFilters: Prisma.RepairWhereInput[] = [];

    if (params.query) {
        const words = params.query.split(/\s+/).filter(Boolean);
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

    if (params.branchId !== "ALL") {
        whereClause.branchId = params.branchId;
    }

    if (params.warrantyOnly) {
        whereClause.isWarranty = true;
    }

    // 1. Technician Filter (ID or Name)
    if (params.technicianId) {
        const { start, end } = getDailyRange(params.date || undefined);
        
        // Strictly match the "Finalized by this technician" criteria to align with Podio/KPIs
        // This ensures the table count matches the card count.
        andFilters.push({
            statusHistory: {
                some: {
                    userId: params.technicianId,
                    toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                    fromStatusId: { notIn: [...FINISHED_HISTORY_STATUS_IDS] },
                    ...(params.date ? { createdAt: { gte: start, lte: end } } : {}),
                },
            },
        });
    } else if (params.technician) {
        const { start, end } = getDailyRange(params.date || undefined);
        
        andFilters.push({
            statusHistory: {
                some: {
                    user: { name: params.technician },
                    toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                    fromStatusId: { notIn: [...FINISHED_HISTORY_STATUS_IDS] },
                    ...(params.date ? { createdAt: { gte: start, lte: end } } : {}),
                },
            },
        });
    } else if (params.date && !params.query) {
        // 2. Global Date Filter (Only if no tech is selected and no query)
        const { start, end } = getDailyRange(params.date);
        
        const finishedOnDate: Prisma.RepairWhereInput = {
            statusHistory: {
                some: {
                    toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                    createdAt: { gte: start, lte: end },
                },
            },
        };

        andFilters.push({
            OR: [
                { createdAt: { gte: start, lte: end } },
                finishedOnDate,
            ],
        });
    }

    if (andFilters.length > 0) {
        whereClause.AND = andFilters;
    }

    return whereClause;
}

export async function getAllRepairsForAdminAction(input: string | AdminRepairsQuery = ""): Promise<AdminRepairsResult> {
    const caller = await getCurrentUser();
    const params = normalizeAdminRepairsQuery(input);
    if (!caller || caller.role !== "ADMIN") {
        return { repairs: [], total: 0, page: params.page, pageSize: params.pageSize };
    }

    try {
        const whereClause = buildAdminRepairsWhere(params);
        const skip = (params.page - 1) * params.pageSize;

        const [repairs, total] = await db.$transaction([
            db.repair.findMany({
                where: whereClause,
                skip,
                take: params.pageSize,
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    status: { select: { id: true, name: true, color: true } },
                    assignedTo: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                    originalRepair: { select: { ticketNumber: true, problemDescription: true } },
                    statusHistory: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            fromStatus: { select: { id: true, name: true } },
                            toStatus: { select: { id: true, name: true } },
                            user: { select: { id: true, name: true, role: true } },
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            db.repair.count({ where: whereClause }),
        ]);

        return { repairs, total, page: params.page, pageSize: params.pageSize };
    } catch (error) {
        console.error("Error fetching all repairs for admin:", error);
        return { repairs: [], total: 0, page: params.page, pageSize: params.pageSize };
    }
}

export async function getRepairByIdAction(repairId: string) {
    const caller = await getCurrentUser();
    if (!caller) return null;

    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: {
                customer: true,
                branch: true,
                status: true,
                originalRepair: true,
                parts: {
                    include: { sparePart: true }
                },
                observations: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: true }
                },
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: { fromStatus: true, toStatus: true, user: true }
                }
            }
        });
        return repair;
    } catch (error) {
        console.error("Error fetching repair by id:", error);
        return null;
    }
}
