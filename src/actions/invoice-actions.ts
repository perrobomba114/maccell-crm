import { db } from "@/lib/db";
import { getMonthlyRange, getDailyRange } from "@/lib/date-utils";
import type { Prisma } from "@prisma/client";

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD OR YYYY-MM
}

export type InvoiceFiscalEntity = "MACCELL" | "8BIT";

export type InvoiceEntitySummary = {
    entity: InvoiceFiscalEntity;
    label: string;
    count: number;
    totalAmount: number;
    totalNet: number;
    totalVat: number;
    branches: {
        name: string;
        count: number;
        totalAmount: number;
        totalVat: number;
    }[];
};

function normalizeBillingEntity(invoice: { billingEntity: string | null; sale?: { branch?: { code?: string | null; name?: string | null } | null } | null }): InvoiceFiscalEntity {
    const branch = invoice.sale?.branch;
    if (invoice.billingEntity === "8BIT" || branch?.code === "8BIT" || branch?.name?.toUpperCase().includes("8 BIT")) {
        return "8BIT";
    }

    return "MACCELL";
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const where: Prisma.SaleInvoiceWhereInput = {};

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

    const invoiceInclude = {
        sale: {
            include: {
                branch: true,
                items: true
            }
        }
    } satisfies Prisma.SaleInvoiceInclude;

    const [invoices, totalCount, aggregations, summaryInvoices] = await db.$transaction([
        db.saleInvoice.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: invoiceInclude,
            skip,
            take: limit
        }),
        db.saleInvoice.count({ where }),
        db.saleInvoice.aggregate({
            where,
            _sum: {
                totalAmount: true,
                netAmount: true,
                vatAmount: true
            }
        }),
        db.saleInvoice.findMany({
            where,
            select: {
                id: true,
                billingEntity: true,
                totalAmount: true,
                netAmount: true,
                vatAmount: true,
                sale: {
                    select: {
                        branch: {
                            select: {
                                name: true,
                                code: true,
                            }
                        }
                    }
                }
            }
        })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const totalAmount = aggregations._sum.totalAmount || 0;
    const totalNet = aggregations._sum.netAmount || 0;
    const totalVat = aggregations._sum.vatAmount || 0;

    const summaryMap = new Map<InvoiceFiscalEntity, InvoiceEntitySummary>([
        ["MACCELL", { entity: "MACCELL", label: "MACCELL - 3 locales", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] }],
        ["8BIT", { entity: "8BIT", label: "8 Bit Accesorios", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] }],
    ]);

    const branchSummary = new Map<InvoiceFiscalEntity, Map<string, InvoiceEntitySummary["branches"][number]>>([
        ["MACCELL", new Map()],
        ["8BIT", new Map()],
    ]);

    for (const invoice of summaryInvoices) {
        const entity = normalizeBillingEntity(invoice);
        const summary = summaryMap.get(entity);
        if (!summary) continue;

        summary.count += 1;
        summary.totalAmount += invoice.totalAmount;
        summary.totalNet += invoice.netAmount;
        summary.totalVat += invoice.vatAmount;

        const branchName = invoice.sale.branch.name;
        const branchesForEntity = branchSummary.get(entity);
        if (!branchesForEntity) continue;

        const currentBranch = branchesForEntity.get(branchName) ?? {
            name: branchName,
            count: 0,
            totalAmount: 0,
            totalVat: 0,
        };
        currentBranch.count += 1;
        currentBranch.totalAmount += invoice.totalAmount;
        currentBranch.totalVat += invoice.vatAmount;
        branchesForEntity.set(branchName, currentBranch);
    }

    const entitySummaries = Array.from(summaryMap.values()).map((summary) => ({
        ...summary,
        totalAmount: Math.round(summary.totalAmount * 100) / 100,
        totalNet: Math.round(summary.totalNet * 100) / 100,
        totalVat: Math.round(summary.totalVat * 100) / 100,
        branches: Array.from(branchSummary.get(summary.entity)?.values() ?? [])
            .map((branch) => ({
                ...branch,
                totalAmount: Math.round(branch.totalAmount * 100) / 100,
                totalVat: Math.round(branch.totalVat * 100) / 100,
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount),
    }));

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount,
        totalNet,
        totalVat,
        entitySummaries
    };
}
