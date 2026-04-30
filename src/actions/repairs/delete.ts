"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function deleteRepairAction(repairId: string) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };

    try {
        await db.repair.delete({
            where: { id: repairId }
        });

        revalidatePath("/admin/repairs");
        return { success: true };
    } catch (error) {
        console.error("Error deleting repair:", error);
        return { success: false, error: "Error al eliminar la reparación" };
    }
}
