"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { Prisma } from "@prisma/client";

export async function getActiveRepairsAction(branchId: string, statusIds?: number[]) {
    const caller = await getCurrentUser();
    if (!caller) return [];

    const defaultStatuses = [1, 2, 3, 4, 8, 9];
    const filterStatuses = statusIds && statusIds.length > 0 ? statusIds : defaultStatuses;

    try {
        const whereClause: Prisma.RepairWhereInput = {
            statusId: {
                in: filterStatuses
            }
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        const repairs = await db.repair.findMany({
            where: whereClause,
            include: {
                customer: true,
                status: true,
                assignedTo: true,
                branch: true,
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
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return JSON.parse(JSON.stringify(repairs));
    } catch (error) {
        console.warn("[ERROR] Error fetching active repairs:", error);
        return [];
    }
}

export async function getRepairHistoryAction(
    branchId: string,
    query: string = "",
    page: number = 1,
    pageSize: number = 20
) {
    if (!branchId) return { repairs: [], totalPages: 0, totalCount: 0 };
    const caller = await getCurrentUser();
    if (!caller) return { repairs: [], totalPages: 0, totalCount: 0 };

    try {
        const whereClause: Prisma.RepairWhereInput = {
            branchId,
            statusId: {
                in: [5, 6, 7, 10]
            }
        };

        if (query) {
            const words = query.trim().split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                whereClause.AND = words.map(word => ({
                    OR: [
                        { ticketNumber: { contains: word, mode: "insensitive" } },
                        { customer: { name: { contains: word, mode: "insensitive" } } },
                        { customer: { phone: { contains: word, mode: "insensitive" } } },
                        { deviceBrand: { contains: word, mode: "insensitive" } },
                        { deviceModel: { contains: word, mode: "insensitive" } },
                    ],
                }));
            }
        }

        const [repairs, totalCount] = await Promise.all([
            db.repair.findMany({
                where: whereClause,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    customer: true,
                    status: true,
                    assignedTo: true,
                    branch: true,
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
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            }),
            db.repair.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        return JSON.parse(JSON.stringify({
            repairs,
            totalPages,
            totalCount
        }));
    } catch (error) {
        console.warn("[ERROR] Error fetching repair history:", error);
        return { repairs: [], totalPages: 0, totalCount: 0 };
    }
}
