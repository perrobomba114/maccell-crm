"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";



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

        // Last Month
        const refDate = date || new Date();
        const lastMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
        const lastMonthStr = lastMonthDate.toISOString().split('T')[0];
        const { start: firstDayOfLastMonth, end: lastDayOfLastMonth } = getMonthlyRange(lastMonthStr);

        const whereClause = branchId ? { branchId } : {};
        const whereClauseMonth = { ...whereClause, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } };
        const whereClauseLastMonth = { ...whereClause, createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } };

        // Execute all independent queries in parallel
        const [
            totalSales,
            saleItemsThisMonth,
            salesCurrentMonth,
            salesLastMonth,
            deliveredCountCurrent, // We only use the current month count now
            partsUsed,
            repairSalesItems,
            shifts,
            deliveredHistory
        ] = await Promise.all([
            // 1. Total Sales Volume (All Time Metadata)
            prisma.sale.aggregate({
                where: whereClause,
                _sum: { total: true }
            }),
            // 2. Sales Profit Data
            prisma.saleItem.findMany({
                where: { sale: whereClauseMonth },
                include: { product: { select: { costPrice: true } } }
            }),
            // 3. Sales Growth Data (Current)
            prisma.sale.aggregate({
                where: whereClauseMonth,
                _sum: { total: true },
                _count: { _all: true }
            }),
            // 4. Sales Growth Data (Last Month)
            prisma.sale.aggregate({
                where: whereClauseLastMonth,
                _sum: { total: true }
            }),
            // 5. Extended: Delivered Count
            prisma.repair.count({
                where: {
                    ...whereClause,
                    statusId: 10,
                    updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } // Delivered (10) usually implies Finished.
                    // Actually, "Delivered" state timestamp change is the "delivery" event.
                    // But if we want unique count, maybe use finishedAt?
                    // "Delivered Count" usually means "How many left the shop".
                    // Delivery happens AFTER finish. So updatedAt is correct for "Delivered This Month".
                    // But if the user says "reparacion cuente por ticket independientemente del estado",
                    // they prefer consistency.
                    // However, "Delivered" is a distinct event from "Finished".
                    // Leaving Delivered logic alone if it specifically asks for "status: 10".
                    // Wait, Delivered (10) is a SUBSET of Finished.
                    // If we want "Total Completed", we use finishedAt.
                    // If we want "Total Handed Over", we use updatedAt (Delivery Date).
                    // The user complained about "Suma de reparaciones" (Total Repairs).
                    // Let's assume "Delivered Count" is separate.
                    // But let's check "getRepairStats" below.
                }
            }),
            // 6. Extended: Spare Parts Cost
            prisma.repairPart.findMany({
                where: {
                    assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: whereClause
                },
                include: { sparePart: true }
            }),
            // 7. Extended: Repair Profit
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
            // 8. Extended: Bonuses
            prisma.cashShift.aggregate({
                where: {
                    ...whereClause,
                    startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                },
                _sum: { bonusTotal: true }
            }),
            // 9. Status History for OK vs No Reparado breakdown
            prisma.repairStatusHistory.findMany({
                where: {
                    toStatusId: 10, // Entregado
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: whereClause
                },
                select: { fromStatusId: true }
            })
        ]);

        // Process Results

        // Sales Profit Calc
        let profitThisMonth = 0;
        saleItemsThisMonth.forEach(item => {
            const cost = item.product?.costPrice || 0;
            const revenue = item.price * item.quantity;
            const totalCost = cost * item.quantity;
            profitThisMonth += (revenue - totalCost);
        });

        // Growth Calc
        const currentTotal = salesCurrentMonth._sum.total || 0;
        const lastTotal = salesLastMonth._sum.total || 0;
        const growthPercent = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 100;

        // Spare Parts Cost Calc
        const sparePartsCost = partsUsed.reduce((acc, rp) => {
            return acc + (rp.sparePart.priceArg * rp.quantity);
        }, 0);

        // Repair Profit Calc
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

        // Bonuses
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

