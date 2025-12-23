
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
                    // pricePos: true, // REMOVED to prevent crash on stale client
                    category: {
                        select: {
                            name: true
                        }
                    }
                } as any, // Cast to any to bypass stale type definition for pricePos
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            db.sparePart.count({ where: whereClause })
        ]);

        // Always fetch pricePos manually to be safe against stale client
        // We do this if we have data.
        if (data.length > 0) {
            try {
                // Optimization: Only fetch for the IDs we displayed
                const ids = data.map(d => d.id);
                // Create a parameter string like $1, $2, $3...
                // Prisma raw query with IN clause is tricky with arrays.
                // Safest way is to iterate or fetch all (if simple).
                // Let's try JOINING logical ORs or just using Prisma.sql helper if available?
                // Actually, for 25 items, we can just construct the string carefully or use a different approach.
                // Let's just fetch ALL for now to be 100% sure we don't break SQL syntax, 
                // OR use Promise.all with single lookups (25 queries is fine).
                // OR use a raw query with a big OR.
                // Simplest and safest given previous issues: Fetch ALL (it's what worked before).
                // But let's verify if we can do WHERE id IN (...).
                // string matching in raw query is annoying with UUIDs.
                // We will stick to the global fetch for simplicity and robustness as verified in export action.

                const rawPrices = await db.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;

                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                data.forEach((part: any) => {
                    (part as any).pricePos = priceMap.get(part.id) || 0;
                });
            } catch (e) { console.error("Vendor stock fallback error", e); }
        }

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
