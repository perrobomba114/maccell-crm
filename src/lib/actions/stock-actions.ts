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
    query: string = ""
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
            orderBy: {
                product: {
                    name: 'asc'
                }
            },
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
        // We need to find admin users. For now, let's assume all users with Role.ADMIN
        const admins = await db.user.findMany({
            where: { role: "ADMIN" }
        });

        const actionData = {
            type: "STOCK_DISCREPANCY",
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
            link: "/admin/notifications" // Or wherever admins manage this
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

        if (approved) {
            // Apply stock change
            await db.productStock.update({
                where: { id: data.stockId },
                data: {
                    quantity: { increment: data.adjustment },
                    // @ts-ignore
                    lastCheckedAt: new Date()
                }
            });
        }

        // Update Notification Status
        await db.notification.update({
            where: { id: notificationId },
            data: {
                status: approved ? "ACCEPTED" : "REJECTED",
                isRead: true
            }
        });

        revalidatePath("/vendor/products");
        revalidatePath("/admin"); // Revalidate admin dashboard potentially

        return { success: true };
    } catch (error) {
        console.error("Error resolving discrepancy:", error);
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
