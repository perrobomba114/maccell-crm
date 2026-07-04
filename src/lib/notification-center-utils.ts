import type { NotificationCenterSource } from "./notification-center";

export type JsonObject = Record<string, unknown>;

const SALE_NUMBER_PATTERN = /SALE-\d+-\d+/i;

export function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readNotificationString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function extractNotificationSaleNumber(notification: Pick<NotificationCenterSource, "message" | "link">): string | null {
    const source = `${notification.message} ${notification.link ?? ""}`;
    return source.match(SALE_NUMBER_PATTERN)?.[0] ?? null;
}

export function normalizeNotificationText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
