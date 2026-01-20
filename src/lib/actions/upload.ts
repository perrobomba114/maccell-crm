"use server";

import fs from "fs/promises";
import path from "path";

export async function saveRepairImages(formData: FormData, ticketNumber: string, startIndex: number = 0): Promise<string[]> {
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

        // Renaming format: TICK-123_img1.jpg (using startIndex)
        const filename = `${ticketNumber}_img${startIndex + i + 1}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, buffer);
        savedPaths.push(`/repairs/images/${filename}`);
    }

    return savedPaths;
}
