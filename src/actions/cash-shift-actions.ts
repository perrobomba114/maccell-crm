"use server";

import { db as prisma } from "@/lib/db";
import { CashShift } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

export async function getCashShifts(
    date?: Date,
    branchId?: string
): Promise<CashShiftWithDetails[]> {
    try {
        const whereClause: any = {};

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            whereClause.startTime = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const shifts = await prisma.cashShift.findMany({
            where: whereClause,
            include: {
                branch: { select: { name: true } },
                user: { select: { name: true } }
            },
            orderBy: {
                startTime: 'desc'
            }
        });

        // Use reusable function
        return await enrichShifts(shifts);

    } catch (error) {
        console.error("Error fetching cash shifts:", error);
        return [];
    }
}

export async function getCashShiftById(shiftId: string): Promise<CashShiftWithDetails | null> {
    try {
        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId },
            include: {
                branch: { select: { name: true } },
                user: { select: { name: true } }
            }
        });

        if (!shift) return null;

        const [enriched] = await enrichShifts([shift]);
        return enriched || null;

    } catch (error) {
        console.error("Error fetching shift details:", error);
        return null;
    }
}

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

// New Action for fetching deep details for a specific day (Lazy Load)
export async function getDeepCashShiftsForDate(
    date: Date,
    branchId?: string
): Promise<CashShiftWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const shifts = await getCashShiftsInRangeOptimized(startOfDay, endOfDay, branchId);

    // Return full details, serialized (autobalanced by Next.js)
    return shifts;
}

export async function getCashDashboardStats(
    year: number,
    month: number, // 0-11
    branchId?: string
): Promise<CashDashboardStats> {
    try {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const startOfPrevMonth = new Date(year, month - 1, 1);
        const endOfPrevMonth = new Date(year, month, 0, 23, 59, 59, 999);

        // FAST PATH: Optimized current month fetch
        const currentShifts = await getCashShiftsInRangeOptimized(startOfMonth, endOfMonth, branchId);

        // FAST PATH: Optimized previous month total using aggregations (no need to fetch all shifts)
        const prevTotalResult = await prisma.sale.aggregate({
            where: {
                createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                branchId: (branchId && branchId !== "ALL") ? branchId : undefined
            },
            _sum: { total: true }
        });
        const prevTotal = prevTotalResult._sum.total || 0;

        // Calculate Totals using DIRECT AGGREGATION (Fixed: includes orphan sales/expenses)
        const currentSalesAgg = await prisma.sale.aggregate({
            where: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                branchId: (branchId && branchId !== "ALL") ? branchId : undefined
            },
            _sum: { total: true },
            _count: { id: true }
        });
        const currentTotal = currentSalesAgg._sum.total || 0;
        const currentCount = currentSalesAgg._count.id || 0;

        // Calculate Expenses Total
        const currentExpensesAgg = await prisma.expense.aggregate({
            where: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                branchId: (branchId && branchId !== "ALL") ? branchId : undefined
            },
            _sum: { amount: true }
        });
        const currentExpenses = currentExpensesAgg._sum.amount || 0;

        let growth = 0;
        if (prevTotal > 0) {
            growth = ((currentTotal - prevTotal) / prevTotal) * 100;
        } else if (currentTotal > 0 && prevTotal === 0) {
            growth = 100;
        }

        const avgTicket = currentCount > 0 ? currentTotal / currentCount : 0;

        return {
            shifts: currentShifts,
            kpi: {
                totalAmount: currentTotal,
                totalCount: currentCount,
                totalExpenses: currentExpenses,
                growthPercentage: growth,
                averageTicket: avgTicket
            }
        };

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            shifts: [],
            kpi: { totalAmount: 0, totalCount: 0, totalExpenses: 0, growthPercentage: 0, averageTicket: 0 }
        };
    }
}

