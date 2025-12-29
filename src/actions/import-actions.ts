"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ImportResult = {
    success: boolean;
    count?: number;
    error?: string;
};

export async function importHistoricalSalesAction(data: any[]): Promise<ImportResult> {
    try {
        if (!data || data.length === 0) return { success: false, error: "No hay datos para importar" };

        const branches = await db.branch.findMany();
        const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
        if (!admin) return { success: false, error: "No se encontró un usuario administrador para asociar las ventas" };

        let importedCount = 0;

        await db.$transaction(async (tx) => {
            for (const row of data) {
                // Expecting columns: fecha (string YYYY-MM-DD), sucursal (string), monto (number), cantidad (number)
                const { fecha, sucursal, monto, cantidad } = row;

                if (!fecha || !sucursal || !monto) continue;

                const branch = branches.find(b => b.name.toLowerCase() === sucursal.toLowerCase());
                if (!branch) continue;

                const date = new Date(fecha);
                const startTime = new Date(date.setHours(8, 0, 0, 0));
                const endTime = new Date(date.setHours(21, 0, 0, 0));

                // 1. AVOID DUPLICATES: Delete existing historical shifts for this branch and day
                // We identify historical shifts by a specific start/end time or by searching for sales with 'H-' prefix
                const existingShifts = await tx.cashShift.findMany({
                    where: {
                        branchId: branch.id,
                        startTime: startTime,
                        status: "CLOSED",
                    }
                });

                for (const oldShift of existingShifts) {
                    // Delete associated sales first (Cascade might handle it but let's be safe)
                    await tx.sale.deleteMany({ where: { createdAt: startTime, branchId: branch.id } });
                    await tx.cashShift.delete({ where: { id: oldShift.id } });
                }

                // 2. Create the new Symbolic Shift
                const shift = await tx.cashShift.create({
                    data: {
                        branchId: branch.id,
                        userId: admin.id,
                        startTime: startTime,
                        endTime: endTime,
                        status: "CLOSED",
                        startAmount: 0,
                    }
                });

                const qty = parseInt(cantidad) || 1;
                const totalAmount = parseFloat(monto);
                const amountPerSale = totalAmount / qty;

                for (let i = 0; i < qty; i++) {
                    await tx.sale.create({
                        data: {
                            saleNumber: `H${shift.id.slice(-4).toUpperCase()}-${i + 1}-${Math.floor(Math.random() * 10000)}`,
                            total: amountPerSale,
                            paymentMethod: "CASH",
                            branchId: branch.id,
                            vendorId: admin.id,
                            createdAt: startTime,
                            updatedAt: endTime,
                        }
                    });
                }
                importedCount++;
            }
        });

        revalidatePath("/admin/cash-shifts");
        revalidatePath("/admin/dashboard");
        return { success: true, count: importedCount };
    } catch (error: any) {
        console.error("Import Error:", error);
        return { success: false, error: error.message || "Error desconocido durante la importación" };
    }
}

export async function clearAllHistoricalDataAction(): Promise<ImportResult> {
    try {
        await db.$transaction(async (tx) => {
            // Delete all sales starting with H (Historical)
            await tx.sale.deleteMany({
                where: {
                    saleNumber: { startsWith: "H" }
                }
            });
            // Delete all closed shifts that have 0 startAmount (our symbolic shifts)
            await tx.cashShift.deleteMany({
                where: {
                    status: "CLOSED",
                    startAmount: 0,
                    // Optionally filter by the admin user ID if needed
                }
            });
        });

        revalidatePath("/admin/cash-shifts");
        revalidatePath("/admin/dashboard");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
