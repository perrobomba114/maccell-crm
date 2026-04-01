"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { getCurrentUser } from "@/actions/auth-actions";

export async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
    try {
        const caller = await getCurrentUser();
        // Only the user themselves or an admin can change a password
        if (!caller || (caller.id !== userId && caller.role !== "ADMIN")) {
            return { success: false, error: "No autorizado" };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, error: "Usuario no encontrado" };
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);

        if (!passwordMatch) {
            return { success: false, error: "La contraseña actual es incorrecta" };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Update password error:", error);
        return { success: false, error: "Error al actualizar la contraseña" };
    }
}

export async function updateUserImage(userId: string, imageUrl: string) {
    try {
        const caller = await getCurrentUser();
        // Only the user themselves or an admin can change a profile image
        if (!caller || (caller.id !== userId && caller.role !== "ADMIN")) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                imageUrl: imageUrl,
            },
        });

        revalidatePath("/admin/profile");
        revalidatePath("/vendor/profile");
        revalidatePath("/technician/profile");

        return { success: true };
    } catch (error) {
        console.error("Update image error:", error);
        return { success: false, error: "Error al actualizar la imagen de perfil" };
    }
}
