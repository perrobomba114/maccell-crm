"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { resolveStockDiscrepancy } from "./stock-actions";

export async function getNotificationsAction(userId: string) {
    if (!userId) return [];

    try {
        const notifications = await db.notification.findMany({
            where: {
                userId,
                isRead: false
            },
            take: 20,
            orderBy: {
                createdAt: 'desc'
            }
        });
        return notifications;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function markNotificationReadAction(notificationId: string) {
    if (!notificationId) return { success: false };

    try {
        await db.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
        revalidatePath("/"); // optimize path later if needed
        return { success: true };
    } catch (error) {
        console.error("Error reading notification:", error);
        return { success: false };
    }
}

export async function markAllNotificationsReadAction(userId: string) {
    if (!userId) return { success: false };

    try {
        await db.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error reading all notifications:", error);
        return { success: false };
    }
}

export async function createNotificationAction({
    userId,
    title,
    message,
    type = "INFO",
    actionData = null,
    link = null
}: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    actionData?: any;
    link?: string | null;
}) {
    try {
        await db.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                actionData,
                status: type === "ACTION_REQUEST" ? "PENDING" : null,
                link
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating notification:", error);
        return { success: false };
    }
}

export async function respondToNotificationAction(notificationId: string, response: "ACCEPTED" | "REJECTED") {
    if (!notificationId) return { success: false };

    try {
        const notification = await db.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification || notification.type !== "ACTION_REQUEST") {
            return { success: false, error: "Notificación inválida" };
        }

        if (notification.status !== "PENDING") {
            return { success: false, error: "Ya respondida" };
        }

        // Special handling for Stock Discrepancy
        if (notification.actionData && (notification.actionData as any).type === "STOCK_DISCREPANCY") {
            return resolveStockDiscrepancy(notificationId, response === 'ACCEPTED');
        }

        // Special handling for Payment Method Change
        if (notification.actionData && (notification.actionData as any).type === "CHANGE_PAYMENT" && response === "ACCEPTED") {
            const { saleId, newMethod } = notification.actionData as any;
            // Direct DB update to avoid circular dependency with sales-actions.ts
            const sale = await db.sale.findUnique({ where: { id: saleId } });
            if (sale) {
                const dataToUpdate: any = {
                    paymentMethod: newMethod,
                    wasPaymentModified: true,
                };
                if ((sale as any).originalPaymentMethod === null) {
                    dataToUpdate.originalPaymentMethod = sale.paymentMethod;
                }
                await db.sale.update({
                    where: { id: saleId },
                    data: dataToUpdate
                });
            }
        }

        // Update status
        await db.notification.update({
            where: { id: notificationId },
            data: {
                status: response,
                isRead: true
            }
        });

        // Trigger Business Logic based on actionData
        // Example: If it's a transfer request...
        // For now, we just update the status.
        // We will implement specific handlers as needed or use a switch here.

        return { success: true };
    } catch (error) {
        console.error("Error responding to notification:", error);
        return { success: false };
    }
}
