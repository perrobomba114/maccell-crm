"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import type { PaymentMethod, Prisma } from "@prisma/client";
import type { BranchRankingItem, PaymentMethodLike, SaleWithDetails } from "@/types/sales";

export type { BranchRankingItem, SaleWithDetails } from "@/types/sales";

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

export async function getAdminSales(filters?: {
    startDate?: Date;
    endDate?: Date;
    term?: string;
    branchId?: string | "ALL";
}): Promise<SaleWithDetails[]> {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return [];
    }

    try {
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

        const sales = await db.sale.findMany({
            where,
            include: {
                vendor: { select: { name: true } },
                branch: { select: { name: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: "desc" },
            take: 2000,
        });

        return sales.map(s => ({
            id: s.id,
            saleNumber: s.saleNumber,
            total: s.total,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
            vendor: s.vendor,
            branch: s.branch,
            items: s.items,
            payments: s.payments
        }));

    } catch (error) {
        console.error("Error fetching admin sales:", error);
        return [];
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
