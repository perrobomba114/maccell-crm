"use server";

import { db } from "@/lib/db";

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (date) {
        // Construct dates relative to Argentina Time (GMT-3)
        // We want 00:00:00 to 23:59:59 in GMT-3
        // "2024-05-20T00:00:00-03:00" parses to the correct UTC instant.
        const start = new Date(`${date}T00:00:00-03:00`);
        const end = new Date(`${date}T23:59:59.999-03:00`);

        // Check validity
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            where.createdAt = {
                gte: start,
                lte: end
            };
        }
    }

    // Get Data
    const invoices = await db.saleInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            sale: {
                include: {
                    branch: true
                }
            }
        },
        skip,
        take: limit
    });

    // Get Total Count
    const totalCount = await db.saleInvoice.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get Total Amount for the filter
    const aggregations = await db.saleInvoice.aggregate({
        where,
        _sum: {
            totalAmount: true
        }
    });

    const totalAmount = aggregations._sum.totalAmount || 0;

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount
    };
}
