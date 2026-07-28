import { z } from "zod";

export const REPAIR_CHAT_PAGE_SIZE = 20;
export const REPAIR_CHAT_MESSAGE_PAGE_SIZE = 30;
export const REPAIR_CHAT_SEARCH_LIMIT = 10;
export const REPAIR_CHAT_MAX_IMAGES = 4;

export const sendRepairChatMessageSchema = z.object({
    clientRequestId: z.string().uuid(),
    content: z.string().trim().max(2000).optional(),
    imageUrls: z.array(z.string().min(1).max(300)).max(REPAIR_CHAT_MAX_IMAGES).default([]),
    replyToId: z.string().min(1).max(80).optional(),
}).refine((value) => Boolean(value.content) || value.imageUrls.length > 0, {
    message: "Escribí un mensaje o adjuntá una imagen",
});

export const repairChatListSchema = z.object({
    scope: z.enum(["active", "archived"]).default("active"),
    cursor: z.string().max(500).optional(),
});

export const repairChatSearchSchema = z.object({
    query: z.string().trim().min(1).max(80),
    scope: z.enum(["active", "archived"]).default("active"),
});

export const repairChatReadSchema = z.object({
    readAt: z.string().datetime(),
});

export type RepairChatCursor = { id: string; at: string };

export function encodeRepairChatCursor(cursor: RepairChatCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeRepairChatCursor(value?: string | null): RepairChatCursor | null {
    if (!value) return null;
    try {
        const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        const result = z.object({ id: z.string().min(1), at: z.string().datetime() }).safeParse(parsed);
        return result.success ? result.data : null;
    } catch {
        return null;
    }
}

export function hasAnyExternalReader(
    senderId: string,
    sentAt: string,
    readers: Array<{ userId: string; lastReadAt: string }>,
): boolean {
    const sentTime = new Date(sentAt).getTime();
    return readers.some((reader) => reader.userId !== senderId && new Date(reader.lastReadAt).getTime() >= sentTime);
}
