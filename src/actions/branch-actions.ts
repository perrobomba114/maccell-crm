"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAllBranches() {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                code: true,
                address: true,
                phone: true,
                imageUrl: true,
                ticketPrefix: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return { success: true, branches };
    } catch (error) {
        console.error("Get branches error:", error);
        return { success: false, error: "Error al obtener sucursales" };
    }
}

export async function createBranch(data: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    imageUrl?: string;
}) {
    try {
        // Check if code already exists
        const existingBranch = await prisma.branch.findUnique({
            where: { code: data.code },
        });

        if (existingBranch) {
            return { success: false, error: "El código de sucursal ya existe" };
        }

        const branch = await prisma.branch.create({
            data: {
                name: data.name,
                code: data.code,
                address: data.address,
                phone: data.phone,
                imageUrl: data.imageUrl,
            },
        });

        revalidatePath('/admin/branches');
        return { success: true, branch };
    } catch (error) {
        console.error("Create branch error:", error);
        return { success: false, error: "Error al crear sucursal" };
    }
}

export async function updateBranch(
    id: string,
    data: {
        name?: string;
        code?: string;
        address?: string;
        phone?: string;
        imageUrl?: string;
    }
) {
    try {
        // If code is being updated, check if it's already in use by another branch
        if (data.code) {
            const existingBranch = await prisma.branch.findUnique({
                where: { code: data.code },
            });

            if (existingBranch && existingBranch.id !== id) {
                return { success: false, error: "El código de sucursal ya existe" };
            }
        }

        const branch = await prisma.branch.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.code && { code: data.code }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
            },
        });

        revalidatePath('/admin/branches');
        return { success: true, branch };
    } catch (error) {
        console.error("Update branch error:", error);
        return { success: false, error: "Error al actualizar sucursal" };
    }
}

export async function deleteBranch(id: string) {
    try {
        await prisma.branch.delete({
            where: { id },
        });

        revalidatePath('/admin/branches');
        return { success: true };
    } catch (error) {
        console.error("Delete branch error:", error);
        return { success: false, error: "Error al eliminar sucursal. Verifica que no tenga usuarios asociados." };
    }
}