async function getCashShiftsInRangeOptimized(start: Date, end: Date, branchId?: string) {
    const whereClause: any = {
        startTime: { gte: start, lte: end }
    };
    if (branchId && branchId !== "ALL") {
        whereClause.branchId = branchId;
    }

    // 1. Fetch shifts once
    const shifts = await prisma.cashShift.findMany({
        where: whereClause,
        include: {
            branch: { select: { name: true } },
            user: { select: { name: true } }
        },
        orderBy: { startTime: 'desc' }
    });

    if (shifts.length === 0) return [];

    // 2. Fetch all related sales for this range in BATCH (no items, very fast)
    // IMPORTANT: Include payments here too
    const allSales = await prisma.sale.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            branchId: (branchId && branchId !== "ALL") ? branchId : undefined
        },
        include: { payments: true }
    });

    // 3. Fetch all related expenses for this range in BATCH
    const allExpenses = await prisma.expense.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            branchId: (branchId && branchId !== "ALL") ? branchId : undefined
        },
        include: { user: { select: { name: true } } }
    });

    // 4. Enrich in-memory (O(N) vs O(N*Sales))
    return shifts.map(shift => {
        const sTime = shift.startTime;
        const eTime = shift.endTime || new Date();

        // Match sales/expenses to this shift in memory
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
                // Fallback for simple legacy sales
                if (sale.paymentMethod === 'CASH') cash += sale.total;
                else if (sale.paymentMethod === 'CARD') card += sale.total;
                else if (sale.paymentMethod === 'MERCADOPAGO') mp += sale.total;
            }
        });

        const expensesTotal = shiftExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        // Replicate bonus logic
        const storedBonus = (shift as any).bonusTotal || 0;
        let finalBonus = storedBonus;
        if (finalBonus === 0 && totalSales > 0) {
            const bonusRate = totalSales >= 1200000 ? 0.02 : 0.01;
            const count = (shift as any).employeeCount || 1;
            const perEmp = Math.round((totalSales * bonusRate) / 500) * 500;
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
                updatedAt: s.updatedAt
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
                    userName: (e as any).user.name
                })),
                modifiedSales
            }
        } as CashShiftWithDetails;
    });
}

// Extract the mapping logic from getCashShifts to reusable function
async function enrichShifts(shifts: any[]): Promise<CashShiftWithDetails[]> {
    return Promise.all(shifts.map(async (shift) => {
        const startTime = shift.startTime;
        const endTime = shift.endTime || new Date();

        const sales = await prisma.sale.findMany({
            where: {
                branchId: shift.branchId,
                vendorId: shift.userId,
                createdAt: {
                    gte: startTime,
                    lte: endTime
                }
            },
            include: { items: true, payments: true } // Added payments: true
        });

        // Expenses
        let expenses: any[] = [];
        if ((prisma as any).expense) {
            try {
                expenses = await (prisma as any).expense.findMany({
                    where: {
                        branchId: shift.branchId,
                        userId: shift.userId,
                        createdAt: { gte: startTime, lte: endTime }
                    },
                    include: { user: { select: { name: true } } }
                });
            } catch (err) { }
        }

        let cash = 0;
        let card = 0;
        let mp = 0;
        let totalSales = 0;

        sales.forEach(sale => {
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

        const expensesTotal = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);

        const storedBonus = (shift as any).bonusTotal || 0;
        let finalBonus = storedBonus;
        if (finalBonus === 0 && totalSales > 0) {
            const bonusRate = totalSales >= 1200000 ? 0.02 : 0.01;
            const count = (shift as any).employeeCount || 1;
            const perEmp = Math.round((totalSales * bonusRate) / 500) * 500;
            finalBonus = perEmp * count;
        }

        const netTotal = shift.startAmount + cash - expensesTotal - finalBonus;

        const modifiedSales = sales
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
                sales: sales.length,
                expenses: expenses.length
            },
            details: {
                expenses: expenses.map((e: any) => ({
                    id: e.id,
                    description: e.description,
                    amount: e.amount,
                    time: e.createdAt,
                    userName: e.user.name
                })),
                modifiedSales
            }
        };
    }));
}

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
            const sales = await tx.sale.findMany({
                where: {
                    branchId: shift.branchId,
                    vendorId: shift.userId,
                    createdAt: { gte: shift.startTime, lte: shift.endTime || undefined }
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
            // Check if expense model exists (it does based on enriched logic)
            if ((tx as any).expense) {
                const expenses = await (tx as any).expense.findMany({
                    where: {
                        branchId: shift.branchId,
                        userId: shift.userId,
                        createdAt: { gte: shift.startTime, lte: shift.endTime || undefined }
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
            // 1. Delete Historical Sales (Safety check: Only those starting with 'H')
            // Real sales shouldn't be deleted just because a shift wrapper is deleted, 
            // but the user specifically mentioned correcting bad imports.
            if (shift.status === "CLOSED" && shift.endTime) {
                await tx.sale.deleteMany({
                    where: {
                        branchId: shift.branchId,
                        vendorId: shift.userId,
                        createdAt: { gte: shift.startTime, lte: shift.endTime },
                        saleNumber: { startsWith: "H" } // ONLY Historical imports
                    }
                });

                // Also delete Expenses? Usually imports don't have expenses, but if they did...
                // Only delete if they are clearly linked to this import?
                // Expenses don't have a "saleNumber" so it's harder to distinguish.
                // Safest to leave expenses unless we are sure.
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
