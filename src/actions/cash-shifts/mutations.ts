"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateCashShiftDate(shiftId: string, newDate: Date) {
    try {
        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId }
        });

        if (!shift) throw new Error("Cierre de caja no encontrado");

        // Calculate new start time preserving original time
        const newStartTime = new Date(newDate);
        newStartTime.setHours(shift.startTime.getHours(), shift.startTime.getMinutes(), shift.startTime.getSeconds());

        // Calculate new end time if exists
        let newEndTime = null;
        if (shift.endTime) {
            newEndTime = new Date(newDate);
            newEndTime.setHours(shift.endTime.getHours(), shift.endTime.getMinutes(), shift.endTime.getSeconds());
        }

        const timeDiff = newStartTime.getTime() - shift.startTime.getTime();

        await prisma.$transaction(async (tx) => {
            // 1. Move related Sales
            const shiftUpperBound = shift.endTime || new Date();
            const sales = await tx.sale.findMany({
                where: {
                    branchId: shift.branchId,
                    vendorId: shift.userId,
                    createdAt: { gte: shift.startTime, lte: shiftUpperBound }
                }
            });

            for (const sale of sales) {
                const newSaleTime = new Date(sale.createdAt.getTime() + timeDiff);
                const newUpdateTime = new Date(sale.updatedAt.getTime() + timeDiff); // Maintain consistency
                await tx.sale.update({
                    where: { id: sale.id },
                    data: { createdAt: newSaleTime, updatedAt: newUpdateTime }
                });
            }

            // 2. Move related Expenses
            if ((tx as any).expense) {
                const expenses = await (tx as any).expense.findMany({
                    where: {
                        branchId: shift.branchId,
                        userId: shift.userId,
                        createdAt: { gte: shift.startTime, lte: shiftUpperBound }
                    }
                });

                for (const exp of expenses) {
                    const newExpTime = new Date(exp.createdAt.getTime() + timeDiff);
                    await (tx as any).expense.update({
                        where: { id: exp.id },
                        data: { createdAt: newExpTime }
                    });
                }
            }

            // 3. Update Shift
            await tx.cashShift.update({
                where: { id: shiftId },
                data: {
                    startTime: newStartTime,
                    endTime: newEndTime,
                    updatedAt: new Date()
                }
            });
        });

        revalidatePath("/admin/cash-shifts");
        return { success: true };
    } catch (error) {
        console.error("Error updating cash shift date:", error);
        return { success: false, error: "Error al actualizar la fecha" };
    }
}

export async function deleteCashShift(shiftId: string) {
    try {
        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId }
        });

        if (!shift) throw new Error("Cierre de caja no encontrado");

        await prisma.$transaction(async (tx) => {
            // 1. Delete Historical Sales
            if (shift.status === "CLOSED" && shift.endTime) {
                await tx.sale.deleteMany({
                    where: {
                        branchId: shift.branchId,
                        vendorId: shift.userId,
                        createdAt: { gte: shift.startTime, lte: shift.endTime },
                        saleNumber: { startsWith: "H" } // ONLY Historical imports
                    }
                });
            }

            // 2. Delete the Shift
            await tx.cashShift.delete({
                where: { id: shiftId }
            });
        });

        revalidatePath("/admin/cash-shifts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting cash shift:", error);
        return { success: false, error: "Error al eliminar el cierre" };
    }
}
