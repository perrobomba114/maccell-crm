"use server";

import { db } from "@/lib/db";

export async function getTechnicianHistory(userId: string, page: number = 1, pageSize: number = 25, query: string = "") {
    try {
        const skip = (page - 1) * pageSize;

        // Statuses: 5 (Finalizado OK), 6 (Irreparable), 7 (Diagnosticado), 10 (Custom/Other)
        const targetStatuses = [5, 6, 7, 10];

        const whereClause: any = {
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
            include: {
                customer: true,
                status: true,
                // deviceBrand is a scalar, no need to include

            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: pageSize,
            skip: skip
        });

        const totalPages = Math.ceil(totalCount / pageSize);

        return {
            success: true,
            data: {
                repairs,
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