export async function getProductStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const whereSale = branchId ? { branchId } : {};
        const whereStock = branchId ? { branchId } : {};

        // 1. Parallel Fetching
        const [topSellingRaw, lowStock, items] = await Promise.all([
            // Best Selling Products (Quantity)
            prisma.saleItem.findMany({
                where: {
                    sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                    productId: { not: null }
                },
                select: {
                    name: true,
                    quantity: true,
                    productId: true
                }
            }),
            // Replenishment Needs (Stock < 3)
            prisma.productStock.findMany({
                where: {
                    quantity: { lte: 3 },
                    ...whereStock
                },
                include: { product: true, branch: true },
                orderBy: { quantity: 'asc' },
                take: 20
            }),
            // Most "Gained" (Profit) Products
            prisma.saleItem.findMany({
                where: {
                    productId: { not: null },
                    sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
                },
                include: { product: true }
            })
        ]);

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

        // Calculate Replenishment based on Top Sellers
        // 1. Get IDs of products that are actually selling (to avoid "dead" products at zero)
        const activeSellingProductIds = Array.from(salesMap.keys()).filter(id => id.length > 10); // Simple check for valid ID

        // 2. Fetch stock for these active products across ALL branches
        const activeProductsStock = await prisma.productStock.findMany({
            where: {
                productId: { in: activeSellingProductIds },
                product: { deletedAt: null }
            },
            include: { product: true }
        });

        // Get total number of branches for target calculation
        const totalBranches = await prisma.branch.count();

        // 3. Aggregate stock by product
        const unifiedStockMap = new Map<string, { name: string, totalStock: number, salesVolume: number }>();

        activeProductsStock.forEach(s => {
            const saleData = salesMap.get(s.productId);
            const current = unifiedStockMap.get(s.productId) || {
                name: s.product.name,
                totalStock: 0,
                salesVolume: saleData?.quantity || 0
            };
            current.totalStock += s.quantity;
            unifiedStockMap.set(s.productId, current);
        });

        // 4. Calculate smart replenishment based on product category targets
        const replenishmentSuggestions = Array.from(unifiedStockMap.values())
            .map(item => {
                const lowerName = item.name.toLowerCase();
                let targetPerBranch = 5; // accesorios o predeterminado

                if (lowerName.includes("templado")) targetPerBranch = 10;
                else if (lowerName.includes("funda")) targetPerBranch = 10;
                else if (lowerName.includes("hidrogel")) targetPerBranch = 20;

                const globalTarget = targetPerBranch * totalBranches;
                const suggestedQuantity = Math.max(0, globalTarget - item.totalStock);

                return {
                    name: item.name,
                    branch: "Todas las sucursales", // Unified
                    quantity: item.totalStock,
                    suggestedQuantity,
                    salesVolume: item.salesVolume
                };
            })
            .filter(item => item.suggestedQuantity > 0)
            .sort((a, b) => {
                // Urgency Score: combination of "lo que más falta" and "lo que más se vende"
                const urgencyA = a.suggestedQuantity * (1 + a.salesVolume);
                const urgencyB = b.suggestedQuantity * (1 + b.salesVolume);
                return urgencyB - urgencyA;
            })
            .slice(0, 40)
            .map(({ name, branch, quantity, suggestedQuantity }) => ({ name, branch, quantity, suggestedQuantity }));

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
            lowStock: replenishmentSuggestions,
            mostProfitable
        };

    } catch (error) {
        console.error("Error in getProductStats:", error);
        return { topSelling: [], lowStock: [], mostProfitable: [] };
    }
}

export async function getBranchStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        // Last Month
        const refDate = date || new Date();
        const lastMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
        const lastMonthStr = lastMonthDate.toISOString().split('T')[0];
        const { start: firstDayOfLastMonth, end: lastDayOfLastMonth } = getMonthlyRange(lastMonthStr);

        const whereBranch = branchId ? { id: branchId } : {};

        // 1. Parallel Fetching
        const [branches, lastMonthSales, undeliveredStats, allStatuses] = await Promise.all([
            // Profit by Branch
            prisma.branch.findMany({
                where: whereBranch,
                include: {
                    sales: {
                        where: { createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                        include: { items: { include: { product: true } } }
                    }
                }
            }),
            // Growth by Branch
            prisma.sale.groupBy({
                by: ['branchId'],
                where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
                _sum: { total: true }
            }),
            // Undelivered Repairs
            prisma.repair.groupBy({
                by: ['branchId', 'statusId'],
                where: { statusId: { not: 10 } },
                _count: { _all: true }
            }),
            // Statuses
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
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const whereRepair = branchId ? { branchId } : {};

        // 1. Parallel Fetching (Independent Queries)
        const [topPartsRaw, techStats, phonesInStock, repairCount] = await Promise.all([
            // Most Used Spare Parts
            prisma.repairPart.groupBy({
                by: ['sparePartId'],
                where: {
                    repair: whereRepair,
                    assignedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10
            }),
            // Technician Stats
            prisma.repair.groupBy({
                by: ['assignedUserId'],
                where: {
                    statusId: { in: [5, 6, 7, 10] }, // Completed
                    finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    assignedUserId: { not: null },
                    ...whereRepair
                },
                _count: { _all: true }
            }),
            // Stock of "Phones"
            prisma.repair.count({
                where: {
                    statusId: { not: 10 },
                    ...whereRepair
                }
            }),
            // Repair Volume
            prisma.repair.count({
                where: {
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    ...whereRepair
                }
            })
        ]);

        // 2. Dependent Fetching
        const partIds = topPartsRaw.map(p => p.sparePartId);
        const userIds = techStats.map(t => t.assignedUserId!).filter(Boolean);

        const [partsInfo, users] = await Promise.all([
            prisma.sparePart.findMany({ where: { id: { in: partIds } } }),
            prisma.user.findMany({ where: { id: { in: userIds } } })
        ]);

        const mostUsedParts = topPartsRaw.map(t => {
            const info = partsInfo.find(p => p.id === t.sparePartId);
            return {
                name: info?.name || 'Unknown',
                count: t._sum.quantity || 0,
                stockLocal: info?.stockLocal,
                toReponish: info ? (info.maxStockLocal - info.stockLocal) : 0
            };
        });

        const bestTechnicians = techStats.map(t => ({
            name: users.find(u => u.id === t.assignedUserId)?.name || 'Unknown',
            repairs: t._count._all
        })).sort((a, b) => b.repairs - a.repairs);


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
