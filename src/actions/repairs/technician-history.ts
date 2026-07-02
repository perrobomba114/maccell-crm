"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { Prisma } from "@prisma/client";

export async function getTechnicianHistory(userId: string, page: number = 1, pageSize: number = 25, query: string = "") {
    const caller = await getCurrentUser();
    if (!caller || (caller.role !== "ADMIN" && caller.id !== userId)) {
        return { success: false, error: "No autorizado" };
    }
    try {
        const skip = (page - 1) * pageSize;

        // Statuses: 5 (Finalizado OK), 6 (Irreparable), 7 (Diagnosticado), 10 (Custom/Other)
        const targetStatuses = [5, 6, 7, 10];

        const whereClause: Prisma.RepairWhereInput = {
            assignedUserId: userId,
            statusId: { in: targetStatuses }
        };

        if (query) {
            whereClause.OR = [
                { ticketNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } },
                { deviceBrand: { contains: query, mode: "insensitive" } },
                { deviceModel: { contains: query, mode: "insensitive" } },
            ];
        }

        // 1. Get Total Count
        const totalCount = await db.repair.count({
            where: whereClause
        });

        // 2. Get Data
        const repairs = await db.repair.findMany({
            where: whereClause,
            select: {
                id: true,
                ticketNumber: true,
                deviceBrand: true,
                deviceModel: true,
                problemDescription: true,
                deviceImages: true,
                estimatedPrice: true,
                isWet: true,
                isWarranty: true,
                startedAt: true,
                finishedAt: true,
                updatedAt: true,
                promisedAt: true,
                statusId: true,
                customer: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
                status: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
                assignedTo: {
                    select: {
                        name: true,
                    },
                },
                branch: {
                    select: {
                        name: true,
                        address: true,
                        phone: true,
                        imageUrl: true,
                    },
                },
                statusHistory: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        fromStatus: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: "desc"
            },
            take: pageSize,
            skip: skip
        });

        const totalPages = Math.ceil(totalCount / pageSize);
        const serializedRepairs = repairs.map((repair) => ({
            ...repair,
            startedAt: repair.startedAt?.toISOString() ?? null,
            finishedAt: repair.finishedAt?.toISOString() ?? null,
            updatedAt: repair.updatedAt.toISOString(),
            promisedAt: repair.promisedAt.toISOString(),
        }));

        return {
            success: true,
            data: {
                repairs: serializedRepairs,
                totalCount,
                totalPages,
                currentPage: page
            }
        };

    } catch (error) {
        console.error("Error fetching technician history:", error);
        return { success: false, error: "Error al cargar el historial" };
    }
}
