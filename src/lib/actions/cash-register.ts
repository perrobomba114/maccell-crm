"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CashShiftResult = {
    id: string;
    status: "OPEN" | "CLOSED";
    startTime: Date;
    startAmount: number;
};

export type ShiftSummary = {
    expectedCash: number;
    totalSales: number;
    startAmount: number;
    difference: number;
    salesCount: number;
    cashSales: number;
    cardSales: number;
    mpSales: number;
    expenses: number;
    calculatedBonus: number;
};

/**
 * Check if the user has an open shift.
 */
export async function getOpenShift(userId: string): Promise<CashShiftResult | null> {
    try {
        const shift = await db.cashShift.findFirst({
            where: {
                userId,
                status: "OPEN"
            },
            orderBy: { startTime: 'desc' }
        });

        if (!shift) return null;

        return {
            id: shift.id,
            status: shift.status as "OPEN" | "CLOSED",
            startTime: shift.startTime,
            startAmount: shift.startAmount
        };
    } catch (error) {
        console.error("Error checking open shift:", error);
        return null;
    }
}

/**
 * Open a new register shift.
 */
export async function openRegister(userId: string, branchId: string, amount: number) {
    // Check if already open
    const existing = await getOpenShift(userId);
    if (existing) {
        return { success: false, error: "Ya tienes una caja abierta." };
    }

    try {
        console.log(`[openRegister] Intentando abrir caja. UserId: ${userId}, BranchId: ${branchId}, Amount: ${amount}`);
        await db.cashShift.create({
            data: {
                userId,
                branchId,
                startAmount: amount,
                status: "OPEN",
                startTime: new Date()
            }
        });

        revalidatePath("/vendor/pos");
        return { success: true };
    } catch (error) {
        console.error("Error opening register:", error);
        return { success: false, error: `Error al abrir la caja: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get summary of relevant sales for closing.
 */
export async function getShiftSummary(shiftId: string): Promise<{ success: boolean, summary?: ShiftSummary, error?: string }> {
    try {
        const shift = await db.cashShift.findUnique({
            where: { id: shiftId }
        });

        if (!shift) return { success: false, error: "Caja no encontrada." };

        // Find sales by this user created AFTER shift start
        const sales = await db.sale.findMany({
            where: {
                vendorId: shift.userId,
                createdAt: {
                    gte: shift.startTime
                }
            }
        });

        // Find expenses
        let expensesTotal = 0;
        if ((db as any).expense) {
            try {
                const expenses = await (db as any).expense.findMany({
                    where: {
                        userId: shift.userId,
                        createdAt: { gte: shift.startTime }
                    }
                });
                expensesTotal = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
            } catch (e) { console.error("Error fetching expenses for summary", e); }
        }

        // Aggregate Sales
        // Aggregate Sales using SalePayment for accurate Split Payment support
        let cashSales = 0;
        let cardSales = 0;
        let mpSales = 0;

        // Fetch payments for these sales
        const saleIds = sales.map(s => s.id);
        const payments = await (db as any).salePayment.findMany({
            where: { saleId: { in: saleIds } }
        });

        console.log(`[ShiftSummary] Shift ${shiftId}: Found ${sales.length} sales and ${payments.length} payments.`);

        payments.forEach((p: any) => {
            if (p.method === "CASH") cashSales += p.amount;
            else if (p.method === "CARD") cardSales += p.amount;
            else if (p.method === "MERCADOPAGO") mpSales += p.amount;
        });

        // Re-calculate total from payments to be precise
        const totalSales = cashSales + cardSales + mpSales;
        console.log(`[ShiftSummary] Totals -> Cash: ${cashSales}, Card: ${cardSales}, MP: ${mpSales}. Total: ${totalSales}`);

        // Fallback for lagacy sales without payments (if any, though migration should handle it or code should handle old sales)
        // If we want to be safe: check if sale has payments. If not, use sale header method. 
        // But for new system, rely on SalePayment.

        // Calculate Bonus (Per Employee)
        const bonusRate = totalSales >= 1200000 ? 0.02 : 0.01;
        // Round to nearest 1000 using standard rounding to avoid "phantom" inflation
        const prizePerEmp = (Math.round((totalSales * bonusRate) / 1000) * 1000);
        // Assuming 1 employee for the summary projection (frontend multiplies this)
        const calculatedBonus = prizePerEmp;

        // Expected Cash in Drawer = Start + Cash Sales - Expenses
        // We do NOT subtract bonus here anymore, because the frontend does it dynamically based on employee count.
        // We return calculatedBonus so the frontend uses the same unit value.
        const expectedCash = shift.startAmount + cashSales - expensesTotal;

        return {
            success: true,
            summary: {
                startAmount: shift.startAmount,
                totalSales,
                expectedCash,
                difference: 0,
                salesCount: sales.length,
                cashSales,
                cardSales,
                mpSales,
                expenses: expensesTotal,
                calculatedBonus
            }
        };

    } catch (error) {
        console.error("Error getting shift summary:", error);
        return { success: false, error: "Error al obtener resumen." };
    }
}

/**
 * Close the register.
 */
export async function closeRegister(shiftId: string, finalAmount: number, employeeCount: number = 1) {
    try {
        // Calculate bonus before closing
        const { summary } = await getShiftSummary(shiftId);
        let bonusTotal = 0;

        if (summary) {
            const bonusRate = summary.totalSales >= 1200000 ? 0.02 : 0.01;
            const prizePerEmp = (Math.round((summary.totalSales * bonusRate) / 1000) * 1000);
            bonusTotal = prizePerEmp * employeeCount;
        }

        await db.cashShift.update({
            where: { id: shiftId },
            data: {
                endAmount: finalAmount,
                status: "CLOSED",
                endTime: new Date(),
                employeeCount: employeeCount,
                bonusTotal: bonusTotal
            } as any
        });

        revalidatePath("/vendor/pos");
        return { success: true };
    } catch (error) {
        console.error("Error closing register:", error);
        return { success: false, error: "Error al cerrar la caja." };
    }
}

/**
 * Register a cash expense.
 */
export async function registerExpense(branchId: string, userId: string, amount: number, description: string) {
    try {
        await db.expense.create({
            data: {
                branchId,
                userId,
                amount,
                description,
                createdAt: new Date()
            }
        });
        revalidatePath("/vendor/pos");
        return { success: true };
    } catch (error) {
        console.error("Error registering expense:", error);
        return { success: false, error: "Error al registrar gasto" };
    }
}
