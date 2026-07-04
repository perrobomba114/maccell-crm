import { db } from "@/lib/db";
import { getNotificationActionRequestKey } from "@/lib/notification-center";

const EDITABLE_PAYMENT_METHODS = new Set(["CASH", "CARD", "MERCADOPAGO"]);

export async function updateRelatedActionNotifications(
    notificationId: string,
    actionData: Record<string, unknown> | null,
    response: "ACCEPTED" | "REJECTED"
) {
    const requestKey = getNotificationActionRequestKey(actionData);

    if (!requestKey) {
        await db.notification.update({
            where: { id: notificationId },
            data: {
                status: response,
                isRead: true,
            },
        });
        return;
    }

    const pendingNotifications = await db.notification.findMany({
        where: {
            type: "ACTION_REQUEST",
            status: "PENDING",
        },
        select: {
            id: true,
            actionData: true,
        },
    });

    const relatedIds = pendingNotifications
        .filter((notification) => getNotificationActionRequestKey(notification.actionData) === requestKey)
        .map((notification) => notification.id);

    if (!relatedIds.includes(notificationId)) {
        relatedIds.push(notificationId);
    }

    await db.notification.updateMany({
        where: { id: { in: relatedIds } },
        data: {
            status: response,
            isRead: true,
        },
    });
}

export function isEditablePaymentMethod(value: string | null): value is "CASH" | "CARD" | "MERCADOPAGO" {
    return value !== null && EDITABLE_PAYMENT_METHODS.has(value);
}
