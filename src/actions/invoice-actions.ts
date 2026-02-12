// ... (imports remain)
import { db } from "@/lib/db";

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD OR YYYY-MM
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const where: any = {};

    let start: Date;
    let end: Date;

    if (date) {
        if (date.length === 7) {
            // Month Filter: YYYY-MM
            const [year, month] = date.split('-').map(Number);
            // Construct Start of Month (Local/GMT-3 consideration: simplified to string)
            // "2024-02-01T00:00:00"
            start = new Date(`${date}-01T00:00:00`);
            // End of Month: Day 0 of next month
            end = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
            // Day Filter: YYYY-MM-DD
            start = new Date(`${date}T00:00:00-03:00`);
            end = new Date(`${date}T23:59:59.999-03:00`);
        }

        // Validate
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

    // Get Total Count
    const totalCount = await db.saleInvoice.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get Aggregations (Total Amount for the filtered period)
    const aggregations = await db.saleInvoice.aggregate({
        where, // Use the same where clause (filtered by date)
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
        totalNet, // Return Net for accurate VAT calc in UI
        totalVat  // Return VAT for accurate VAT calc in UI
    };
}
