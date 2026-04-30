"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange, getArgentinaDate } from "@/lib/date-utils";

export async function getBranchStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const refAr = date ? date : getArgentinaDate();
        const lastMonthDate = new Date(refAr.getFullYear(), refAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthDate.toISOString().split('T')[0];
        const { start: firstDayOfLastMonth, end: lastDayOfLastMonth } = getMonthlyRange(lastMonthStr);

        const whereBranch = branchId ? { id: branchId } : {};

        const [branches, lastMonthSales, undeliveredStats, allStatuses] = await Promise.all([
            prisma.branch.findMany({
                where: whereBranch,
                include: {
                    sales: {
                        where: { createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                        include: { items: { include: { product: true } } }
                    }
                }
            }),
            prisma.sale.groupBy({
                by: ['branchId'],
                where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
                _sum: { total: true }
            }),
            prisma.repair.groupBy({
                by: ['branchId', 'statusId'],
                where: { statusId: { not: 10 } },
                _count: { _all: true }
            }),
            prisma.repairStatus.findMany()
        ]);

        const branchProfits = branches.map(b => {
            let totalRevenue = 0;
            let totalCost = 0;

            b.sales.forEach(sale => {
                totalRevenue += sale.total;
                sale.items.forEach(item => {
                    if (item.product) {
                        totalCost += (item.product.costPrice * item.quantity);
                    }
                });
            });

            return {
                name: b.name,
                revenue: totalRevenue,
                profit: totalRevenue - totalCost,
                margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
            };
        });

        const presentStatusIds = Array.from(new Set(undeliveredStats.map(u => u.statusId)));
        const statusKeys = allStatuses
            .filter(s => presentStatusIds.includes(s.id))
            .map(s => ({ name: s.name, color: s.color || '#888' }));

        const undeliveredChartData = branches.map(b => {
            const branchRepairs = undeliveredStats.filter(u => u.branchId === b.id);
            const dataPoint: any = { name: b.name };

            branchRepairs.forEach(r => {
                const sName = allStatuses.find(s => s.id === r.statusId)?.name || `Status ${r.statusId}`;
                dataPoint[sName] = r._count._all;
            });
            return dataPoint;
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stockHealthStats = await Promise.all(branches.map(async (b) => {
            const totalWithStock = await prisma.productStock.count({
                where: {
                    branchId: b.id,
                    quantity: { gt: 0 },
                    product: { deletedAt: null }
                }
            });

            if (totalWithStock === 0) return { name: b.name, health: 100 };

            const checkedWithStock = await prisma.productStock.count({
                where: {
                    branchId: b.id,
                    quantity: { gt: 0 },
                    product: { deletedAt: null },
                    lastCheckedAt: { gte: thirtyDaysAgo }
                }
            });

            return {
                name: b.name,
                health: Math.round((checkedWithStock / totalWithStock) * 100)
            };
        }));

        const growthStats = branches.map(b => {
            const current = branchProfits.find(p => p.name === b.name)?.revenue || 0;
            const last = lastMonthSales.find(l => l.branchId === b.id)?._sum.total || 0;
            const diff = current - last;
            const percent = last > 0 ? (diff / last) * 100 : 100;

            return {
                name: b.name,
                percent: Math.round(percent * 10) / 10
            };
        });

        const sortOrder = (a: { name: string }, b: { name: string }) => {
            const order: Record<string, number> = {
                "MACCELL 1": 1,
                "MACCELL 2": 2,
                "MACCELL 3": 3,
                "8 BIT ACCESORIOS": 4
            };
            const orderA = order[a.name.toUpperCase()] || 99;
            const orderB = order[b.name.toUpperCase()] || 99;
            return orderA - orderB;
        };

        return {
            branchProfits: branchProfits.sort(sortOrder),
            growthStats: growthStats.sort(sortOrder),
            undeliveredChartData: undeliveredChartData.sort(sortOrder),
            stockHealthStats: stockHealthStats.sort(sortOrder),
            statusKeys
        };

    } catch (error) {
        console.error("Error in getBranchStats:", error);
        return { branchProfits: [], growthStats: [], undeliveredChartData: [], statusKeys: [] };
    }
}
