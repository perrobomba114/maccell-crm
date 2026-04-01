"use server";

import { db } from "@/lib/db";
import { getDailyRange } from "@/lib/date-utils";

interface GetPriceOverridesParams {
    page?: number;
    limit?: number;
    date?: Date | null;
    branchId?: string | null;
}

export async function getPriceOverrides({ page = 1, limit = 25, date, branchId }: GetPriceOverridesParams = {}) {
    try {
        const whereClause: any = {
            originalPrice: {
                not: null
            }
        };

        const saleConditions: any = {};

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
            include: {
                sale: {
                    include: {
                        branch: true,
                        vendor: true
                    }
                },
                product: true,
                repair: true
            },
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
