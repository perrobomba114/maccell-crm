"use server";

import { CategoryType } from "@prisma/client";
import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function getCategories(type?: CategoryType) {
    try {
        const where = type ? { type } : {};
        const categories = await prisma.category.findMany({
            where,
            orderBy: { name: "asc" },
        });
        return { success: true, categories };
    } catch (error) {
        console.error("Get categories error:", error);
        return { success: false, error: "Error al obtener categorías" };
    }
}

export async function createCategory(data: {
    name: string;
    type: CategoryType;
    description?: string;
}) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };
    try {
        const category = await prisma.category.create({
            data: {
                name: data.name,
                type: data.type,
                description: data.description,
            },
        });

        revalidatePath("/admin/categories");
        return { success: true, category };
    } catch (error) {
        console.error("Create category error:", error);
        return { success: false, error: "Error al crear categoría" };
    }
}

export async function updateCategory(
    id: string,
    data: {
        name?: string;
        description?: string;
    }
) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };
    try {
        const category = await prisma.category.update({
            where: { id },
            data: {
                ...data,
            },
        });

        revalidatePath("/admin/categories");
        return { success: true, category };
    } catch (error) {
        console.error("Update category error:", error);
        return { success: false, error: "Error al actualizar categoría" };
    }
}

export async function deleteCategory(id: string) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };
    try {
        await prisma.$transaction(async (tx) => {
            // Unlink products and spare parts before deleting
            await tx.product.updateMany({
                where: { categoryId: id },
                data: { categoryId: null }
            });
            await tx.sparePart.updateMany({
                where: { categoryId: id },
                data: { categoryId: null }
            });
            await tx.category.delete({ where: { id } });
        });

        revalidatePath("/admin/categories");
        return { success: true };
    } catch (error) {
        console.error("Delete category error:", error);
        return { success: false, error: "Error al eliminar categoría" };
    }
}
