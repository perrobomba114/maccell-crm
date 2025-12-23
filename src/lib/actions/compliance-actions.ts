"use server";

import { db } from "@/lib/db";
import { createNotificationAction } from "./notifications";

export async function checkStockControlCompliance(userId: string) {
    if (!userId) return;

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { branchId: true, name: true }
        });

        if (!user || !user.branchId) return;

        // 1. Identify Top 30 Best Selling Products for this branch
        // We'll count occurrences in SaleItem
        const topSellingItems = await db.saleItem.groupBy({
            by: ['productId'],
            where: {
                sale: {
                    branchId: user.branchId
                },
                productId: { not: null }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 30
        });

        const topProductIds = topSellingItems
            .map(item => item.productId)
            .filter((id): id is string => id !== null);

        if (topProductIds.length === 0) return;

        // 2. Check Stock Control status
        const uncheckedStocks = await db.productStock.findMany({
            where: {
                branchId: user.branchId,
                productId: { in: topProductIds },
                OR: [
                    // @ts-ignore
                    { lastCheckedAt: null },
                    // @ts-ignore
                    { lastCheckedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Older than 30 days
                ]
            },
            include: {
                product: { select: { name: true } }
            }
        });

        if (uncheckedStocks.length > 0) {
            // Check if we already notified in the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const existingNotification = await db.notification.findFirst({
                where: {
                    userId,
                    type: "COMPLIANCE_ALERT",
                    createdAt: { gte: oneHourAgo }
                }
            });

            if (!existingNotification) {
                await createNotificationAction({
                    userId,
                    title: "⚠️ URGENTE: Control de Stock Requerido",
                    message: `Tienes ${uncheckedStocks.length} productos sin controlar hace más de 30 días. Debes realizar el control para detener estas alertas.`,
                    type: "COMPLIANCE_ALERT",
                    link: "/vendor/products"
                });
            }
        }

    } catch (error) {
        console.error("Error checking compliance:", error);
    }
}
