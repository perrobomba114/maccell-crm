"use server";

import { db as prisma } from "@/lib/db";
import { aggregateCashShiftSales, calculateCashShiftBonus } from "@/lib/cash-shift-calculations";
import type { CashShift, Prisma, Sale, SaleItem } from "@prisma/client";

type ShiftExpense = Prisma.ExpenseGetPayload<{ include: { user: { select: { name: true } } } }>;
type ModifiedSale = Pick<Sale, "id" | "saleNumber" | "total" | "paymentMethod" | "originalPaymentMethod" | "updatedAt"> & { items: SaleItem[] };

export type CashShiftWithDetails = CashShift & {
    branch: { name: string };
    user: { name: string };
    totals: {
        totalSales: number;
        cash: number;
        card: number;
        mercadopago: number;
        expenses: number;
        bonuses: number;
        netTotal: number;
    };
    employeeCount?: number;
    bonusTotal?: number;
    counts: {
        sales: number;
        expenses: number;
    };
    details?: {
        expenses: Array<{ id: string; description: string; amount: number; time: Date; userName: string }>;
        modifiedSales: ModifiedSale[];
    }
};

export type CashDashboardStats = {
    shifts: CashShiftWithDetails[];
    kpi: {
        totalAmount: number;
        totalCount: number;
        totalExpenses: number;
        growthPercentage: number;
        averageTicket: number;
    };
};

export async function enrichShiftsOptimized(shifts: Array<CashShift & { branch: { name: string }; user: { name: string } }>, start: Date, end: Date, branchId?: string): Promise<CashShiftWithDetails[]> {
    const allSales = await prisma.sale.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            branchId: (branchId && branchId !== "ALL") ? branchId : undefined
        },
        include: { payments: true, items: true } 
    });

    let allExpenses: ShiftExpense[] = [];
    {
        try {
            allExpenses = await prisma.expense.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    branchId: (branchId && branchId !== "ALL") ? branchId : undefined
                },
                include: { user: { select: { name: true } } }
            });
        } catch (err: unknown) {
            console.warn("[CASH SHIFTS] Background expense task failed:", err instanceof Error ? err.message : String(err));
        }
    }

    return shifts.map(shift => {
        const sTime = shift.startTime;
        const eTime = shift.endTime || new Date();

        const shiftSales = allSales.filter(s =>
            s.branchId === shift.branchId &&
            s.vendorId === shift.userId &&
            s.createdAt >= sTime &&
            s.createdAt <= eTime
        );

        const shiftExpenses = allExpenses.filter(e =>
            e.branchId === shift.branchId &&
            e.userId === shift.userId &&
            e.createdAt >= sTime &&
            e.createdAt <= eTime
        );

        const { totalSales, cashSales: cash, cardSales: card, mpSales: mp } = aggregateCashShiftSales(shiftSales);

        const expensesTotal = shiftExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        const finalBonus = shift.status === "CLOSED"
            ? shift.bonusTotal
            : calculateCashShiftBonus(totalSales) * Math.max(1, shift.employeeCount);

        const netTotal = shift.startAmount + cash - expensesTotal - finalBonus;

        const modifiedSales = shiftSales
            .filter(s => s.wasPaymentModified)
            .map(s => ({
                id: s.id,
                saleNumber: s.saleNumber,
                total: s.total,
                paymentMethod: s.paymentMethod,
                originalPaymentMethod: s.originalPaymentMethod,
                updatedAt: s.updatedAt,
                items: s.items
            }));

        return {
            ...shift,
            totals: {
                totalSales,
                cash,
                card,
                mercadopago: mp,
                expenses: expensesTotal,
                bonuses: finalBonus,
                netTotal
            },
            counts: {
                sales: shiftSales.length,
                expenses: shiftExpenses.length
            },
            details: {
                expenses: shiftExpenses.map(e => ({
                    id: e.id,
                    description: e.description,
                    amount: e.amount,
                    time: e.createdAt,
                    userName: e.user?.name || "Desconocido"
                })),
                modifiedSales
            }
        } as CashShiftWithDetails;
    });
}
