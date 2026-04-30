"use server";

import { db as prisma } from "@/lib/db";
import { CashShift } from "@prisma/client";

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
        expenses: any[];
        modifiedSales: any[];
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

export async function enrichShiftsOptimized(shifts: any[], start: Date, end: Date, branchId?: string): Promise<CashShiftWithDetails[]> {
    const allSales = await prisma.sale.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            branchId: (branchId && branchId !== "ALL") ? branchId : undefined
        },
        include: { payments: true, items: true } 
    });

    let allExpenses: any[] = [];
    if ((prisma as any).expense) {
        try {
            allExpenses = await (prisma as any).expense.findMany({
                where: {
                    createdAt: { gte: start, lte: end },
                    branchId: (branchId && branchId !== "ALL") ? branchId : undefined
                },
                include: { user: { select: { name: true } } }
            });
        } catch (err: any) {
            console.warn("[CASH SHIFTS] Background expense task failed:", err.message);
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

        let cash = 0, card = 0, mp = 0, totalSales = 0;
        shiftSales.forEach(sale => {
            totalSales += sale.total;
            if (sale.payments && sale.payments.length > 0) {
                sale.payments.forEach(p => {
                    if (p.method === 'CASH') cash += p.amount;
                    else if (p.method === 'CARD') card += p.amount;
                    else if (p.method === 'MERCADOPAGO') mp += p.amount;
                });
            } else {
                if (sale.paymentMethod === 'CASH') cash += sale.total;
                else if (sale.paymentMethod === 'CARD') card += sale.total;
                else if (sale.paymentMethod === 'MERCADOPAGO') mp += sale.total;
            }
        });

        const expensesTotal = shiftExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        const storedBonus = (shift as any).bonusTotal || 0;
        let finalBonus = storedBonus;
        if (finalBonus === 0 && totalSales > 0) {
            const bonusRate = totalSales >= 1200000 ? 0.02 : 0.01;
            const count = (shift as any).employeeCount || 1;
            const perEmp = (Math.round((totalSales * bonusRate) / 1000) * 1000);
            finalBonus = perEmp * count;
        }

        const netTotal = shift.startAmount + cash - expensesTotal - finalBonus;

        const modifiedSales = shiftSales
            .filter(s => (s as any).wasPaymentModified)
            .map(s => ({
                id: s.id,
                saleNumber: s.saleNumber,
                total: s.total,
                paymentMethod: s.paymentMethod,
                originalPaymentMethod: (s as any).originalPaymentMethod,
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
