"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import type { CashShift, Prisma } from "@prisma/client";
import { aggregateCashShiftSales, calculateCashShiftBonus } from "@/lib/cash-shift-calculations";
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
async function summarizeShift(shift: CashShift, client: Prisma.TransactionClient, through: Date): Promise<ShiftSummary> {
    const where = {
        branchId: shift.branchId,
        createdAt: { gte: shift.startTime, lte: shift.endTime ?? through },
    };
    const [sales, expenses] = await Promise.all([
        client.sale.findMany({
            where: { ...where, vendorId: shift.userId },
            select: { total: true, paymentMethod: true, payments: { select: { method: true, amount: true } } },
        }),
        client.expense.findMany({
            where: { ...where, userId: shift.userId },
            select: { amount: true },
        }),
    ]);
    const totals = aggregateCashShiftSales(sales);
    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
        ...totals,
        startAmount: shift.startAmount,
        expectedCash: shift.startAmount + totals.cashSales - expensesTotal,
        difference: 0,
        salesCount: sales.length,
        expenses: expensesTotal,
        calculatedBonus: shift.status === "CLOSED"
            ? shift.bonusTotal / Math.max(1, shift.employeeCount)
            : calculateCashShiftBonus(totals.totalSales),
    };
}

export async function getShiftSummary(shiftId: string): Promise<{ success: boolean, summary?: ShiftSummary, error?: string }> {
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "VENDOR"].includes(user.role)) return { success: false, error: "No autorizado" };
    try {
        const shift = await db.cashShift.findUnique({ where: { id: shiftId } });
        if (!shift) return { success: false, error: "Caja no encontrada." };
        if (user.role !== "ADMIN" && (shift.userId !== user.id || shift.branchId !== user.branch?.id)) {
            return { success: false, error: "No autorizado" };
        }
        return { success: true, summary: await summarizeShift(shift, db, new Date()) };
    } catch (error) {
        console.error("Error getting shift summary:", error);
        return { success: false, error: "Error al obtener resumen." };
    }
}

/** Close using one bounded snapshot for the persisted prize and the printed receipt. */
export async function closeRegister(shiftId: string, finalAmount: number, employeeCount: number = 1) {
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "VENDOR"].includes(user.role)) return { success: false as const, error: "No autorizado" };
    if (!Number.isFinite(finalAmount) || finalAmount < 0 || !Number.isSafeInteger(employeeCount) || employeeCount < 1) {
        return { success: false as const, error: "Monto o cantidad de empleados inválidos." };
    }
    try {
        const result = await db.$transaction(async (tx) => {
            const shift = await tx.cashShift.findUnique({ where: { id: shiftId } });
            if (!shift || shift.status !== "OPEN") return { success: false as const, error: "La caja no está abierta." };
            if (user.role !== "ADMIN" && (shift.userId !== user.id || shift.branchId !== user.branch?.id)) {
                return { success: false as const, error: "No autorizado" };
            }
            const closedAt = new Date();
            const summary = await summarizeShift(shift, tx, closedAt);
            const bonusTotal = summary.calculatedBonus * employeeCount;
            const updated = await tx.cashShift.updateMany({
                where: { id: shiftId, status: "OPEN" },
                data: { endAmount: finalAmount, status: "CLOSED", endTime: closedAt, employeeCount, bonusTotal },
            });
            if (updated.count !== 1) return { success: false as const, error: "La caja ya fue cerrada." };
            return { success: true as const, summary, closedAt };
        }, { isolationLevel: "RepeatableRead" });
        if (result.success) revalidatePath("/vendor/pos");
        return result;
    } catch (error) {
        console.error("Error closing register:", error);
        return { success: false as const, error: "Error al cerrar la caja." };
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
