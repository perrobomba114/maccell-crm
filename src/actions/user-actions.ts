"use server";

import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";

export async function getAllUsers() {
    try {
        const users = await prisma.user.findMany({
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, users };
    } catch (error) {
        console.error("Get users error:", error);
        return { success: false, error: "Error al obtener usuarios" };
    }
}

export async function getVendors() {
    try {
        const vendors = await prisma.user.findMany({
            where: { role: "VENDOR" },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        return { success: true, vendors };
    } catch (error) {
        console.error("Get vendors error:", error);
        return { success: false, error: "Error al obtener vendedores" };
    }
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    branchId?: string | null;
}) {
    try {
        // Validate that vendors must have a branch
        if (data.role === "VENDOR" && !data.branchId) {
            return { success: false, error: "Los vendedores deben tener una sucursal asignada" };
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return { success: false, error: "El email ya está registrado" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                branchId: data.branchId ?? null,
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        revalidatePath("/admin/users");
        return { success: true, user };
    } catch (error) {
        console.error("Create user error:", error);
        return { success: false, error: "Error al crear usuario" };
    }
}

export async function updateUser(
    id: string,
    data: {
        name?: string;
        email?: string;
        password?: string;
        role?: Role;
        branchId?: string | null;
    }
) {
    try {
        // Get current user data
        const currentUser = await prisma.user.findUnique({
            where: { id },
        });

        if (!currentUser) {
            return { success: false, error: "Usuario no encontrado" };
        }

        // Validate that vendors must have a branch
        const newRole = data.role || currentUser.role;
        // Use hasOwnProperty to differentiate between undefined (no change) and null (explicitly removing)
        const newBranchId = Object.prototype.hasOwnProperty.call(data, 'branchId')
            ? data.branchId
            : currentUser.branchId;

        if (newRole === "VENDOR" && !newBranchId) {
            return { success: false, error: "Los vendedores deben tener una sucursal asignada" };
        }

        // If email is being updated, check if it's already in use by another user
        if (data.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email },
            });

            if (existingUser && existingUser.id !== id) {
                return { success: false, error: "El email ya está registrado" };
            }
        }

        // Prepare update data
        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.role !== undefined) updateData.role = data.role;

        // Handle branchId explicitly to allow null
        if (Object.prototype.hasOwnProperty.call(data, 'branchId')) {
            updateData.branchId = data.branchId;
        }

        // Hash password if provided
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        // Update user
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        revalidatePath("/admin/users");
        return { success: true, user };
    } catch (error) {
        console.error("Update user error:", error);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        return { success: false, error: error instanceof Error ? error.message : "Error al actualizar usuario" };
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({
            where: { id },
        });

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Delete user error:", error);
        return { success: false, error: "Error al eliminar usuario" };
    }
}
