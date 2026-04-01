import { db } from "@/lib/db";
import { getMonthlyRange, getDailyRange } from "@/lib/date-utils";

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
            // Month Filter: YYYY-MM — use AR timezone-aware monthly range
            const range = getMonthlyRange(`${date}-01`);
            start = range.start;
            end = range.end;
        } else {
            // Day Filter: YYYY-MM-DD — use AR timezone-aware daily range
            const range = getDailyRange(date);
            start = range.start;
            end = range.end;
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

    // Get Counts by VAT rate
    // We count invoices that contain items belonging to each VAT group.
    // Heuristic: Products = 21%, Repairs = 10.5% (Historically).
    const count21 = await db.saleInvoice.count({
        where: {
            ...where,
            vatAmount: { gt: 0 },
            sale: {
                items: {
                    some: {
                        productId: { not: null }
                    }
                }
            }
        }
    });

    const count105 = await db.saleInvoice.count({
        where: {
            ...where,
            vatAmount: { gt: 0 },
            sale: {
                items: {
                    some: {
                        repairId: { not: null }
                    }
                }
            }
        }
    });

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount,
        totalNet,
        totalVat,
        count21,
        count105
    };
}
