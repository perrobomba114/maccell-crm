import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ACTIVE_REPAIR_CHAT_STATUS_IDS, FINAL_REPAIR_CHAT_STATUS_IDS } from "@/lib/repairs/status";
import {
    decodeRepairChatCursor,
    encodeRepairChatCursor,
    REPAIR_CHAT_MESSAGE_PAGE_SIZE,
    REPAIR_CHAT_PAGE_SIZE,
    REPAIR_CHAT_SEARCH_LIMIT,
    type RepairChatCursor,
} from "./contracts";
import { canAccessRepairChat, isRepairChatReadOnly, type RepairChatUser } from "./policy";

export function buildAccessibleRepairWhere(user: RepairChatUser): Prisma.RepairWhereInput {
    if (user.role === "ADMIN") return {};
    if (user.role === "VENDOR") return { branchId: user.branchId ?? "__no_branch__" };
    return { assignedUserId: user.id };
}

async function getAuthorizedRepair(user: RepairChatUser, repairId: string) {
    const repair = await db.repair.findUnique({
        where: { id: repairId },
        select: { id: true, ticketNumber: true, branchId: true, assignedUserId: true, statusId: true },
    });
    return repair && canAccessRepairChat(user, repair) ? repair : null;
}

export async function listRepairChats(user: RepairChatUser, scope: "active" | "archived", cursorValue?: string) {
    const cursor = decodeRepairChatCursor(cursorValue);
    const statusIds = scope === "active" ? ACTIVE_REPAIR_CHAT_STATUS_IDS : FINAL_REPAIR_CHAT_STATUS_IDS;
    const cursorWhere: Prisma.RepairChatWhereInput = cursor ? {
        OR: [
            { lastMessageAt: { lt: new Date(cursor.at) } },
            { lastMessageAt: new Date(cursor.at), id: { lt: cursor.id } },
        ],
    } : {};
    const chats = await db.repairChat.findMany({
        where: {
            ...cursorWhere,
            repair: { ...buildAccessibleRepairWhere(user), statusId: { in: [...statusIds] } },
        },
        orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
        take: REPAIR_CHAT_PAGE_SIZE + 1,
        select: {
            id: true,
            lastMessageAt: true,
            repair: {
                select: {
                    id: true, ticketNumber: true, deviceBrand: true, deviceModel: true, statusId: true,
                    status: { select: { name: true, color: true } },
                    branch: { select: { id: true, name: true } },
                    assignedTo: { select: { id: true, name: true } },
                },
            },
            messages: {
                orderBy: { createdAt: "desc" }, take: 1,
                select: { id: true, content: true, imageUrls: true, createdAt: true, sender: { select: { id: true, name: true } } },
            },
            readCursors: { where: { userId: user.id }, select: { lastReadAt: true } },
        },
    });
    const hasMore = chats.length > REPAIR_CHAT_PAGE_SIZE;
    const page = chats.slice(0, REPAIR_CHAT_PAGE_SIZE);
    const last = page.at(-1);
    return {
        items: page.map((chat) => ({
            ...chat,
            unread: chat.messages[0] ? (!chat.readCursors[0] || chat.readCursors[0].lastReadAt < chat.messages[0].createdAt) : false,
            readCursors: undefined,
        })),
        nextCursor: hasMore && last ? encodeRepairChatCursor({ id: last.id, at: last.lastMessageAt.toISOString() }) : null,
    };
}

export async function searchRepairChats(user: RepairChatUser, query: string) {
    const words = query.trim().split(/\s+/).filter(Boolean);
    return db.repair.findMany({
        where: {
            ...buildAccessibleRepairWhere(user),
            statusId: { in: [...ACTIVE_REPAIR_CHAT_STATUS_IDS] },
            AND: words.map((word) => ({
                OR: [
                    { ticketNumber: { contains: word, mode: "insensitive" } },
                    { deviceBrand: { contains: word, mode: "insensitive" } },
                    { deviceModel: { contains: word, mode: "insensitive" } },
                    { customer: { name: { contains: word, mode: "insensitive" } } },
                ],
            })),
        },
        take: REPAIR_CHAT_SEARCH_LIMIT,
        orderBy: { updatedAt: "desc" },
        select: {
            id: true, ticketNumber: true, deviceBrand: true, deviceModel: true, statusId: true,
            status: { select: { name: true, color: true } },
            assignedTo: { select: { id: true, name: true } },
            chat: { select: { id: true } },
        },
    });
}

