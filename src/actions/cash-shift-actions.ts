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

        const shiftsWithDetails = await Promise.all(shifts.map(async (shift) => {
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
                include: { items: true } // Include items for display if needed
            });

            // ... expenses fetch ...
            let expenses: any[] = [];
            if ((prisma as any).expense) {
                try {
                    expenses = await (prisma as any).expense.findMany({
                        where: {
                            branchId: shift.branchId,
                            userId: shift.userId,
                            createdAt: {
                                gte: startTime,
                                lte: endTime
                            }
                        },
                        include: {
                            user: { select: { name: true } }
                        }
                    });
                } catch (err) {
                    // ignore
                }
            }

            let cash = 0;
            let card = 0;
            let mp = 0;
            let totalSales = 0;

            sales.forEach(sale => {
                totalSales += sale.total;
                if (sale.paymentMethod === 'CASH') cash += sale.total;
                else if (sale.paymentMethod === 'CARD') card += sale.total;
                else if (sale.paymentMethod === 'MERCADOPAGO') mp += sale.total;
            });

            const expensesTotal = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);

            const storedBonus = (shift as any).bonusTotal || 0;
            let finalBonus = storedBonus;

            if (finalBonus === 0 && totalSales > 0) {
                const bonusRate = totalSales > 1000000 ? 0.02 : 0.01;
                const perEmp = Math.round((totalSales * bonusRate) / 500) * 500;
                const count = (shift as any).employeeCount || 1;
                finalBonus = perEmp * count;
            }

            const netTotal = shift.startAmount + cash - expensesTotal - finalBonus;

            // Filter modified sales
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

        return shiftsWithDetails;

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
            include: { items: true }
        });

        let expenses: any[] = [];
        if ((prisma as any).expense) {
            try {
                expenses = await (prisma as any).expense.findMany({
                    where: {
                        branchId: shift.branchId,
                        userId: shift.userId,
                        createdAt: {
                            gte: startTime,
                            lte: endTime
                        }
                    },
                    include: {
                        user: { select: { name: true } }
                    }
                });
            } catch (e) { }
        }

        let cash = 0;
        let card = 0;
        let mp = 0;
        let totalSales = 0;

        sales.forEach(sale => {
            totalSales += sale.total;
            if (sale.paymentMethod === 'CASH') cash += sale.total;
            else if (sale.paymentMethod === 'CARD') card += sale.total;
            else if (sale.paymentMethod === 'MERCADOPAGO') mp += sale.total;
        });

        const expensesTotal = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);

        const storedBonus = (shift as any).bonusTotal || 0;
        let finalBonus = storedBonus;

        if (finalBonus === 0 && totalSales > 0) {
            const bonusRate = totalSales > 1000000 ? 0.02 : 0.01;
            const perEmp = Math.round((totalSales * bonusRate) / 500) * 500;
            const count = (shift as any).employeeCount || 1;
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

    const shifts = await getCashShiftsInRange(startOfDay, endOfDay, branchId);

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

        // Fetch Current Month Shifts
        const currentShifts = await getCashShiftsInRange(startOfMonth, endOfMonth, branchId);
        const prevShifts = await getCashShiftsInRange(startOfPrevMonth, endOfPrevMonth, branchId);

        // Calculate Totals
        const currentTotal = currentShifts.reduce((acc, s) => acc + s.totals.totalSales, 0);
        const currentCount = currentShifts.reduce((acc, s) => acc + s.counts.sales, 0);
        const currentExpenses = currentShifts.reduce((acc, s) => acc + s.totals.expenses, 0);

        const prevTotal = prevShifts.reduce((acc, s) => acc + s.totals.totalSales, 0);

        let growth = 0;
        if (prevTotal > 0) {
            growth = ((currentTotal - prevTotal) / prevTotal) * 100;
        } else if (currentTotal > 0 && prevTotal === 0) {
            growth = 100;
        }

        const avgTicket = currentCount > 0 ? currentTotal / currentCount : 0;

        const result = {
            shifts: currentShifts,
            kpi: {
                totalAmount: currentTotal,
                totalCount: currentCount,
                totalExpenses: currentExpenses,
                growthPercentage: growth,
                averageTicket: avgTicket
            }
        };

        // Return result directly
        return result;

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            shifts: [],
            kpi: { totalAmount: 0, totalCount: 0, totalExpenses: 0, growthPercentage: 0, averageTicket: 0 }
        };
    }
}

async function getCashShiftsInRange(start: Date, end: Date, branchId?: string) {
    const whereClause: any = {
        startTime: {
            gte: start,
            lte: end
        }
    };
    if (branchId && branchId !== "ALL") {
        whereClause.branchId = branchId;
    }

    const shifts = await prisma.cashShift.findMany({
        where: whereClause,
        include: {
            branch: { select: { name: true } },
            user: { select: { name: true } }
        },
        orderBy: { startTime: 'desc' }
    });

    return enrichShifts(shifts);
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
            include: { items: true }
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
            if (sale.paymentMethod === 'CASH') cash += sale.total;
            else if (sale.paymentMethod === 'CARD') card += sale.total;
            else if (sale.paymentMethod === 'MERCADOPAGO') mp += sale.total;
        });

        const expensesTotal = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);

        const storedBonus = (shift as any).bonusTotal || 0;
        let finalBonus = storedBonus;
        if (finalBonus === 0 && totalSales > 0) {
            const bonusRate = totalSales > 1000000 ? 0.02 : 0.01;
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
