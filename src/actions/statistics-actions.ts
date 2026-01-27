"use server";

import { db as prisma } from "@/lib/db";



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
        const referenceDate = date || new Date();
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfLastMonth = new Date(year, month - 1, 1);
        const lastDayOfLastMonth = new Date(year, month, 0);
        const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const whereClause = branchId ? { branchId } : {};
        const whereClauseMonth = { ...whereClause, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } };
        const whereClauseLastMonth = { ...whereClause, createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } };

        // 1. Total Sales Volume (All Time)
        // Keeping as All Time metadata
        const totalSales = await prisma.sale.aggregate({
            where: whereClause,
            _sum: { total: true }
        });

        // 2. Sales Profit (This Month)
        const saleItemsThisMonth = await prisma.saleItem.findMany({
            where: {
                sale: whereClauseMonth
            },
            include: { product: { select: { costPrice: true } } }
        });

        let profitThisMonth = 0;
        saleItemsThisMonth.forEach(item => {
            const cost = item.product?.costPrice || 0;
            const revenue = item.price * item.quantity;
            const totalCost = cost * item.quantity;
            profitThisMonth += (revenue - totalCost);
        });

        // 3. Sales Growth (Current Month vs Last Month)
        const salesCurrentMonth = await prisma.sale.aggregate({
            where: whereClauseMonth,
            _sum: { total: true },
            _count: { _all: true }
        });
        const salesLastMonth = await prisma.sale.aggregate({
            where: whereClauseLastMonth,
            _sum: { total: true }
        });

        const currentTotal = salesCurrentMonth._sum.total || 0;
        const lastTotal = salesLastMonth._sum.total || 0;
        const growthPercent = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 100;



        // --- EXTENDED METRICS CALCULATION ---

        // 1. Equipos Entregados (Status ID 10)
        // Adjust date range to be Current Selected Month
        const deliveredCountCurrent = await prisma.repair.count({
            where: {
                ...whereClause,
                statusId: 10,
                updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            }
        });

        // 2. Gasto en Repuestos (Spare Parts Cost)
        // Logic: Find all parts assigned to repairs that were COMPLETED or UPDATED this month
        const partsUsed = await prisma.repairPart.findMany({
            where: {
                assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                repair: whereClause
            },
            include: { sparePart: true }
        });

        const sparePartsCost = partsUsed.reduce((acc, rp) => {
            return acc + (rp.sparePart.priceArg * rp.quantity);
        }, 0);

        // 3. Ganancia de Reparaciones (Repair Profit)
        const repairSalesItems = await prisma.saleItem.findMany({
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
        });

        let totalRepairRevenue = 0;
        let totalRepairPartsCost = 0;

        repairSalesItems.forEach(item => {
            totalRepairRevenue += (item.price * item.quantity);

            // Subtract parts cost FOR THIS SPECIFIC REPAIR
            if (item.repair && item.repair.parts) {
                item.repair.parts.forEach(part => {
                    totalRepairPartsCost += (part.sparePart.priceArg * part.quantity);
                });
            }
        });

        const repairProfit = totalRepairRevenue - totalRepairPartsCost;

        // 4. Premios Pagados (Bonuses)
        const shifts = await prisma.cashShift.aggregate({
            where: {
                ...whereClause,
                startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            },
            _sum: { bonusTotal: true }
        });
        const bonusesPaid = shifts._sum.bonusTotal || 0;


        return {
            totalSalesMetadata: totalSales._sum.total || 0,
            profitThisMonth,
            growthPercent: Math.round(growthPercent * 10) / 10,
            salesThisMonth: currentTotal,
            averageTicket: salesCurrentMonth._count._all > 0 ? Math.round(currentTotal / salesCurrentMonth._count._all) : 0,
            totalSalesCount: salesCurrentMonth._count._all,

            // New Fields
            sparePartsCost,
            repairProfit,
            deliveredCount: deliveredCountCurrent,
            bonusesPaid
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
            bonusesPaid: 0
        };
    }
}

