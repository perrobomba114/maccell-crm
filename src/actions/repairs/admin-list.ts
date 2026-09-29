"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import type { AdminRepairsQuery, AdminRepairsResult } from "@/types/admin-repairs";

import { normalizeAdminRepairsQuery, buildAdminRepairsWhere } from "@/lib/admin-repairs-query";
import { FINAL_REPAIR_STATUS_IDS as FINISHED_HISTORY_STATUS_IDS } from "@/lib/repair-time-metrics";

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
                    originalRepair: { select: { id: true, ticketNumber: true, problemDescription: true } },
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
                originalRepair: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        problemDescription: true,
                        assignedTo: { select: { name: true } },
                        statusHistory: {
                            where: {
                                toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                                fromStatusId: { notIn: [...FINISHED_HISTORY_STATUS_IDS] },
                            },
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            select: {
                                user: { select: { name: true, role: true } },
                            },
                        },
                    },
                },
                warrantyRepairs: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        ticketNumber: true,
                        problemDescription: true,
                    },
                },
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
