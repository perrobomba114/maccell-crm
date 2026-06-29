import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
    buildDebitVatSummary,
    buildEntitySummaries,
    type InvoiceDebitVatSummary,
} from "./invoice-summary-helpers";
import { resolveInvoiceDateRange } from "./invoice-afip-control-helpers";
export type {
    InvoiceDebitVatSummary,
    InvoiceEntitySummary,
    InvoiceFiscalEntity,
    InvoiceSystemAfipDiffSummary,
} from "./invoice-summary-helpers";

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD OR YYYY-MM
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const where: Prisma.SaleInvoiceWhereInput = {
        cae: { not: "" },
    };

    const dateRange = resolveInvoiceDateRange(date);
    if (dateRange) {
        where.createdAt = {
            gte: dateRange.start,
            lte: dateRange.end
        };
    }

    const invoiceInclude = {
        sale: {
            include: {
                branch: true,
                items: true
            }
        }
    } satisfies Prisma.SaleInvoiceInclude;

    const [
        invoices,
        totalCount,
        aggregations,
        summaryInvoices,
    ] = await db.$transaction([
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

    const entitySummaries = buildEntitySummaries(summaryInvoices);
    const debitVatSummary: InvoiceDebitVatSummary[] = buildDebitVatSummary(entitySummaries);

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount,
        totalNet,
        totalVat,
        entitySummaries,
        debitVatSummary,
    };
}
