"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { resolveStockDiscrepancy } from "./stock-actions";
import { getNotificationCenterPageData } from "./notification-center-data";
import { isEditablePaymentMethod, updateRelatedActionNotifications } from "./notification-response-helpers";
import {
    isJsonObject,
    readNotificationString,
} from "@/lib/notification-center";
import { Prisma } from "@prisma/client";

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

export async function getAllNotificationsAction(
    userId: string,
    filters?: { status?: string; type?: string; branchId?: string },
    page: number = 1,
    limit: number = 25
) {
    return getNotificationCenterPageData(userId, filters, page, limit);
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
    actionData?: Prisma.InputJsonValue | null;
    link?: string | null;
}) {
    try {
        await db.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                actionData: actionData === null ? Prisma.JsonNull : actionData,
                status: type === "ACTION_REQUEST" ? "PENDING" : null,
                link
            }
        });

        // Trigger Cleanup asynchronously (fire and forget)
        enforceNotificationLimit(userId).catch(err =>
            console.error("Error enforcing notification limit:", err)
        );

        return { success: true };
    } catch (error) {
        console.error("Error creating notification:", error);
        return { success: false };
    }
}

async function enforceNotificationLimit(userId: string) {
    const MAX_NOTIFICATIONS = 300;

    try {
        const count = await db.notification.count({ where: { userId } });

        if (count > MAX_NOTIFICATIONS) {
            // Find the ID of the 300th most recent notification
            const notifications = await db.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: MAX_NOTIFICATIONS,
                select: { id: true }
            });

            if (notifications.length === MAX_NOTIFICATIONS) {
                const lastId = notifications[notifications.length - 1].id;
                const lastDateNotification = await db.notification.findUnique({
                    where: { id: lastId },
                    select: { createdAt: true }
                });

                if (lastDateNotification) {
                    // Delete all notifications outside the top 300 using ID exclusion
                    // (handles edge cases where multiple notifications share the same createdAt)
                    const keepIds = notifications.map(n => n.id);
                    await db.notification.deleteMany({
                        where: {
                            userId,
                            id: { notIn: keepIds }
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error in enforceNotificationLimit:", error);
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

        const actionData = isJsonObject(notification.actionData) ? notification.actionData : null;

        // Special handling for Stock Discrepancy
        if (actionData?.type === "STOCK_DISCREPANCY") {
            return resolveStockDiscrepancy(notificationId, response === 'ACCEPTED');
        }

        // Special handling for Payment Method Change
        if (actionData?.type === "CHANGE_PAYMENT" && response === "ACCEPTED") {
            const saleId = readNotificationString(actionData.saleId);
            const newMethod = readNotificationString(actionData.newMethod);

            if (!saleId || !isEditablePaymentMethod(newMethod)) {
                return { success: false, error: "Datos de pago inválidos" };
            }

            // Transactional update to ensure consistency
            await db.$transaction(async (tx) => {
                const sale = await tx.sale.findUnique({ where: { id: saleId } });

                if (sale) {
                    const dataToUpdate: Prisma.SaleUpdateInput = {
                        paymentMethod: newMethod,
                        wasPaymentModified: true,
                    };

                    if (sale.originalPaymentMethod === null) {
                        dataToUpdate.originalPaymentMethod = sale.paymentMethod;
                    }

                    // 1. Update Sale Header
                    await tx.sale.update({
                        where: { id: saleId },
                        data: dataToUpdate
                    });

                    // 2. Fix Payments Array consistency
                    // Delete all existing payments for this sale
                    await tx.salePayment.deleteMany({
                        where: { saleId: saleId }
                    });

                    // Create new single payment with the full amount and new method
                    await tx.salePayment.create({
                        data: {
                            saleId: saleId,
                            amount: sale.total,
                            method: newMethod
                        }
                    });
                }
            });
        }

        // Update status
        await updateRelatedActionNotifications(notificationId, actionData, response);

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
