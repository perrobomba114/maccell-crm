"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createStockTransfer(data: {
    productId: string;
    sourceBranchId: string;
    targetBranchId: string;
    quantity: number;
    notes?: string;
    userId: string;
}) {
    const { productId, sourceBranchId, targetBranchId, quantity, notes, userId } = data;

    if (quantity <= 0) return { success: false, error: "La cantidad debe ser mayor a 0." };

    try {
        // 1. Check Source Status
        const sourceStock = await db.productStock.findUnique({
            where: {
                productId_branchId: {
                    productId,
                    branchId: sourceBranchId
                }
            },
            include: { product: true }
        });

        if (!sourceStock || sourceStock.quantity < quantity) {
            return { success: false, error: "Stock insuficiente en la sucursal de origen." };
        }

        // 2. Transact: Deduct Source & Create Transfer
        await db.$transaction(async (tx) => {
            // Deduct from Source
            await tx.productStock.update({
                where: { id: sourceStock.id },
                data: { quantity: { decrement: quantity } }
            });

            // Create Transfer Record
            const transfer = await tx.stockTransfer.create({
                data: {
                    productId,
                    sourceBranchId,
                    targetBranchId,
                    quantity,
                    notes,
                    status: "PENDING",
                    createdById: userId
                }
            });

            // Create Notification for Target Branch Users
            // Fetch users in target branch
            const targetUsers = await tx.user.findMany({
                where: { branchId: targetBranchId }
            });

            // Create notifs
            if (targetUsers.length > 0) {
                await tx.notification.createMany({
                    data: targetUsers.map(u => ({
                        userId: u.id,
                        title: "Nueva Transferencia de Stock",
                        message: `Recibiendo ${quantity}x ${sourceStock.product.name}. Motivo: ${notes || "Sin motivo"}`,
                        type: "ACTION_REQUEST",
                        actionData: { transferId: transfer.id },
                        isRead: false
                    }))
                });
            }

            // Notify all Admins about this transfer
            const [admins, sourceBranch, targetBranch, transferUser] = await Promise.all([
                tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
                tx.branch.findUnique({ where: { id: sourceBranchId }, select: { name: true } }),
                tx.branch.findUnique({ where: { id: targetBranchId }, select: { name: true } }),
                tx.user.findUnique({ where: { id: userId }, select: { name: true } }),
            ]);

            if (admins.length > 0) {
                const vendorName = transferUser?.name || "Un vendedor";
                const fromBranch = sourceBranch?.name || "sucursal origen";
                const toBranch = targetBranch?.name || "sucursal destino";

                await tx.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        title: "Transferencia de Stock Realizada",
                        message: `${vendorName} transfirió ${quantity}x ${sourceStock.product.name} de ${fromBranch} a ${toBranch}. Motivo: ${notes || "Sin motivo"}`,
                        type: "INFO",
                        link: "/admin/transfers",
                        isRead: false
                    }))
                });
            }
        });

        try {
            revalidatePath("/vendor/pos");
        } catch (error) {
            console.error("Revalidation failed (non-critical):", error);
        }
        return { success: true };

    } catch (error) {
        console.error("Error creating transfer:", error);
        return { success: false, error: `Error al crear la transferencia: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function getPendingTransfers(branchId: string) {
    try {
        const transfers = await db.stockTransfer.findMany({
            where: {
                targetBranchId: branchId,
                status: "PENDING"
            },
            include: {
                product: true,
                sourceBranch: {
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
        console.error("Error fetching transfers:", error);
        return { success: false, error: "Error al obtener transferencias." };
    }
}

export async function respondToTransfer(transferId: string, action: "ACCEPT" | "REJECT", userId: string) {
    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id: transferId },
            include: { product: true } // Need product info?
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };
        if (transfer.status !== "PENDING") return { success: false, error: "La transferencia ya fue procesada." };

        await db.$transaction(async (tx) => {
            if (action === "ACCEPT") {
                // Add to Target Branch
                // Check if stock record exists
                const existingStock = await tx.productStock.findUnique({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.targetBranchId
                        }
                    }
                });

                if (existingStock) {
                    await tx.productStock.update({
                        where: { id: existingStock.id },
                        data: { quantity: { increment: transfer.quantity } }
                    });
                } else {
                    await tx.productStock.create({
                        data: {
                            productId: transfer.productId,
                            branchId: transfer.targetBranchId,
                            quantity: transfer.quantity
                        }
                    });
                }

                // Update Status
                await tx.stockTransfer.update({
                    where: { id: transferId },
                    data: { status: "COMPLETED" }
                });

            } else {
                // REJECT -> Refund Source
                await tx.productStock.update({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.sourceBranchId
                        }
                    },
                    data: { quantity: { increment: transfer.quantity } }
                });

                // Update Status
                await tx.stockTransfer.update({
                    where: { id: transferId },
                    data: { status: "CANCELLED" }
                });
            }

            // Mark related notifications as DONE or similar? 
            // Optional: Notify Sender of the outcome.
            // For now, simple logic.
        });

        try {
            revalidatePath("/vendor/pos");
        } catch (error) {
            console.error("Revalidation failed (non-critical):", error);
        }
        return { success: true };

    } catch (error) {
        console.error("Error processing transfer:", error);
        return { success: false, error: "Error al procesar la transferencia." };
    }
}

// ADMIN ACTIONS

export async function getAllTransfersAdmin() {
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

    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id },
            include: { product: true }
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };

        // If trying to change status from Pending to Final, execute logic
        if (status && status !== transfer.status) {
            if (transfer.status !== "PENDING") {
                return { success: false, error: "Solo se puede cambiar el estado de transferencias PENDIENTES." };
            }

            // Reuse logic? Or implement here.
            // Let's implement robustly.
            await db.$transaction(async (tx) => {
                if (status === "COMPLETED") {
                    // Add to Target
                    const existingStock = await tx.productStock.findUnique({
                        where: {
                            productId_branchId: {
                                productId: transfer.productId,
                                branchId: transfer.targetBranchId
                            }
                        }
                    });

                    // Use the *current* transfer quantity (which might have been updated just now if we allowed it, 
                    // but better to separate edit qty vs resolve. Check if quantity is passed?)
                    // If quantity is passed, update it first? 
                    // Let's assume quantity update is only for PENDING state and we use the recorded qty.
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
                    // Refund Source
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

                // Update Transfer Record
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

        // Just editing details (only if pending)
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
            // If already final, usually can't edit qty. Maybe notes?
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
    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id },
            include: { product: true }
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };

        await db.$transaction(async (tx) => {
            // Revert Logic
            if (transfer.status === "PENDING") {
                // Stock is missing from Source (was deducted on create). Refund Source.
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
                // Stock is at Target. Move back to Source.
                // 1. Check Target Stock
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

                // 2. Deduct Target
                await tx.productStock.update({
                    where: { id: targetStock.id },
                    data: { quantity: { decrement: transfer.quantity } }
                });

                // 3. Refund Source
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
            // If CANCELLED, stock is already correct (at Source), so just delete record.

            // Delete Record
            await tx.stockTransfer.delete({
                where: { id }
            });

            // Cleanup Notifications? (Optional, cascade might handle or leave them as history orphan)
            // Using deleteMany just in case schema doesn't cascade notifications on transfer delete or if actionData stored ID string
        });

        revalidatePath("/admin/transfers");
        return { success: true };

    } catch (error) {
        console.error("Error deleting transfer:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al eliminar transferencia." };
    }
}
