"use server";

import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (date) {
        const queryDate = new Date(date);
        // Ensure valid date
        if (!isNaN(queryDate.getTime())) {
            // Admin wants "filter by day", so we filter from Start to End of that day in UTC/Local? 
            // Ideally we treat the date string as the local "day" and filter full range.
            // If input is "2024-01-19", we want 2024-01-19 00:00:00 to 2024-01-19 23:59:59.
            // Using date-fns startOfDay/endOfDay on the parsed date object.

            // Important: The stored dates are likely UTC. "2024-01-19" from client usually means local day.
            // We need to be careful with timezones. For now let's use the simple start/end range of the provided date object.
            // NOTE: new Date("2024-01-19") -> UTC Midnight.
            // Adjusting for "Timezone" might be needed if the server is UTC but user expects -3.
            // For strict correctness with Argentina (GMT-3), "2024-01-19" user time is "2024-01-19 03:00 UTC" to "2024-01-20 03:00 UTC".
            // Simplified approach: Search for the whole UTC day + buffer or just simple day match.
            // Let's assume standard UTC date matching for now.

            where.createdAt = {
                gte: startOfDay(queryDate),
                lte: endOfDay(queryDate)
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
