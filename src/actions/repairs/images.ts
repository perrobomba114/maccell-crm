"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { saveRepairImages } from "@/lib/actions/upload";
import { isValidImg } from "@/lib/utils";

export async function addRepairImagesAction(formData: FormData) {
    const repairId = formData.get("repairId") as string;

    if (!repairId) return { success: false, error: "ID de reparación requerido" };

    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true, ticketNumber: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const currentImages = repair.deviceImages || [];
        const files = formData.getAll("images");

        if (currentImages.length + files.length > 3) {
            return { success: false, error: `Máximo 3 imágenes permitidas. Ya tienes ${currentImages.length} cargadas.` };
        }

        const newImages = await saveRepairImages(formData, repair.ticketNumber);

        await db.repair.update({
            where: { id: repairId },
            data: {
                deviceImages: [...currentImages, ...newImages].filter(isValidImg)
            }
        });

        revalidatePath("/vendor/repairs/active");
        revalidatePath("/admin/repairs");

        return { success: true };

    } catch (error) {
        console.error("Error adding images:", error);
        return { success: false, error: "Error al subir imágenes" };
    }
}

export async function removeRepairImageAction(repairId: string, imageUrl: string) {
    try {
        if (!repairId || !imageUrl) return { success: false, error: "Datos incompletos" };

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const currentImages = repair.deviceImages || [];
        const updatedImages = currentImages.filter(img => img !== imageUrl);

        if (currentImages.length === updatedImages.length) {
            return { success: false, error: "La imagen no existe en esta reparación" };
        }

        await db.repair.update({
            where: { id: repairId },
            data: {
                deviceImages: updatedImages
            }
        });

        revalidatePath("/technician/repairs");
        revalidatePath(`/admin/repairs`);
        return { success: true };

    } catch (error) {
        console.error("Error removing image:", error);
        return { success: false, error: "Error de servidor al eliminar imagen" };
    }
}
