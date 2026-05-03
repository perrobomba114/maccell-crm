"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getDailyRange } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";

interface GetPriceOverridesParams {
    page?: number;
    limit?: number;
    date?: Date | null;
    branchId?: string | null;
}

const priceOverrideInclude = {
    sale: {
        include: {
            branch: true,
            vendor: true
        }
    },
    product: true,
    repair: true
} satisfies Prisma.SaleItemInclude;

export type PriceOverrideListItem = Prisma.SaleItemGetPayload<{
    include: typeof priceOverrideInclude;
}>;

export async function getPriceOverrides({ page = 1, limit = 25, date, branchId }: GetPriceOverridesParams = {}) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const whereClause: Prisma.SaleItemWhereInput = {
            originalPrice: {
                not: null
            }
        };

        const saleConditions: Prisma.SaleWhereInput = {};

        if (date) {
            const { start, end } = getDailyRange(date.toISOString().split('T')[0]);
            saleConditions.createdAt = { gte: start, lte: end };
        }

        if (branchId) {
            saleConditions.branchId = branchId;
        }

        if (Object.keys(saleConditions).length > 0) {
            whereClause.sale = saleConditions;
        }

        const total = await db.saleItem.count({
            where: whereClause
        });

        const totalPages = Math.ceil(total / limit);

        const overrides = await db.saleItem.findMany({
            where: whereClause,
            include: priceOverrideInclude,
            orderBy: {
                sale: {
                    createdAt: "desc"
                }
            },
            take: limit,
            skip: (page - 1) * limit
        });

        return { success: true, overrides, total, totalPages };
    } catch (error) {
        console.error("Error fetching price overrides:", error);
        return { success: false, error: "Error al cargar historial de descuentos." };
    }
}
