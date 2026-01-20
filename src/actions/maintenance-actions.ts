"use server";

import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { isValidImg } from "@/lib/utils";

export async function cleanupCorruptedImagesAction() {
    try {
        console.log("Staring Image Cleanup...");
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
                    // Double check manually for specific "undefined" strings just in case
                    console.log(`[Cleanup] Removing invalid syntax: ${imgPath}`);
                    changed = true;
                    imagesRemoved++;
                    continue;
                }

                // 2. Physical File Validation
                // Only check local files (starting with /repairs/images)
                if (imgPath.startsWith("/repairs/images/")) {
                    const fullPath = path.join(process.cwd(), "public", imgPath);
                    try {
                        await fs.access(fullPath);
                        cleanImages.push(imgPath);
                    } catch {
                        console.log(`[Cleanup] Removing missing file: ${imgPath}`);
                        changed = true;
                        imagesRemoved++;
                    }
                } else {
                    // External URLs or others are kept
                    cleanImages.push(imgPath);
                }
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

    } catch (error: any) {
        console.error("Cleanup Error:", error);
        return { success: false, error: error.message || "Error al limpiar imágenes" };
    }
}
