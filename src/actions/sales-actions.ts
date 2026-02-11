"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";

export type SaleWithDetails = {
    id: string;
    saleNumber: string;
    total: number;
    paymentMethod: string;
    createdAt: Date;
    vendor: { name: string };
    items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
    }[];
};

export async function getSales(filters?: {
    startDate?: Date;
    endDate?: Date;
    term?: string;
    paymentMethod?: string;
}) {
    const user = await getCurrentUser();
    if (!user || user.role !== "VENDOR" || !user.branch) {
        return [];
    }

    try {
        const where: any = {
            branchId: user.branch.id,
        };

        if (filters?.startDate && filters?.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }

        if (filters?.term) {
            where.saleNumber = {
                contains: filters.term,
                mode: "insensitive",
            };
        }

        if (filters?.paymentMethod && filters.paymentMethod !== "ALL") {
            // Handle "MIXED" or specific methods if needed, but for now exact match or logic
            if (filters.paymentMethod === "MIXTO") {
                // Logic for mixed? Usually implicit if multiple payments. 
                // For now let's assume strict paymentMethod column check or ignore if complex.
                // The schema seems to store "paymentMethod" string on Sale.
                where.paymentMethod = "MIXTO";
            } else {
                where.paymentMethod = filters.paymentMethod;
            }
        }

        console.log("Fetching sales with where:", JSON.stringify(where, null, 2));

        const sales = await db.sale.findMany({
            where,
            include: {
                vendor: { select: { name: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50, // Pagination later if needed
        });

        console.log(`Found ${sales.length} sales`);

        return sales.map(s => ({
            id: s.id,
            saleNumber: s.saleNumber,
            total: s.total,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
            vendor: s.vendor, // return full vendor if needed? or just details
            items: s.items,
            payments: s.payments
        }));

    } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
    }
}

import { createNotificationAction } from "@/lib/actions/notifications";

export async function updateSalePaymentMethod(saleId: string, newMethod: "CASH" | "CARD" | "MERCADOPAGO") {
    const user = await getCurrentUser();
    const isSystemAction = (user as any)?.isSystem === true;

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
            const dataToUpdate: any = {
                paymentMethod: newMethod,
                wasPaymentModified: true,
            };

            if ((sale as any).originalPaymentMethod === null) {
                dataToUpdate.originalPaymentMethod = sale.paymentMethod;
            }

            // 1. Update Sale Header
            await tx.sale.update({
                where: { id: saleId },
                data: dataToUpdate,
            });

            // 2. Fix Payments Array consistency
            // Delete all existing payments for this sale
            await tx.salePayment.deleteMany({
                where: { saleId: saleId }
            });

            // Create new single payment with the full amount and new method
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

export async function requestPaymentMethodChange(saleId: string, newMethod: "CASH" | "CARD" | "MERCADOPAGO" | "TRANSFER") {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "No autorizado" };

    try {
        const sale = await db.sale.findUnique({
            where: { id: saleId },
            include: { vendor: true }
        });

        if (!sale) return { success: false, error: "Venta no encontrada" };

        // Find Admins
        const admins = await db.user.findMany({
            where: { role: "ADMIN" }
        });

        const methodLabels: any = {
            "CASH": "Efectivo",
            "CARD": "Tarjeta",
            "MERCADOPAGO": "MercadoPago",
            "TRANSFER": "Transferencia"
        };
        const label = methodLabels[newMethod] || newMethod;

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

export async function getAdminSales(filters?: {
    startDate?: Date;
    endDate?: Date;
    term?: string;
    branchId?: string | "ALL";
}) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return [];
    }

    try {
        const where: any = {};

        if (filters?.branchId && filters.branchId !== "ALL") {
            where.branchId = filters.branchId;
        }

        if (filters?.startDate && filters?.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }

        if (filters?.term) {
            where.saleNumber = {
                contains: filters.term,
                mode: "insensitive",
            };
        }

        const sales = await db.sale.findMany({
            where,
            include: {
                vendor: { select: { name: true } },
                branch: { select: { name: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: "desc" },
            take: 2000, // Increased limit to ensure full daily totals
        });

        return sales.map(s => ({
            id: s.id,
            saleNumber: s.saleNumber,
            total: s.total,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
            vendor: s.vendor,
            branch: s.branch,
            items: s.items,
            payments: s.payments
        }));

    } catch (error) {
        console.error("Error fetching admin sales:", error);
        return [];
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
            // Restore stock and revert repairs
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
                    // CRITICAL FIX: Restore spare parts stock
                    // Get all parts used in this repair
                    const repairParts = await tx.repairPart.findMany({
                        where: { repairId: item.repairId },
                        include: { sparePart: true }
                    });

                    // Restore stock for each part
                    for (const part of repairParts) {
                        await tx.sparePart.update({
                            where: { id: part.sparePartId },
                            data: {
                                stockLocal: { increment: part.quantity }
                            }
                        });
                    }

                    // Delete RepairPart entries to avoid confusion
                    await tx.repairPart.deleteMany({
                        where: { repairId: item.repairId }
                    });

                    // Revert to "Finalizado OK" (ID 5)
                    await tx.repair.update({
                        where: { id: item.repairId },
                        data: {
                            statusId: 5,
                        }
                    });

                    // Log the restoration for audit trail
                    await tx.repairObservation.create({
                        data: {
                            repairId: item.repairId,
                            userId: user.id,
                            content: `Venta #${sale.saleNumber} eliminada. Repuestos devueltos al stock: ${repairParts.map(p => `${p.sparePart.name} (${p.quantity})`).join(', ')}`
                        }
                    });
                }
            }

            // Delete the sale
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

export async function getBranchRanking(filters?: {
    startDate?: Date;
    endDate?: Date;
}) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
        return [];
    }

    try {
        const where: any = {};

        if (filters?.startDate && filters?.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }

        // 1. Group by branch and sum totals
        const groupedSales = await db.sale.groupBy({
            by: ['branchId'],
            _sum: {
                total: true,
            },
            where,
        });

        // 2. Fetch branch names
        // We could cache this or assume branches dont change often, but a quick query is fine.
        const branches = await db.branch.findMany({
            where: {
                id: { in: groupedSales.map(g => g.branchId).filter((id): id is string => id !== null) }
            },
            select: { id: true, name: true }
        });

        // 3. Merge data
        const ranking = groupedSales.map(g => {
            const branch = branches.find(b => b.id === g.branchId);
            return {
                branchId: g.branchId,
                branchName: branch ? branch.name : "Desconocida",
                total: g._sum.total || 0
            };
        });

        // 4. Sort by total desc
        return ranking.sort((a, b) => b.total - a.total);

    } catch (error) {
        console.error("Error fetching branch ranking:", error);
        return [];
    }
}
