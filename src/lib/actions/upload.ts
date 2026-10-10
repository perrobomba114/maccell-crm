// Internal storage helpers. Do not mark this module "use server": that would
// expose filesystem writes/deletes as callable actions without repair guards.
import fs from "fs/promises";
import path from "path";
import { convertRepairImageForStorage, RepairImageValidationError } from "@/lib/repair-image-conversion";
import { buildRepairImageUploadUrl, getRepairImageUploadSubpath } from "@/lib/repair-image-storage";

function sanitizeFilenamePart(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveRepairImages(formData: FormData, ticketNumber: string, startIndex: number = 0): Promise<string[]> {
    const files = formData.getAll("images").filter((file): file is File => file instanceof File);
    const savedPaths: string[] = [];

    if (!files || files.length === 0) return [];
    if (files.filter(file => file.size > 0).length > 3) throw new RepairImageValidationError("Podés subir hasta 3 fotos por vez.");

    const uploadDir = path.join(process.cwd(), "upload/repairs/images");

    // Ensure directory exists just in case
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    // Validate the whole batch before writing any evidence.
    const prepared: { filepath: string; url: string; buffer: Buffer }[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name || file.size === 0) continue;

        const converted = await convertRepairImageForStorage({
            buffer: Buffer.from(await file.arrayBuffer()),
            fileName: file.name,
            contentType: file.type,
        });

        // Unique naming: TICK-timestamp-random.jpg
        // This prevents ANY collision regardless of deletions or order.
        const uniqueId = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
        const filename = `${sanitizeFilenamePart(ticketNumber)}_${startIndex + i}_${uniqueId}${converted.extension}`;
        const subpath = getRepairImageUploadSubpath(filename);
        const filepath = path.join(process.cwd(), "upload", subpath);

        prepared.push({ filepath, url: buildRepairImageUploadUrl(filename), buffer: converted.buffer });
    }

    try {
        for (const image of prepared) {
            await fs.writeFile(image.filepath, image.buffer, { flag: "wx" });
            savedPaths.push(image.url);
        }
    } catch (error) {
        await Promise.all(savedPaths.map(deleteRepairImageFile));
        throw error;
    }

    return savedPaths;
}

export async function deleteRepairImageFile(imageUrl: string): Promise<void> {
    const subpath = getRepairImageUploadSubpath(imageUrl);
    if (!subpath) return;

    const targets = [
        path.join(process.cwd(), "upload", subpath),
        path.join(process.cwd(), "public", subpath),
    ];

    await Promise.all(targets.map(async (target) => {
        try {
            await fs.unlink(target);
        } catch (error: unknown) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
            throw error;
        }
    }));
}
