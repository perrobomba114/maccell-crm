"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function getAllTransfersAdmin() {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };
    try {
        const transfers = await db.stockTransfer.findMany({
            include: {
                product: true,
                sourceBranch: {
                    select: { name: true }
                },
                targetBranch: {
                    select: { name: true }
                },
                createdBy: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, transfers };
    } catch (error) {
        console.error("Error fetching admin transfers:", error);
        return { success: false, error: "Error al cargar transferencias." };
    }
}

export async function updateTransferAdmin(data: {
    id: string;
    quantity?: number;
    notes?: string;
    status?: "PENDING" | "COMPLETED" | "CANCELLED";
    adminId: string;
}) {
    const { id, quantity, notes, status, adminId } = data;

    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };

    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id },
            include: { product: true }
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };

        if (status && status !== transfer.status) {
            if (transfer.status !== "PENDING") {
                return { success: false, error: "Solo se puede cambiar el estado de transferencias PENDIENTES." };
            }

            await db.$transaction(async (tx) => {
                if (status === "COMPLETED") {
                    const existingStock = await tx.productStock.findUnique({
                        where: {
                            productId_branchId: {
                                productId: transfer.productId,
                                branchId: transfer.targetBranchId
                            }
                        }
                    });

                    const finalQty = quantity || transfer.quantity;

                    if (existingStock) {
                        await tx.productStock.update({
                            where: { id: existingStock.id },
                            data: { quantity: { increment: finalQty } }
                        });
                    } else {
                        await tx.productStock.create({
                            data: {
                                productId: transfer.productId,
                                branchId: transfer.targetBranchId,
                                quantity: finalQty
                            }
                        });
                    }
                } else if (status === "CANCELLED") {
                    const finalQty = quantity || transfer.quantity;

                    await tx.productStock.update({
                        where: {
                            productId_branchId: {
                                productId: transfer.productId,
                                branchId: transfer.sourceBranchId
                            }
                        },
                        data: { quantity: { increment: finalQty } }
                    });
                }

                await tx.stockTransfer.update({
                    where: { id },
                    data: {
                        quantity: quantity || undefined,
                        notes: notes || undefined,
                        status: status
                    }
                });
            });

            revalidatePath("/admin/transfers");
            return { success: true };
        }

        if (transfer.status === "PENDING") {
            await db.stockTransfer.update({
                where: { id },
                data: {
                    quantity: quantity || undefined,
                    notes: notes || undefined
                }
            });
            revalidatePath("/admin/transfers");
            return { success: true };
        } else {
            if (quantity && quantity !== transfer.quantity) {
                return { success: false, error: "No se puede editar cantidad de una transferencia finalizada." };
            }
            if (notes) {
                await db.stockTransfer.update({
                    where: { id },
                    data: { notes }
                });
                revalidatePath("/admin/transfers");
                return { success: true };
            }
        }

        return { success: true };

    } catch (error) {
        console.error("Error updating transfer:", error);
        return { success: false, error: "Error al actualizar transferencia." };
    }
}

export async function deleteTransferAdmin(id: string) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return { success: false, error: "No autorizado" };
    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id },
            include: { product: true }
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };

        await db.$transaction(async (tx) => {
            if (transfer.status === "PENDING") {
                await tx.productStock.update({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.sourceBranchId
                        }
                    },
                    data: { quantity: { increment: transfer.quantity } }
                });
            } else if (transfer.status === "COMPLETED") {
                const targetStock = await tx.productStock.findUnique({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.targetBranchId
                        }
                    }
                });

                if (!targetStock || targetStock.quantity < transfer.quantity) {
                    throw new Error("No se puede eliminar: La sucursal de destino ya no tiene stock suficiente para revertir.");
                }

                await tx.productStock.update({
                    where: { id: targetStock.id },
                    data: { quantity: { decrement: transfer.quantity } }
                });

                const sourceStock = await tx.productStock.findUnique({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.sourceBranchId
                        }
                    }
                });

                if (sourceStock) {
                    await tx.productStock.update({
                        where: { id: sourceStock.id },
                        data: { quantity: { increment: transfer.quantity } }
                    });
                } else {
                    await tx.productStock.create({
                        data: {
                            productId: transfer.productId,
                            branchId: transfer.sourceBranchId,
                            quantity: transfer.quantity
                        }
                    });
                }
            }

            await tx.stockTransfer.delete({
                where: { id }
            });

        });

        revalidatePath("/admin/transfers");
        return { success: true };

    } catch (error) {
        console.error("Error deleting transfer:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al eliminar transferencia." };
    }
}
