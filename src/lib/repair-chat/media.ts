import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { convertRepairImageForStorage } from "@/lib/repair-image-conversion";
import { db } from "@/lib/db";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SAFE_IMAGE_NAME = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i;

export function isSafeRepairChatImageName(fileName: string): boolean {
    return SAFE_IMAGE_NAME.test(fileName);
}

export function repairChatImageDirectory(repairId: string): string {
    return path.join(process.cwd(), "upload", "repair-chat", repairId.replace(/[^a-zA-Z0-9_-]/g, "_"));
}

export function repairChatImagePath(repairId: string, fileName: string): string | null {
    if (!isSafeRepairChatImageName(fileName)) return null;
    return path.join(repairChatImageDirectory(repairId), fileName);
}

export async function saveRepairChatImage(repairId: string, file: File): Promise<string> {
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera el límite de 8 MB");
    const converted = await convertRepairImageForStorage({
        buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name, contentType: file.type,
    });
    const directory = repairChatImageDirectory(repairId);
    await fs.mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${converted.extension}`;
    await fs.writeFile(path.join(directory, fileName), converted.buffer);
    return `/api/repair-chats/${encodeURIComponent(repairId)}/images/${fileName}`;
}

export async function deleteRepairChatImages(repairId: string, imageUrls: string[]): Promise<void> {
    await Promise.all(imageUrls.map(async (imageUrl) => {
        const fileName = imageUrl.split("/").at(-1) ?? "";
        const filePath = repairChatImagePath(repairId, fileName);
        if (filePath) await fs.rm(filePath, { force: true });
    }));
}

export async function cleanupUnreferencedRepairChatImages(repairId: string, imageUrls: string[]): Promise<void> {
    if (imageUrls.length === 0) return;
    const referencedMessages = await db.repairChatMessage.findMany({
        where: { chat: { repairId }, imageUrls: { hasSome: imageUrls } },
        select: { imageUrls: true },
    });
    const referenced = new Set(referencedMessages.flatMap((message) => message.imageUrls));
    await deleteRepairChatImages(repairId, imageUrls.filter((imageUrl) => !referenced.has(imageUrl)));
}
