import { db } from "@/lib/db";
import { getMonthlyRange, getDailyRange } from "@/lib/date-utils";
import type { Prisma } from "@prisma/client";
import {
    getAfipVoucherReadSummaries,
    type AfipReadResult,
} from "./afip-voucher-reader";
import {
    buildEntitySummaries,
    buildSystemAfipDiffSummary,
    estimateVatFromGross,
    normalizeFiscalEntityFromBranch,
    roundCurrency,
    type InvoiceFiscalEntity,
    type InvoiceReceivedSummary,
    type InvoiceVatPayableSummary,
} from "./invoice-summary-helpers";
export type {
    InvoiceEntitySummary,
    InvoiceFiscalEntity,
    InvoiceReceivedSummary,
    InvoiceSystemAfipDiffSummary,
    InvoiceVatPayableSummary,
} from "./invoice-summary-helpers";

type InvoiceForAfipSeed = {
    billingEntity: string | null;
    totalAmount: number;
    netAmount: number;
    vatAmount: number;
    invoiceType: string;
    invoiceNumber: string;
    createdAt: Date;
    sale: {
        branch: {
            name: string | null;
            code: string | null;
        } | null;
    } | null;
};

type AfipReadRangeAccumulator = {
    min: number;
    max: number;
};

const ENTITY_SALES_POINT: Record<InvoiceFiscalEntity, number> = {
    MACCELL: 10,
    "8BIT": 3,
};

function invoiceTypeToVoucherType(invoiceType: string): 1 | 6 | 11 | null {
    const normalized = invoiceType.trim().toUpperCase();

    if (normalized === "A") return 1;
    if (normalized === "B") return 6;
    if (normalized === "C") return 11;

    return null;
}

function parseVoucherNumber(invoiceNumber: string) {
    const parts = invoiceNumber.split("-");
    if (parts.length < 2) return null;

    const parsed = Number(parts[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function buildAfipRanges(invoices: InvoiceForAfipSeed[]) {
    const rangesByEntityAndType = new Map<InvoiceFiscalEntity, Map<1 | 6 | 11, AfipReadRangeAccumulator>>([
        ["MACCELL", new Map()],
        ["8BIT", new Map()],
    ]);

    for (const invoice of invoices) {
        const entity = normalizeFiscalEntityFromBranch(invoice.sale?.branch);
        const voucherType = invoiceTypeToVoucherType(invoice.invoiceType);
        const voucherNumber = parseVoucherNumber(invoice.invoiceNumber);

        if (!voucherType || !voucherNumber) continue;

        const byType = rangesByEntityAndType.get(entity);
        if (!byType) continue;

        const currentRange = byType.get(voucherType);
        if (!currentRange) {
            byType.set(voucherType, { min: voucherNumber, max: voucherNumber });
            continue;
        }

        byType.set(voucherType, {
            min: Math.min(currentRange.min, voucherNumber),
            max: Math.max(currentRange.max, voucherNumber),
        });
    }

    return Array.from(rangesByEntityAndType.entries()).flatMap(([entity, byType]) =>
        Array.from(byType.entries())
            .filter(([, boundaries]) => boundaries.max >= boundaries.min)
            .map(([voucherType, boundaries]) => ({
                entity,
                salesPoint: ENTITY_SALES_POINT[entity],
                voucherType,
                minVoucherNumber: boundaries.min,
                maxVoucherNumber: boundaries.max,
            }))
    );
}

function emptyAfipReadResult(): AfipReadResult {
    return {
        summaries: [
            { entity: "MACCELL", label: "MACCELL - 3 locales", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
            { entity: "8BIT", label: "8 Bit Accesorios", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] },
        ],
        warnings: [],
    };
}

interface GetInvoicesOptions {
    page?: number;
    limit?: number;
    date?: string; // ISO string YYYY-MM-DD OR YYYY-MM
}

export async function getInvoices({ page = 1, limit = 25, date }: GetInvoicesOptions) {
    const skip = (page - 1) * limit;

    const systemWhere: Prisma.SaleInvoiceWhereInput = {};
    const where: Prisma.SaleInvoiceWhereInput = {
        cae: { not: "" },
    };
    const receivedWhere: Prisma.ExpenseWhereInput = {};

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
            systemWhere.createdAt = {
                gte: start,
                lte: end
            };
            receivedWhere.createdAt = {
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

    const [
        invoices,
        totalCount,
        aggregations,
        summaryInvoices,
        receivedCount,
        receivedAggregations,
        receivedBranchGroups,
        systemSummaryInvoices,
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
        }),
        db.saleInvoice.findMany({
            where: systemWhere,
            select: {
                id: true,
                billingEntity: true,
                totalAmount: true,
                netAmount: true,
                vatAmount: true,
                invoiceType: true,
                invoiceNumber: true,
                createdAt: true,
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
    const systemEntitySummaries = buildEntitySummaries(systemSummaryInvoices);

    const afipReadResult = start && end
        ? await getAfipVoucherReadSummaries({
            ranges: buildAfipRanges(systemSummaryInvoices as InvoiceForAfipSeed[]),
            startDate: start,
            endDate: end,
        })
        : emptyAfipReadResult();

    const systemAfipDiffSummary = buildSystemAfipDiffSummary(systemEntitySummaries, afipReadResult.summaries);

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
        const totalAmount = roundCurrency(group._sum.amount || 0);
        const totalVat = estimateVatFromGross(totalAmount);
        const entity = normalizeFiscalEntityFromBranch(branch);
        const entitySummary = receivedByEntity.get(entity);

        if (entitySummary) {
            entitySummary.count += group._count._all;
            entitySummary.totalAmount = roundCurrency(entitySummary.totalAmount + totalAmount);
            entitySummary.totalVat = roundCurrency(entitySummary.totalVat + totalVat);
        }

        return {
            name: branch?.name || "Sucursal sin nombre",
            count: group._count._all,
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
        systemAfipDiffSummary,
    };
}