export async function listRepairChatMessages(user: RepairChatUser, repairId: string, before?: string) {
    const repair = await getAuthorizedRepair(user, repairId);
    if (!repair) return null;
    const chat = await db.repairChat.findUnique({ where: { repairId }, select: { id: true } });
    if (!chat) return { items: [], nextCursor: null, readOnly: isRepairChatReadOnly(repair.statusId) };
    const messages = await db.repairChatMessage.findMany({
        where: { chatId: chat.id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: REPAIR_CHAT_MESSAGE_PAGE_SIZE + 1,
        select: {
            id: true, content: true, imageUrls: true, createdAt: true, senderId: true,
            sender: { select: { id: true, name: true, role: true } },
            replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
        },
    });
    const page = messages.slice(0, REPAIR_CHAT_MESSAGE_PAGE_SIZE);
    return {
        items: page.reverse(),
        nextCursor: messages.length > REPAIR_CHAT_MESSAGE_PAGE_SIZE ? page.at(-1)?.createdAt.toISOString() ?? null : null,
        readOnly: isRepairChatReadOnly(repair.statusId),
    };
}

export async function sendRepairChatMessage(
    user: RepairChatUser,
    repairId: string,
    input: { clientRequestId: string; content?: string; imageUrls: string[]; replyToId?: string },
) {
    const repair = await getAuthorizedRepair(user, repairId);
    if (!repair || isRepairChatReadOnly(repair.statusId)) return null;
    return db.$transaction(async (tx) => {
        const existing = await tx.repairChatMessage.findUnique({
            where: { senderId_clientRequestId: { senderId: user.id, clientRequestId: input.clientRequestId } },
            select: { id: true, createdAt: true },
        });
        if (existing) return existing;
        const chat = await tx.repairChat.upsert({
            where: { repairId }, create: { repairId }, update: {}, select: { id: true },
        });
        if (input.replyToId) {
            const reply = await tx.repairChatMessage.findFirst({ where: { id: input.replyToId, chatId: chat.id }, select: { id: true } });
            if (!reply) throw new Error("El mensaje respondido no pertenece a esta reparación");
        }
        const message = await tx.repairChatMessage.create({
            data: { chatId: chat.id, senderId: user.id, ...input },
            select: { id: true, createdAt: true },
        });
        await tx.repairChat.update({ where: { id: chat.id }, data: { lastMessageAt: message.createdAt } });
        return message;
    });
}

export async function markRepairChatRead(user: RepairChatUser, repairId: string, readAt: Date) {
    const repair = await getAuthorizedRepair(user, repairId);
    if (!repair) return null;
    const chat = await db.repairChat.findUnique({ where: { repairId }, select: { id: true } });
    if (!chat) return { readAt };
    return db.repairChatReadCursor.upsert({
        where: { chatId_userId: { chatId: chat.id, userId: user.id } },
        create: { chatId: chat.id, userId: user.id, lastReadAt: readAt },
        update: { lastReadAt: readAt },
        select: { lastReadAt: true },
    });
}

export async function listRepairChatReaders(user: RepairChatUser, repairId: string, messageId: string) {
    const repair = await getAuthorizedRepair(user, repairId);
    if (!repair) return null;
    const message = await db.repairChatMessage.findFirst({
        where: { id: messageId, chat: { repairId } }, select: { createdAt: true, senderId: true, chatId: true },
    });
    if (!message) return [];
    return db.repairChatReadCursor.findMany({
        where: { chatId: message.chatId, userId: { not: message.senderId }, lastReadAt: { gte: message.createdAt } },
        orderBy: { lastReadAt: "asc" },
        select: { lastReadAt: true, user: { select: { id: true, name: true } } },
    });
}

export type { RepairChatCursor };
