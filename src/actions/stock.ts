
"use server";

import { db } from "@/lib/db";
import { getUserData } from "@/actions/get-user";
import { createNotificationAction } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

interface GetVendorStockParams {
    page?: number;
    limit?: number;
    query?: string;
}

export async function getVendorStockAction({ page = 1, limit = 25, query = "" }: GetVendorStockParams) {
    const skip = (page - 1) * limit;

    const user = await getUserData();
    // Restriction: Frontend handles "Stock Value" visibility. 
    // We return data for all vendors so they can check prices/names.
    if (!user) return { data: [], total: 0, totalPages: 0, currentPage: 1 };

    try {
        const whereClause = {
            AND: [
                { deletedAt: null },
                {
                    NOT: {
                        category: {
                            name: { in: ["FUNDAS", "TEMPLADO", "ACCESORIO", "ACCESORIOS"], mode: 'insensitive' }
                        }
                    }
                },
                query ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' as const } },
                        { sku: { contains: query, mode: 'insensitive' as const } },
                        { brand: { contains: query, mode: 'insensitive' as const } },
                        { category: { name: { contains: query, mode: 'insensitive' as const } } }
                    ]
                } : {}
            ]
        } as any;

        const [data, total] = await Promise.all([
            db.sparePart.findMany({
                where: whereClause,
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    brand: true,
                    stockLocal: true,
                    pricePos: true,
                    category: {
                        select: {
                            name: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            db.sparePart.count({ where: whereClause })
        ]);

        // Deduplicate data (Safety net for potential Prisma/Join behavior on complex OR queries)
        const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());

        return {
            data: uniqueData.map((item: any) => ({
                id: item.id,
                sku: item.sku,
                name: item.name,
                brand: item.brand,
                stockLocal: item.stockLocal,
                pricePos: item.pricePos || 0,
                categoryName: item.category?.name || "Sin Categoría"
            })),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };

    } catch (error) {
        console.error("Error fetching vendor stock:", error);
        return { data: [], total: 0, totalPages: 0, currentPage: 1 };
    }
}

export async function removeStockUnitAction(productId: string) {
    try {
        const user = await getUserData();
        if (!user || user.role !== "VENDOR") {
            return { success: false, error: "No autorizado" };
        }

        const branchName = user.branch?.name?.toUpperCase() || "";
        if (!branchName.includes("MACCELL 2")) {
            return { success: false, error: "Solo vendedores de MACCELL 2 pueden realizar esta acción" };
        }

        // 1. Decrement Stock
        const part = await db.sparePart.update({
            where: { id: productId },
            data: {
                stockLocal: { decrement: 1 }
            }
        });

        // 2. Notify Admins
        const admins = await db.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true }
        });

        const notifyPromises = admins.map(admin =>
            createNotificationAction({
                userId: admin.id,
                title: "Baja de Stock (MACCELL 2)",
                message: `MACCELL 2 dio de baja un Repuesto: ${part.name} (SKU: ${part.sku})`,
                type: "WARNING",
                link: `/admin/repuestos?query=${part.sku}` // Link corrected to Repuestos page
            })
        );

        await Promise.all(notifyPromises);

        revalidatePath("/vendor/stock");
        return { success: true };
    } catch (error) {
        console.error("Error removing stock unit:", error);
        return { success: false, error: "Error al dar de baja" };
    }
}
