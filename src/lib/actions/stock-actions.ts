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

        // CHECK FOR DUPLICATES: Prevent spamming discrepancies for same product
        // We fetch all pending ACTION_REQUEST notifications and filter in memory to find STOCK_DISCREPANCY for this stockId
        const pendingDiscrepancies = await db.notification.findMany({
            where: {
                status: 'PENDING',
                type: 'ACTION_REQUEST' // CORRECTED: The DB type is ACTION_REQUEST, not STOCK_DISCREPANCY
            },
            select: { actionData: true }
        });

        const existingPending = pendingDiscrepancies.find(n => {
            const data = n.actionData as any;
            // We must checks if it's a STOCK_DISCREPANCY and for the same stockId
            return data?.type === 'STOCK_DISCREPANCY' && data?.stockId === stockId;
        });

        if (existingPending) {
            return {
                success: false,
                error: "Ya existe una solicitud pendiente para este producto. Espere a que un administrador la revise."
            };
        }


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
            // Transactional update to ensure atomicity
            const transactionResult = await db.$transaction(async (tx) => {
                // 1. Fetch potential sibling notifications
                // We fetch all pending ACTION_REQUESTs and filter in memory.
                const pendingNotifications = await tx.notification.findMany({
                    where: {
                        status: 'PENDING',
                        type: 'ACTION_REQUEST'
                    },
                    select: { id: true, actionData: true }
                });

                // Filter for matching discrepancyId
                const siblingIds = pendingNotifications
                    .filter(n => {
                        const d = n.actionData as any;
                        return d?.discrepancyId === data.discrepancyId;
                    })
                    .map(n => n.id);

                if (siblingIds.length === 0) {
                    // Check if *this* notification was already processed (if so, return specific error)
                    return { success: false, error: "Esta solicitud ya fue procesada por otro administrador." };
                }

                // 2. ATOMIC UPDATE: Update all found siblings
                // CRITICAL FIX: Only update if they are currently PENDING.
                // This 'where' clause ensures we don't count rows that lost the race condition.
                const result = await tx.notification.updateMany({
                    where: {
                        id: { in: siblingIds },
                        status: 'PENDING'
                    },
                    data: {
                        status: approved ? 'ACCEPTED' : 'REJECTED',
                        isRead: true
                    }
                });

                // If result.count is 0, it means another transaction beat us to it.
                if (result.count === 0) {
                    return { success: false, error: "Esta solicitud ya fue procesada por otro administrador." };
                }

                // 3. Perform Stock Update (Only if approved AND we actually updated the notifications)
                if (approved) {
                    const stockExists = await tx.productStock.findUnique({
                        where: { id: data.stockId }
                    });

                    if (stockExists) {
                        await tx.productStock.update({
                            where: { id: data.stockId },
                            data: {
                                quantity: { increment: data.adjustment },
                                // @ts-ignore
                                lastCheckedAt: new Date()
                            }
                        });
                    } else {
                        console.warn(`Stock ID ${data.stockId} not found. Skipping update.`);
                        return { success: true, message: "Solicitud procesada, pero el producto ya no existe." };
                    }
                }

                return { success: true };
            });

            if (transactionResult.success) {
                revalidatePath("/vendor/products");
                revalidatePath("/admin");
                revalidatePath("/admin/notifications");
            }
            return transactionResult;
        }

        // Fallback for old notifications without discrepancyId
        if (notification.status !== 'PENDING') {
            return { success: false, error: "Ya respondida" };
        }

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
        revalidatePath("/admin/notifications");

        return { success: true };
    } catch (error) {
        console.error("Error resolving discrepancy:", error);
        if (error instanceof Error && error.message.includes("ya fue procesada")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: error instanceof Error ? error.message : "Error resolving discrepancy" };
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
