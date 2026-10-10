"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deleteRepairImageFile, saveRepairImages } from "@/lib/actions/upload";
import { isValidImg } from "@/lib/utils";
import { getCurrentUser } from "@/actions/auth-actions";
import { canManageRepairImages } from "@/lib/repairs/image-permissions";
import { RepairImageValidationError } from "@/lib/repair-image-conversion";

export async function addRepairImagesAction(formData: FormData) {
    let newImages: string[] = [];
    let committed = false;
    const repairId = formData.get("repairId") as string;

    if (!repairId) return { success: false, error: "ID de reparación requerido" };

    try {
        const actor = await getCurrentUser();
        if (!actor) return { success: false, error: "No autorizado" };
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true, ticketNumber: true, branchId: true, assignedUserId: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };
        if (!canManageRepairImages(actor, repair)) return { success: false, error: "No tenés permiso para modificar las fotos de esta reparación" };

        const currentImages = repair.deviceImages || [];
        const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
        if (!files.length) return { success: false, error: "Seleccioná al menos una foto" };

        if (currentImages.length + files.length > 3) {
            return { success: false, error: `Máximo 3 imágenes permitidas. Ya tienes ${currentImages.length} cargadas.` };
        }

        newImages = await saveRepairImages(formData, repair.ticketNumber);

        const updated = await db.repair.updateMany({
            where: { id: repairId, deviceImages: { equals: currentImages }, ...(actor.role === "TECHNICIAN" ? { assignedUserId: actor.id } : actor.role === "VENDOR" ? { branchId: actor.branch?.id } : {}) },
            data: {
                deviceImages: [...currentImages, ...newImages].filter(isValidImg)
            }
        });
        if (updated.count !== 1) throw new RepairImageValidationError("Las fotos o la asignación cambiaron. Actualizá la reparación y reintentá.");
        committed = true;

        revalidatePath("/vendor/repairs/active");
        revalidatePath("/admin/repairs");
        revalidatePath("/technician/repairs");

        return { success: true };

    } catch (error) {
        if (!committed) await Promise.all(newImages.map(deleteRepairImageFile));
        console.error("Error adding images:", error);
        return { success: false, error: error instanceof RepairImageValidationError ? error.message : "Error al guardar las fotos. Reintentá la carga." };
    }
}

export async function removeRepairImageAction(repairId: string, imageUrl: string) {
    try {
        if (!repairId || !imageUrl) return { success: false, error: "Datos incompletos" };
        const actor = await getCurrentUser();
        if (!actor) return { success: false, error: "No autorizado" };

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true, branchId: true, assignedUserId: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };
        if (!canManageRepairImages(actor, repair)) return { success: false, error: "No tenés permiso para modificar las fotos de esta reparación" };

        const currentImages = repair.deviceImages || [];
        const updatedImages = currentImages.filter(img => img !== imageUrl);

        if (currentImages.length === updatedImages.length) {
            return { success: false, error: "La imagen no existe en esta reparación" };
        }

        const updated = await db.repair.updateMany({
            where: { id: repairId, deviceImages: { equals: currentImages }, ...(actor.role === "TECHNICIAN" ? { assignedUserId: actor.id } : actor.role === "VENDOR" ? { branchId: actor.branch?.id } : {}) },
            data: {
                deviceImages: updatedImages
            }
        });
        if (updated.count !== 1) return { success: false, error: "Las fotos o la asignación cambiaron. Actualizá la reparación y reintentá." };

        await deleteRepairImageFile(imageUrl);

        revalidatePath("/technician/repairs");
        revalidatePath(`/admin/repairs`);
        return { success: true };

    } catch (error) {
        console.error("Error removing image:", error);
        return { success: false, error: "Error de servidor al eliminar imagen" };
    }
}
