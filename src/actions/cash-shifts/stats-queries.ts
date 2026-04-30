"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";
import { CashDashboardStats } from "./enrich-utils";
import { getCashShiftsInRangeOptimized } from "./list-queries";

export async function getCashDashboardStats(
    year: number,
    month: number, // 0-11
    branchId?: string
): Promise<CashDashboardStats> {
    try {
        const monthIndex = month + 1; // 1-12
        const currentMonthStr = `${year}-${String(monthIndex).padStart(2, '0')}-01`;

        const { start: startOfMonth, end: endOfMonth } = getMonthlyRange(currentMonthStr);

        const prevMonthDate = new Date(year, month - 1, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
        const { start: startOfPrevMonth, end: endOfPrevMonth } = getMonthlyRange(prevMonthStr);

        const currentShifts = await getCashShiftsInRangeOptimized(startOfMonth, endOfMonth, branchId);

        const prevTotalResult = await prisma.sale.aggregate({
            where: {
                createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                branchId: (branchId && branchId !== "ALL") ? branchId : undefined
            },
            _sum: { total: true }
        });
        const prevTotal = prevTotalResult._sum.total || 0;

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
