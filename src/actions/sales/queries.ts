"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import type { PaymentMethod, Prisma } from "@prisma/client";
import type { AdminSalesPage, BranchRankingItem, PaymentMethodLike, SaleWithDetails } from "@/types/sales";

export type { AdminSalesPage, BranchRankingItem, SaleWithDetails } from "@/types/sales";

const DEFAULT_ADMIN_SALES_PAGE_SIZE = 25;
const MAX_ADMIN_SALES_PAGE_SIZE = 100;

type AdminSalesFilters = {
    startDate?: Date;
    endDate?: Date;
    term?: string;
    branchId?: string | "ALL";
};

const adminSaleInclude = {
    vendor: { select: { name: true } },
    branch: { select: { name: true } },
    items: true,
    payments: true,
} satisfies Prisma.SaleInclude;

type AdminSaleRecord = Prisma.SaleGetPayload<{ include: typeof adminSaleInclude }>;

function buildAdminSalesWhere(filters?: AdminSalesFilters): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {};

    if (filters?.branchId && filters.branchId !== "ALL") {
        where.branchId = filters.branchId;
    }

    if (filters?.startDate && filters?.endDate) {
        where.createdAt = {
            gte: filters.startDate,
            lte: filters.endDate,
        };
    }

    if (filters?.term) {
        where.OR = [
            {
                saleNumber: {
                    contains: filters.term,
                    mode: "insensitive",
                }
            },
            {
                items: {
                    some: {
                        repair: {
                            ticketNumber: {
                                contains: filters.term,
                                mode: "insensitive",
                            }
                        }
                    }
                }
            }
        ];
    }

    return where;
}

function normalizePage(value?: number): number {
    if (!value || !Number.isFinite(value)) return 1;
    return Math.max(1, Math.trunc(value));
}

function normalizePageSize(value?: number): number {
    if (!value || !Number.isFinite(value)) return DEFAULT_ADMIN_SALES_PAGE_SIZE;
    return Math.min(MAX_ADMIN_SALES_PAGE_SIZE, Math.max(1, Math.trunc(value)));
}

function mapAdminSale(sale: AdminSaleRecord): SaleWithDetails {
    return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        vendor: sale.vendor,
        branch: sale.branch,
        items: sale.items,
        payments: sale.payments
    };
}

export async function getSales(filters?: {
    startDate?: Date;
    endDate?: Date;
    term?: string;
    paymentMethod?: PaymentMethodLike | "ALL";
}): Promise<SaleWithDetails[]> {
    const user = await getCurrentUser();
    if (!user || user.role !== "VENDOR" || !user.branch) {
        return [];
    }

    try {
        const where: Prisma.SaleWhereInput = {
            branchId: user.branch.id,
        };

        if (filters?.startDate && filters?.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }

        if (filters?.term) {
            where.saleNumber = {
                contains: filters.term,
                mode: "insensitive",
            };
        }

        if (filters?.paymentMethod && filters.paymentMethod !== "ALL") {
            if (filters.paymentMethod === "MIXTO") {
                where.paymentMethod = "SPLIT";
            } else {
                where.paymentMethod = filters.paymentMethod as PaymentMethod;
            }
        }

        const sales = await db.sale.findMany({
            where,
            include: {
                vendor: { select: { name: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        return sales.map(s => ({
            id: s.id,
            saleNumber: s.saleNumber,
            total: s.total,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
            vendor: s.vendor,
            items: s.items,
            payments: s.payments
        }));

    } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
    }
}

export async function getAdminSales(filters?: AdminSalesFilters): Promise<SaleWithDetails[]> {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return [];
    }

    try {
        const where = buildAdminSalesWhere(filters);

        const sales = await db.sale.findMany({
            where,
            include: adminSaleInclude,
            orderBy: { createdAt: "desc" },
            take: 2000,
        });

        return sales.map(mapAdminSale);

    } catch (error) {
        console.error("Error fetching admin sales:", error);
        return [];
    }
}

export async function getAdminSalesPage(filters?: AdminSalesFilters & {
    page?: number;
    limit?: number;
}): Promise<AdminSalesPage> {
    const emptyPage: AdminSalesPage = {
        sales: [],
        totalSalesCount: 0,
        totalRevenue: 0,
        page: 1,
        pageSize: DEFAULT_ADMIN_SALES_PAGE_SIZE,
        totalPages: 1,
    };

    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return emptyPage;
    }

    const page = normalizePage(filters?.page);
    const pageSize = normalizePageSize(filters?.limit);

    try {
        const where = buildAdminSalesWhere(filters);
        const [sales, totalSalesCount, totals] = await Promise.all([
            db.sale.findMany({
                where,
                include: adminSaleInclude,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.sale.count({ where }),
            db.sale.aggregate({
                where,
                _sum: { total: true },
            }),
        ]);

        const totalPages = Math.max(1, Math.ceil(totalSalesCount / pageSize));

        return {
            sales: sales.map(mapAdminSale),
            totalSalesCount,
            totalRevenue: totals._sum.total || 0,
            page,
            pageSize,
            totalPages,
        };
    } catch (error) {
        console.error("Error fetching paginated admin sales:", error);
        return { ...emptyPage, page, pageSize };
    }
}

export async function getBranchRanking(filters?: {
    startDate?: Date;
    endDate?: Date;
}): Promise<BranchRankingItem[]> {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return [];
    }

    try {
        const where: Prisma.SaleWhereInput = {};

        if (filters?.startDate && filters?.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }

        const groupedSales = await db.sale.groupBy({
            by: ['branchId'],
            _sum: {
                total: true,
            },
            where,
        });

        const branches = await db.branch.findMany({
            where: {
                id: { in: groupedSales.map(g => g.branchId).filter((id): id is string => id !== null) }
            },
            select: { id: true, name: true }
        });

        const ranking: BranchRankingItem[] = groupedSales.map(g => {
            const branch = branches.find(b => b.id === g.branchId);
            return {
                branchId: g.branchId,
                branchName: branch ? branch.name : "Desconocida",
                total: g._sum.total || 0
            };
        });

        return ranking.sort((a, b) => b.total - a.total);

    } catch (error) {
        console.error("Error fetching branch ranking:", error);
        return [];
    }
}
