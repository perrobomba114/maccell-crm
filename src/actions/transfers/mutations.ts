"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function createStockTransfer(data: {
    productId: string;
    sourceBranchId: string;
    targetBranchId: string;
    quantity: number;
    notes?: string;
    userId: string;
}) {
    const { productId, sourceBranchId, targetBranchId, quantity, notes, userId } = data;

    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };

    if (quantity <= 0) return { success: false, error: "La cantidad debe ser mayor a 0." };

    try {
        const sourceStock = await db.productStock.findUnique({
            where: {
                productId_branchId: {
                    productId,
                    branchId: sourceBranchId
                }
            },
            include: { product: true }
        });

        if (!sourceStock) {
            return { success: false, error: "Stock insuficiente en la sucursal de origen." };
        }

        await db.$transaction(async (tx) => {
            const stockUpdate = await tx.productStock.updateMany({
                where: {
                    id: sourceStock.id,
                    quantity: { gte: quantity }
                },
                data: { quantity: { decrement: quantity } }
            });

            if (stockUpdate.count !== 1) {
                throw new Error("Stock insuficiente en la sucursal de origen.");
            }

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

            const targetUsers = await tx.user.findMany({
                where: { branchId: targetBranchId }
            });

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

export async function respondToTransfer(transferId: string, action: "ACCEPT" | "REJECT", userId: string) {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    // Kept for existing callers; auth uses the current session.
    void userId;

    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id: transferId },
            include: { product: true } 
        });

        if (!transfer) return { success: false, error: "Transferencia no encontrada." };

        await db.$transaction(async (tx) => {
            const statusUpdate = await tx.stockTransfer.updateMany({
                where: {
                    id: transferId,
                    status: "PENDING"
                },
                data: {
                    status: action === "ACCEPT" ? "COMPLETED" : "CANCELLED"
                }
            });

            if (statusUpdate.count !== 1) {
                throw new Error("La transferencia ya fue procesada.");
            }

            if (action === "ACCEPT") {
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

            } else {
                await tx.productStock.update({
                    where: {
                        productId_branchId: {
                            productId: transfer.productId,
                            branchId: transfer.sourceBranchId
                        }
                    },
                    data: { quantity: { increment: transfer.quantity } }
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
        console.error("Error processing transfer:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al procesar la transferencia." };
    }
}
