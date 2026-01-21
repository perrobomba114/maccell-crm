"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotificationAction } from "./notification-creation";

// Fetch products for a specific branch
// CHANGED: Query ProductStock directly to get "All products OF THE BRANCH"
// Fetch products for a specific branch with Pagination and Search
export async function getBranchProducts(
    branchId: string,
    page: number = 1,
    limit: number = 25,
    query: string = "",
    sortField: string = "name",
    sortOrder: "asc" | "desc" = "asc"
) {
    if (!branchId) return { products: [], total: 0, totalPages: 0 };

    try {
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            branchId,
            product: {
                deletedAt: null,
                // Add search filter if query is present
                ...(query ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { sku: { contains: query, mode: 'insensitive' } },
                        { category: { name: { contains: query, mode: 'insensitive' } } }
                    ]
                } : {})
            }
        };

        // Determine orderBy
        let orderBy: any = {};
        if (sortField === "quantity") {
            orderBy = { quantity: sortOrder };
        } else if (sortField === "sku") {
            orderBy = { product: { sku: sortOrder } };
        } else if (sortField === "categoryName") {
            orderBy = { product: { category: { name: sortOrder } } };
        } else if (sortField === "lastCheckedAt") {
            orderBy = { lastCheckedAt: sortOrder };
        } else {
            // Default to name
            orderBy = { product: { name: sortOrder } };
        }

        // Get Total Count (for pagination)
        const total = await db.productStock.count({ where });

        // Get Paginated Data
        const stocks = await db.productStock.findMany({
            where,
            include: {
                product: {
                    include: {
                        category: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy,
            skip,
            take: limit
        });

        const products = stocks.map(s => ({
            id: s.product.id,
            sku: s.product.sku,
            name: s.product.name,
            categoryName: s.product.category?.name || "Sin Categoría",
            price: s.product.price,
            stockId: s.id, // guaranteed to exist
            quantity: s.quantity,
            lastCheckedAt: s.lastCheckedAt
        }));

        return {
            products,
            total,
            totalPages: Math.ceil(total / limit)
        };

    } catch (error) {
        console.error("Error fetching branch products:", error);
        return { products: [], total: 0, totalPages: 0 };
    }
}

// Confirm stock is correct (Green Button)
export async function confirmStock(stockId: string) {
    if (!stockId) return { success: false, error: "Missing stock ID" };

    try {
        await db.productStock.update({
            where: { id: stockId },
            data: {
                // @ts-ignore
                lastCheckedAt: new Date()
            }
        });
        revalidatePath("/vendor/products");
        return { success: true };
    } catch (error) {
        console.error("Error confirming stock:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error updating stock" };
    }
}

// Report Discrepancy (Red Button)
export async function reportStockDiscrepancy(
    stockId: string,
    userId: string,
    adjustment: number
) {
    if (!stockId || !userId || adjustment === 0) {
        return { success: false, error: "Invalid data" };
    }

    try {
        const stock = await db.productStock.findUnique({
            where: { id: stockId },
            include: { product: true, branch: true }
        });

        if (!stock) return { success: false, error: "Stock not found" };

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        // Notify Admins
        const admins = await db.user.findMany({
            where: { role: "ADMIN" }
        });

        // Generate a unique ID for this specific discrepancy event
        const discrepancyId = crypto.randomUUID();

        const actionData = {
            type: "STOCK_DISCREPANCY",
            discrepancyId, // This links all admin notifications for the same event
            stockId: stock.id,
            productName: stock.product.name,
            sku: stock.product.sku,
            currentQuantity: stock.quantity,
            adjustment,
            proposedQuantity: stock.quantity + adjustment,
            branchName: stock.branch.name,
            reporterName: user?.name || "Vendedor"
        };

        const promises = admins.map(admin => createNotificationAction({
            userId: admin.id,
            title: "Discrepancia de Stock Reportada",
            message: `El vendedor ${user?.name} reportó una diferencia de ${adjustment} en ${stock.product.name} (${stock.branch.name}). Stock actual: ${stock.quantity}. Propuesto: ${stock.quantity + adjustment}.`,
            type: "ACTION_REQUEST",
            actionData,
            link: "/admin/notifications"
        }));

        await Promise.all(promises);

        return { success: true };
    } catch (error) {
        console.error("Error reporting discrepancy:", error);
        return { success: false, error: "Error reporting discrepancy" };
    }
}

// Admin Action: Resolve Discrepancy
export async function resolveStockDiscrepancy(notificationId: string, approved: boolean) {
    try {
        const notification = await db.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification || !notification.actionData) {
            return { success: false, error: "Notification not found" };
        }

        const data = notification.actionData as any;
        if (data.type !== "STOCK_DISCREPANCY") {
            return { success: false, error: "Invalid notification type" };
        }

        // CRITICAL: Check if this discrepancy was already resolved by another admin
        if (data.discrepancyId) {
            // Find any notification for this specific discrepancy event that is NOT PENDING
            // Note: Since we store JSON, we have to look for other notifications that share this discrepancyId
            // Ideally we would have a separate table for Requests, but for now we query raw JSON or just check logic.
            // A more robust way without raw JSON queries (which can be slow/DB specific) is to Fetch all notifications for this discrepancyId first.
            // However, since we update ALL of them atomically below, we can check the status of the CURRENT notification.
            // But if Admin A acted, Admin B's notification might still be PENDING if we didn't update it yet.
            // So we MUST update ALL linked notifications.

            // Let's protect against race conditions by checking if the stock has already been changed?
            // No, stock might change for other reasons.
            // We need to check if ANY sibling notification is resolved.

            // Strategy: Find all notifications with this discrepancyId
            // This requires reading all notifications which might be heavy if table is huge, but here it's fine (only few admins).
            // Since filtering by JSON path is DB-specific (Postgres allows it), we will use a raw query or fetch potential candidates.
            // Simpler approach: We will fetch all ACTION_REQUEST notifications created recently and filter in JS, or trust that we update them fast enough.

            // BETTER APPROACH for Prisma + JSON: 
            // We can't easily query inside the JSON with standard Prisma without raw queries. 
            // But we can update them all. If we update all, we need to ensure we only run the stock logic ONCE.

            // Let's use a transaction.
            return await db.$transaction(async (tx) => {
                // 1. ATOMIC LOCK: Try to update all related notifications first.
                // We add "AND status = 'PENDING'" so that if this runs twice, the second time it affects 0 rows.
                const affectedRows = await tx.$executeRaw`
                    UPDATE notifications 
                    SET status = ${approved ? 'ACCEPTED' : 'REJECTED'}, 
                        "isRead" = true
                    WHERE "actionData"->>'discrepancyId' = ${data.discrepancyId}
                    AND status = 'PENDING'
                 `;

                // If no rows were updated, it means another admin already resolved it just now.
                if (Number(affectedRows) === 0) {
                    return { success: false, error: "Esta solicitud ya fue procesada por otro administrador." };
                }

                // 2. Perform Stock Update (Only if approved AND we won the race)
                if (approved) {
                    await tx.productStock.update({
                        where: { id: data.stockId },
                        data: {
                            quantity: { increment: data.adjustment },
                            // @ts-ignore
                            lastCheckedAt: new Date()
                        }
                    });
                }

                return { success: true };
            });
        }

        // Fallback for old notifications without discrepancyId (legacy support)
        if (approved) {
            await db.productStock.update({
                where: { id: data.stockId },
                data: {
                    quantity: { increment: data.adjustment },
                    // @ts-ignore
                    lastCheckedAt: new Date()
                }
            });
        }

        await db.notification.update({
            where: { id: notificationId },
            data: {
                status: approved ? "ACCEPTED" : "REJECTED",
                isRead: true
            }
        });

        revalidatePath("/vendor/products");
        revalidatePath("/admin");

        return { success: true };
    } catch (error) {
        console.error("Error resolving discrepancy:", error);
        // Handle "already processed" explicitly to show nice message
        if (error instanceof Error && error.message.includes("ya fue procesada")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "Error resolving discrepancy" };
    }
}

export async function getStockHealthPercentage(branchId: string) {
    if (!branchId) return 0;

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Count all products with stock > 0 in this branch
        const totalWithStock = await db.productStock.count({
            where: {
                branchId,
                quantity: { gt: 0 },
                product: { deletedAt: null }
            }
        });

        if (totalWithStock === 0) return 100;

        // Count those that were checked in the last 30 days
        const checkedWithStock = await db.productStock.count({
            where: {
                branchId,
                quantity: { gt: 0 },
                product: { deletedAt: null },
                lastCheckedAt: { gte: thirtyDaysAgo }
            }
        });

        const percentage = Math.round((checkedWithStock / totalWithStock) * 100);
        return percentage;
    } catch (error) {
        console.error("Error calculating stock health:", error);
        return 0;
    }
}
