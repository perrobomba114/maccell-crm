"use server";

import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { isValidImg } from "@/lib/utils";
import { getCurrentUser } from "@/actions/auth-actions";
import { getRepairImageUploadSubpathFromUrl } from "@/lib/repair-image-storage";

async function repairImageExists(imageUrl: string) {
    const subpath = getRepairImageUploadSubpathFromUrl(imageUrl);
    if (!subpath) return true;

    const candidates = [
        path.join(process.cwd(), "upload", subpath),
        path.join(process.cwd(), "public", subpath),
    ];

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return true;
        } catch {
            // Keep checking the legacy and unified upload locations.
        }
    }

    return false;
}

export async function cleanupCorruptedImagesAction() {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }
    try {
        const allRepairs = await db.repair.findMany({
            select: { id: true, deviceImages: true }
        });

        let repairsFixed = 0;
        let imagesRemoved = 0;

        for (const repair of allRepairs) {
            if (!repair.deviceImages || repair.deviceImages.length === 0) continue;

            const cleanImages: string[] = [];
            let changed = false;

            for (const imgPath of repair.deviceImages) {
                // 1. Basic Syntax Validation
                // Local check: using isValidImg utility
                if (!isValidImg(imgPath)) {
                    changed = true;
                    imagesRemoved++;
                    continue;
                }

                // 2. Physical File Validation
                const repairImageSubpath = getRepairImageUploadSubpathFromUrl(imgPath);
                if (repairImageSubpath) {
                    if (await repairImageExists(imgPath)) {
                        cleanImages.push(imgPath);
                        continue;
                    }

                    changed = true;
                    imagesRemoved++;
                    continue;
                }

                // External URLs or other static assets are kept.
                cleanImages.push(imgPath);
            }

            if (changed) {
                await db.repair.update({
                    where: { id: repair.id },
                    data: { deviceImages: cleanImages }
                });
                repairsFixed++;
            }
        }

        return {
            success: true,
            message: `Limpieza completada. Se corrigieron ${repairsFixed} reparaciones y se eliminaron ${imagesRemoved} imágenes rotas.`
        };

    } catch (error: unknown) {
        console.error("Cleanup Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al limpiar imágenes" };
    }
}
