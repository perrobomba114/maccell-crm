"use server";

import { db } from "@/lib/db";

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
