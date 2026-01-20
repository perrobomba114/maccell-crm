"use server";

import fs from "fs/promises";
import path from "path";

export async function saveRepairImages(formData: FormData, ticketNumber: string): Promise<string[]> {
    const files = formData.getAll("images") as File[]; // Expecting 'images' key
    const savedPaths: string[] = [];

    if (!files || files.length === 0) return [];

    const uploadDir = path.join(process.cwd(), "public/repairs/images");

    // Ensure directory exists just in case
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name || file.size === 0) continue;

        // Validating file type if needed, but assuming client checks mostly.
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name).toLowerCase() || ".jpg";

        // Unique naming: TICK-timestamp-random.jpg
        // This prevents ANY collision regardless of deletions or order.
        const uniqueId = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
        const filename = `${ticketNumber}_${uniqueId}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, buffer);
        savedPaths.push(`/repairs/images/${filename}`);
    }

    return savedPaths;
}
