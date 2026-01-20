"use server";

import { db } from "@/lib/db";

export async function cleanupCorruptedImagesAction() {
    try {
        const repairsWithImages = await db.repair.findMany({
            where: {
                deviceImages: {
                    isEmpty: false
                }
            },
            select: {
                id: true,
                deviceImages: true
            }
        });

        console.log(`Analyzing ${repairsWithImages.length} repairs for image cleanup...`);

        let updatedCount = 0;
        const isValidImg = (url: string) => url && url.length > 5 && url.includes('/') && !url.includes('undefined') && !url.includes('null');

        for (const repair of repairsWithImages) {
            const filtered = repair.deviceImages.filter(isValidImg);

            if (filtered.length !== repair.deviceImages.length) {
                await db.repair.update({
                    where: { id: repair.id },
                    data: { deviceImages: filtered }
                });
                updatedCount++;
            }
        }

        return { success: true, message: `Se limpiaron ${updatedCount} reparaciones con imágenes corruptas.` };
    } catch (error) {
        console.error("Cleanup Error:", error);
        return { success: false, error: "Error durante la limpieza de imágenes." };
    }
}
