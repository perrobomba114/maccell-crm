"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";
import { createNotificationAction } from "@/lib/actions/notifications";
import type { Prisma } from "@prisma/client";
import type { EditablePaymentMethod } from "@/types/sales";

type CurrentUserWithSystem = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
    isSystem?: boolean;
};

const PAYMENT_METHOD_LABELS: Record<EditablePaymentMethod, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    MERCADOPAGO: "MercadoPago"
};

export async function updateSalePaymentMethod(saleId: string, newMethod: EditablePaymentMethod) {
    const user = await getCurrentUser();
    const isSystemAction = (user as CurrentUserWithSystem | null)?.isSystem === true;

    if (!isSystemAction && (!user || !user.branch)) {
        return { success: false, error: "No autorizado" };
    }

    try {
        const sale = await db.sale.findUnique({
            where: { id: saleId },
        });

        if (!sale) {
            return { success: false, error: "Venta no encontrada" };
        }

        if (!isSystemAction && user && (user.role !== "ADMIN" && sale.vendorId !== user.id)) {
            return { success: false, error: "No tienes permiso para editar esta venta" };
        }

        await db.$transaction(async (tx) => {
            const dataToUpdate: Prisma.SaleUpdateInput = {
                paymentMethod: newMethod,
                wasPaymentModified: true,
            };

            if (sale.originalPaymentMethod === null) {
                dataToUpdate.originalPaymentMethod = sale.paymentMethod;
            }

            await tx.sale.update({
                where: { id: saleId },
                data: dataToUpdate,
            });

            await tx.salePayment.deleteMany({
                where: { saleId: saleId }
            });

            await tx.salePayment.create({
                data: {
                    saleId: saleId,
                    amount: sale.total,
                    method: newMethod
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating payment method:", error);
        return { success: false, error: "Error al actualizar la venta" };
    }
}

export async function requestPaymentMethodChange(saleId: string, newMethod: EditablePaymentMethod) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autorizado" };

    try {
        const sale = await db.sale.findUnique({
            where: { id: saleId },
            include: { vendor: true }
        });

        if (!sale) return { success: false, error: "Venta no encontrada" };

        const admins = await db.user.findMany({
            where: { role: "ADMIN" }
        });

        const label = PAYMENT_METHOD_LABELS[newMethod];

        for (const admin of admins) {
            await createNotificationAction({
                userId: admin.id,
                title: "Solicitud Cambio de Pago",
                message: `${user.name} solicita cambiar venta #${sale.saleNumber.split("SALE-").pop()} a ${label}.`,
                type: "ACTION_REQUEST",
                actionData: {
                    type: "CHANGE_PAYMENT",
                    saleId: sale.id,
                    newMethod: newMethod,
                    previousMethod: sale.paymentMethod,
                    requesterName: user.name
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error requesting payment change:", error);
        return { success: false, error: "Error al enviar solicitud" };
    }
}

export async function deleteSale(saleId: string) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }

    try {
        const sale = await db.sale.findUnique({
            where: { id: saleId },
            include: { items: true }
        });

        if (!sale) {
            return { success: false, error: "Venta no encontrada" };
        }

        await db.$transaction(async (tx) => {
            for (const item of sale.items) {
                if (item.productId) {
                    await tx.productStock.upsert({
                        where: {
                            productId_branchId: {
                                productId: item.productId,
                                branchId: sale.branchId
                            }
                        },
                        create: {
                            productId: item.productId,
                            branchId: sale.branchId,
                            quantity: item.quantity
                        },
                        update: {
                            quantity: { increment: item.quantity }
                        }
                    });
                }

                if (item.repairId) {
                    const repairParts = await tx.repairPart.findMany({
                        where: { repairId: item.repairId },
                        include: { sparePart: true }
                    });

                    for (const part of repairParts) {
                        await tx.sparePart.update({
                            where: { id: part.sparePartId },
                            data: {
                                stockLocal: { increment: part.quantity }
                            }
                        });
                    }

                    await tx.repairPart.deleteMany({
                        where: { repairId: item.repairId }
                    });

                    await tx.repair.update({
                        where: { id: item.repairId },
                        data: {
                            statusId: 5,
                        }
                    });

                    await tx.repairObservation.create({
                        data: {
                            repairId: item.repairId,
                            userId: user.id,
                            content: `Venta #${sale.saleNumber} eliminada. Repuestos devueltos al stock: ${repairParts.map(p => `${p.sparePart.name} (${p.quantity})`).join(', ')}`
                        }
                    });
                }
            }

            await tx.sale.delete({
                where: { id: saleId }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting sale:", error);
        return { success: false, error: "Error al eliminar la venta" };
    }
}