export async function getProductStats(branchId?: string, date?: Date) {
    try {
        const referenceDate = date || new Date();
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const whereSale = branchId ? { branchId } : {};
        const whereStock = branchId ? { branchId } : {};

        // 1. Best Selling Products (Quantity) - Filter by Branch's Sales
        // Prisma groupBy on connected relation? No.
        // We'll filter SaleItems where Sale.branchId = X
        const topSellingRaw = await prisma.saleItem.findMany({
            where: {
                sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                productId: { not: null }
            },
            select: {
                name: true,
                quantity: true,
                productId: true
            }
        });

        // Aggregate inside JS because Prisma groupBy with relation filter is tricky (groupBy on SaleItem doesn't allow `where: { sale: ... }` directly in older versions, but check latest).
        // Actually for latest Prisma features:
        // const topSelling = await prisma.saleItem.groupBy({ by: ['productId'], where: { sale: { branchId } } ... }) -> This works in newer Prisma.
        // Let's assume standard support.

        const salesMap = new Map<string, { name: string, quantity: number, productId: string }>();
        topSellingRaw.forEach(item => {
            const key = item.productId || item.name;
            const current = salesMap.get(key) || { name: item.name, quantity: 0, productId: item.productId! };
            current.quantity += item.quantity;
            salesMap.set(key, current);
        });

        const topSelling = Array.from(salesMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);


        // 2. Replenishment Needs (Stock < 3) - Filter by Branch Stock
        const lowStock = await prisma.productStock.findMany({
            where: {
                quantity: { lte: 3 },
                ...whereStock
            },
            include: { product: true, branch: true },
            orderBy: { quantity: 'asc' },
            take: 20
        });

        // 3. Most "Gained" (Profit) Products
        // Need cost.
        const items = await prisma.saleItem.findMany({
            where: {
                productId: { not: null },
                sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
            },
            include: { product: true }
        });

        const profitMap = new Map<string, { name: string, profit: number }>();
        items.forEach(item => {
            if (!item.product) return;
            const key = item.productId!;
            const profit = (item.price - item.product.costPrice) * item.quantity;

            const current = profitMap.get(key) || { name: item.name, profit: 0 };
            current.profit += profit;
            profitMap.set(key, current);
        });

        const mostProfitable = Array.from(profitMap.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        return {
            topSelling,
            lowStock: lowStock.map(s => ({
                name: s.product.name,
                branch: s.branch.name,
                quantity: s.quantity
            })),
            mostProfitable
        };

    } catch (error) {
        console.error("Error in getProductStats:", error);
        return { topSelling: [], lowStock: [], mostProfitable: [] };
    }
}

export async function getBranchStats(branchId?: string, date?: Date) {
    try {
        const referenceDate = date || new Date();
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfLastMonth = new Date(year, month - 1, 1);
        const lastDayOfLastMonth = new Date(year, month, 0);
        const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const whereBranch = branchId ? { id: branchId } : {};

        // 1. Profit by Branch (Cost vs Sale)
        // We iterate branches and sum up sales items profit + repair profit (estimated)
        const branches = await prisma.branch.findMany({
            where: whereBranch,
            include: {
                sales: {
                    where: { createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                    include: { items: { include: { product: true } } }
                }
            }
        });

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

        // 2. Growth by Branch (This month vs Last month Sales Total)
        const lastMonthSales = await prisma.sale.groupBy({
            by: ['branchId'],
            where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
            _sum: { total: true }
        });

        // 3. Undelivered Repairs by Branch (Stacked Data)
        const undeliveredStats = await prisma.repair.groupBy({
            by: ['branchId', 'statusId'],
            where: { statusId: { not: 10 } },
            _count: { _all: true }
        });

        const allStatuses = await prisma.repairStatus.findMany();

        // Identify which statuses are actually present in the undelivered set to keys
        const presentStatusIds = Array.from(new Set(undeliveredStats.map(u => u.statusId)));
        const statusKeys = allStatuses
            .filter(s => presentStatusIds.includes(s.id))
            .map(s => ({ name: s.name, color: s.color || '#888' }));

        const undeliveredChartData = branches.map(b => {
            const branchRepairs = undeliveredStats.filter(u => u.branchId === b.id);
            const dataPoint: any = { name: b.name };

            // Fill 0 for all known keys ensuring consistent shape if needed, 
            // but sparse is fine for Recharts usually.
            // Let's populate actual values.
            branchRepairs.forEach(r => {
                const sName = allStatuses.find(s => s.id === r.statusId)?.name || `Status ${r.statusId}`;
                dataPoint[sName] = r._count._all;
            });
            return dataPoint;
        });

        // 4. Stock Health by Branch
        // % of products with stock > 0 checked in the last 30 days
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

export async function getRepairStats(branchId?: string, date?: Date) {
    try {
        const referenceDate = date || new Date();
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const whereRepair = branchId ? { branchId } : {};

        // 1. Most Used Spare Parts
        // Need to join through repairs to check branch?
        // RepairPart -> Repair -> Branch.
        // Prisma: findMany RepairPart where repair: { branchId: ... }
        const topPartsRaw = await prisma.repairPart.groupBy({
            by: ['sparePartId'],
            where: {
                repair: whereRepair,
                assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10
        });

        const partIds = topPartsRaw.map(p => p.sparePartId);
        const partsInfo = await prisma.sparePart.findMany({
            where: { id: { in: partIds } }
        });

        const mostUsedParts = topPartsRaw.map(t => {
            const info = partsInfo.find(p => p.id === t.sparePartId);
            return {
                name: info?.name || 'Unknown',
                count: t._sum.quantity || 0,
                stockLocal: info?.stockLocal,
                toReponish: info ? (info.maxStockLocal - info.stockLocal) : 0
            };
        });

        // 2. Technician Stats (Repairs Completed)
        const techStats = await prisma.repair.groupBy({
            by: ['assignedUserId'],
            where: {
                statusId: { in: [5, 6, 7, 10] }, // Completed
                updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                assignedUserId: { not: null },
                ...whereRepair
            },
            _count: { _all: true }
        });

        const userIds = techStats.map(t => t.assignedUserId!).filter(Boolean);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } }
        });

        const bestTechnicians = techStats.map(t => ({
            name: users.find(u => u.id === t.assignedUserId)?.name || 'Unknown',
            repairs: t._count._all
        })).sort((a, b) => b.repairs - a.repairs);


        // 3. Stock of "Phones" not in ID 10
        const phonesInStock = await prisma.repair.count({
            where: {
                statusId: { not: 10 },
                ...whereRepair
            }
        });

        // Repair Volume
        const repairCount = await prisma.repair.count({
            where: {
                statusId: { in: [5, 6, 7, 10] },
                updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                ...whereRepair
            }
        });


        return {
            mostUsedParts,
            bestTechnicians,
            repairVolume: repairCount,
            phonesInShop: phonesInStock
        };

    } catch (error) {
        console.error("Error in getRepairStats:", error);
        return { mostUsedParts: [], bestTechnicians: [], repairVolume: 0, phonesInShop: 0 };
    }
}
