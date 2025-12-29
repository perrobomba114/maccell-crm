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
                // Create a "Symbolic Shift" for this day/month record
                // To avoid multiple shifts for the same exact time if user uploads daily data
                const shift = await tx.cashShift.create({
                    data: {
                        branchId: branch.id,
                        userId: admin.id,
                        startTime: new Date(date.setHours(8, 0, 0, 0)),
                        endTime: new Date(date.setHours(21, 0, 0, 0)),
                        status: "CLOSED",
                        startAmount: 0,
                    }
                });

                // Create a single summarized Sale record for this shift
                // or multiple based on 'cantidad'
                const qty = parseInt(cantidad) || 1;
                const totalAmount = parseFloat(monto);
                const amountPerSale = totalAmount / qty;

                // Create multiple sales based on 'cantidad' to ensure KPIs (Avg Ticket, Sales Count) are correct
                for (let i = 0; i < qty; i++) {
                    await tx.sale.create({
                        data: {
                            saleNumber: `H${shift.id.slice(-4).toUpperCase()}-${i + 1}-${Math.floor(Math.random() * 10000)}`,
                            total: amountPerSale,
                            paymentMethod: "CASH",
                            branchId: branch.id,
                            vendorId: admin.id,
                            createdAt: shift.startTime,
                            updatedAt: shift.endTime!,
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
