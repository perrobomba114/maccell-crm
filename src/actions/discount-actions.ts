"use server";

import { db } from "@/lib/db";

export async function getPriceOverrides(limit: number = 50) {
    try {
        const overrides = await db.saleItem.findMany({
            where: {
                originalPrice: {
                    not: null
                }
            },
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
            take: limit
        });

        // Add explicit type check validation
        return { success: true, overrides };
    } catch (error) {
        console.error("Error fetching price overrides:", error);
        return { success: false, error: "Error al cargar historial de descuentos." };
    }
}
