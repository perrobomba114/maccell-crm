import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
    buildEntitySummaries,
    estimateVatFromGross,
    normalizeFiscalEntityFromBranch,
    roundCurrency,
    type InvoiceFiscalEntity,
    type InvoiceReceivedSummary,
    type InvoiceVatPayableSummary,
} from "./invoice-summary-helpers";
import { resolveInvoiceDateRange } from "./invoice-afip-control-helpers";
export type {
    InvoiceEntitySummary,
    InvoiceFiscalEntity,
    InvoiceReceivedSummary,
    InvoiceSystemAfipDiffSummary,
    InvoiceVatPayableSummary,
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
    const receivedWhere: Prisma.ExpenseWhereInput = {};

    const dateRange = resolveInvoiceDateRange(date);
    if (dateRange) {
        where.createdAt = {
            gte: dateRange.start,
            lte: dateRange.end
        };
        receivedWhere.createdAt = {
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
        receivedCount,
        receivedAggregations,
        receivedBranchGroups,
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
        }),
        db.expense.count({ where: receivedWhere }),
        db.expense.aggregate({
            where: receivedWhere,
            _sum: { amount: true }
        }),
        db.expense.groupBy({
            by: ["branchId"],
            where: receivedWhere,
            _sum: { amount: true },
            _count: { _all: true },
            orderBy: { _sum: { amount: "desc" } },
        })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const totalAmount = aggregations._sum.totalAmount || 0;
    const totalNet = aggregations._sum.netAmount || 0;
    const totalVat = aggregations._sum.vatAmount || 0;

    const entitySummaries = buildEntitySummaries(summaryInvoices);

    const receivedBranches = await db.branch.findMany({
        where: {
            id: { in: receivedBranchGroups.map((group) => group.branchId) }
        },
        select: { id: true, name: true, code: true }
    });
    const receivedBranchData = new Map(receivedBranches.map((branch) => [branch.id, branch]));
    const receivedByEntity = new Map<InvoiceFiscalEntity, { count: number; totalAmount: number; totalVat: number }>([
        ["MACCELL", { count: 0, totalAmount: 0, totalVat: 0 }],
        ["8BIT", { count: 0, totalAmount: 0, totalVat: 0 }],
    ]);

    const receivedBranchSummaries = receivedBranchGroups.map((group) => {
        const branch = receivedBranchData.get(group.branchId);
        const totalAmount = roundCurrency(group._sum?.amount || 0);
        const totalVat = estimateVatFromGross(totalAmount);
        const groupCount = typeof group._count === "object" ? group._count._all || 0 : 0;
        const entity = normalizeFiscalEntityFromBranch(branch);
        const entitySummary = receivedByEntity.get(entity);

        if (entitySummary) {
            entitySummary.count += groupCount;
            entitySummary.totalAmount = roundCurrency(entitySummary.totalAmount + totalAmount);
            entitySummary.totalVat = roundCurrency(entitySummary.totalVat + totalVat);
        }

        return {
            name: branch?.name || "Sucursal sin nombre",
            count: groupCount,
            totalAmount,
            totalVat,
        };
    });

    const receivedSummary: InvoiceReceivedSummary = {
        count: receivedCount,
        totalAmount: roundCurrency(receivedAggregations._sum.amount || 0),
        totalVat: estimateVatFromGross(receivedAggregations._sum.amount || 0),
        branches: receivedBranchSummaries,
    };

    const vatPayableSummary: InvoiceVatPayableSummary[] = entitySummaries.map((summary) => {
        const received = receivedByEntity.get(summary.entity);
        const receivedVat = received?.totalVat || 0;

        return {
            entity: summary.entity,
            label: summary.entity === "8BIT" ? "8 Bit Accesorios" : "MACCELL",
            debitVat: summary.totalVat,
            receivedVat,
            payableVat: roundCurrency(summary.totalVat - receivedVat),
        };
    });

    return {
        invoices,
        totalCount,
        totalPages,
        currentPage: page,
        totalAmount,
        totalNet,
        totalVat,
        entitySummaries,
        receivedSummary,
        vatPayableSummary,
    };
}
