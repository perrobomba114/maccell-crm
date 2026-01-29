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
                    branch: true,
                    items: true
                }
            }
        },
        skip,
        take: limit
    });

    // Get Total Count (based on table filter)
    const totalCount = await db.saleInvoice.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get Total Amount
    // If date filter is active, sum relevant records.
    // If NO date filter, sum Current Month (per user request).
    let sumWhere = where;

    if (!date) {
        const now = new Date();
        // Construct Start of Month in GMT-3 (Approximate or Strict)
        // Simplified: Start of Month UTC - 3h is tricky without library.
        // Let's rely on standard current month defined by Server Time for "Current Month" concept.
        // Or better, standard ISO: First day of current month 00:00 to now.
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        sumWhere = {
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        };
    }

    const aggregations = await db.saleInvoice.aggregate({
        where: sumWhere,
        _sum: {
            totalAmount: true,
            netAmount: true,
            vatAmount: true
        }
    });

    const totalAmount = aggregations._sum.totalAmount || 0;
    const totalNet = aggregations._sum.netAmount || 0;
    const totalVat = aggregations._sum.vatAmount || 0;

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount,
        totalNet,
        totalVat
    };
}
