"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";

export async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
    try {
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

        // revalidatePath needed? Not strictly since it's auth/profile state.

        return { success: true };
    } catch (error) {
        console.error("Update password error:", error);
        return { success: false, error: "Error al actualizar la contraseña" };
    }
}

export async function updateUserImage(userId: string, imageUrl: string) {
    try {
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
