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

export async function updateSalePaymentMethod(saleId: string, newMethod: "CASH" | "CARD" | "MERCADOPAGO") {
    const user = await getCurrentUser();

    // Allow Admin or the specific Vendor who made the sale (if needed, but user said Admin role context)
    // For safety, let's allow Admin and Vendor.
    if (!user || !user.branch) {
        return { success: false, error: "No autorizado" };
    }

    try {
        const sale = await db.sale.findUnique({
            where: { id: saleId },
        });

        if (!sale) {
            return { success: false, error: "Venta no encontrada" };
        }

        // Optional: Check if user has right to edit
        if (user.role !== "ADMIN" && sale.vendorId !== user.id) {
            return { success: false, error: "No tienes permiso para editar esta venta" };
        }

        // Logic to preserve original method if it's the first edit
        const dataToUpdate: any = {
            paymentMethod: newMethod,
            wasPaymentModified: true,
        };

        if ((sale as any).originalPaymentMethod === null) {
            dataToUpdate.originalPaymentMethod = sale.paymentMethod;
        } else {
            // If already modified, we don't overwrite the *original* original.
        }

        await db.sale.update({
            where: { id: saleId },
            data: dataToUpdate,
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating payment method:", error);
        return { success: false, error: "Error al actualizar la venta" };
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
            take: 100, // Reasonable limit
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
                    // Revert to "Ready for Pickup" / "Reparado" (ID 6)
                    // If it was ID 10 (Delivered/Paid), we assume it goes back to 6.
                    await tx.repair.update({
                        where: { id: item.repairId },
                        data: {
                            statusId: 6,
                            // Clear finishedAt/deliveredAt if we were tracking them? 
                            // Usually "finishedAt" is when tech finishes, "deliveredAt" (if exists) is when customer picks up.
                            // Repair model has finishedAt. It likely stays finished. Just status changes.
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
