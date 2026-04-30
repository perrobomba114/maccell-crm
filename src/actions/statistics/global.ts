"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange, getArgentinaDate } from "@/lib/date-utils";

export async function getBranchesList() {
    try {
        return await prisma.branch.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        return [];
    }
}

export async function getGlobalStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const refAr = date ? date : getArgentinaDate();
        const lastMonthDate = new Date(refAr.getFullYear(), refAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthDate.toISOString().split('T')[0];
        const { start: firstDayOfLastMonth, end: lastDayOfLastMonth } = getMonthlyRange(lastMonthStr);

        const whereClause = branchId ? { branchId } : {};
        const whereClauseMonth = { ...whereClause, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } };
        const whereClauseLastMonth = { ...whereClause, createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } };

        const [
            totalSales,
            saleItemsThisMonth,
            salesCurrentMonth,
            salesLastMonth,
            deliveredCountCurrent,
            partsUsed,
            repairSalesItems,
            shifts,
            deliveredHistory
        ] = await Promise.all([
            prisma.sale.aggregate({
                where: whereClause,
                _sum: { total: true }
            }),
            prisma.saleItem.findMany({
                where: { sale: whereClauseMonth },
                include: { product: { select: { costPrice: true } } }
            }),
            prisma.sale.aggregate({
                where: whereClauseMonth,
                _sum: { total: true },
                _count: { _all: true }
            }),
            prisma.sale.aggregate({
                where: whereClauseLastMonth,
                _sum: { total: true }
            }),
            prisma.repair.count({
                where: {
                    ...whereClause,
                    statusId: 10,
                    updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } 
                }
            }),
            prisma.repairPart.findMany({
                where: {
                    assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: whereClause
                },
                include: { sparePart: true }
            }),
            prisma.saleItem.findMany({
                where: {
                    sale: whereClauseMonth,
                    repairId: { not: null }
                },
                include: {
                    repair: {
                        include: {
                            parts: { include: { sparePart: true } }
                        }
                    }
                }
            }),
            prisma.cashShift.aggregate({
                where: {
                    ...whereClause,
                    startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                },
                _sum: { bonusTotal: true }
            }),
            prisma.repairStatusHistory.findMany({
                where: {
                    toStatusId: 10,
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: whereClause
                },
                select: { fromStatusId: true }
            })
        ]);

        let profitThisMonth = 0;
        saleItemsThisMonth.forEach(item => {
            const cost = item.product?.costPrice || 0;
            const revenue = item.price * item.quantity;
            const totalCost = cost * item.quantity;
            profitThisMonth += (revenue - totalCost);
        });

        const currentTotal = salesCurrentMonth._sum.total || 0;
        const lastTotal = salesLastMonth._sum.total || 0;
        const growthPercent = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 100;

        const sparePartsCost = partsUsed.reduce((acc, rp) => {
            return acc + (rp.sparePart.priceArg * rp.quantity);
        }, 0);

        let totalRepairRevenue = 0;
        let totalRepairPartsCost = 0;

        repairSalesItems.forEach(item => {
            totalRepairRevenue += (item.price * item.quantity);

            if (item.repair && item.repair.parts) {
                item.repair.parts.forEach(part => {
                    totalRepairPartsCost += (part.sparePart.priceArg * part.quantity);
                });
            }
        });
        const repairProfit = totalRepairRevenue - totalRepairPartsCost;

        const bonusesPaid = shifts._sum.bonusTotal || 0;

        return {
            totalSalesMetadata: totalSales._sum.total || 0,
            profitThisMonth,
            growthPercent: Math.round(growthPercent * 10) / 10,
            salesThisMonth: currentTotal,
            averageTicket: salesCurrentMonth._count._all > 0 ? Math.round(currentTotal / salesCurrentMonth._count._all) : 0,
            totalSalesCount: salesCurrentMonth._count._all,
            sparePartsCost,
            repairProfit,
            deliveredCount: deliveredCountCurrent,
            bonusesPaid,
            okCount: deliveredHistory.filter(h => h.fromStatusId === 5).length,
            noRepairCount: deliveredHistory.filter(h => h.fromStatusId === 6).length
        };
    } catch (error) {
        console.error("Error in getGlobalStats:", error);
        return {
            totalSalesMetadata: 0,
            profitThisMonth: 0,
            growthPercent: 0,
            salesThisMonth: 0,
            averageTicket: 0,
            totalSalesCount: 0,
            sparePartsCost: 0,
            repairProfit: 0,
            deliveredCount: 0,
            bonusesPaid: 0,
            okCount: 0,
            noRepairCount: 0
        };
    }
}
