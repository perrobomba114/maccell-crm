"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";


export async function getSalesAnalytics(branchId?: string) {
    try {
        const branchFilter = branchId ? { branchId } : {};

        // Use Argentina Daily/Monthly Ranges
        const { start: todayStart } = getDailyRange(); // Not used directly here but good for ref reference
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange();

        // Calculate Last Month (AR Context)
        const nowAr = getArgentinaDate();
        const lastMonthAr = new Date(nowAr.getFullYear(), nowAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthAr.toISOString().split('T')[0];
        const { start: lastMonthStart, end: lastMonthEnd } = getMonthlyRange(lastMonthStr);

        // 1. Parallel Data Fetching
        const [salesCurrentMonth, revenueAgg, salesLastMonthAgg, stockAlertsRaw, repairOutput, salesLastMonthDetailed] = await Promise.all([
            // Sales for Analysis
            prisma.sale.findMany({
                where: { ...branchFilter, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } },
                include: {
                    items: {
                        include: {
                            product: { select: { costPrice: true, category: { select: { name: true } } } },
                            repair: { include: { parts: { include: { sparePart: { select: { priceArg: true } } } } } }
                        }
                    }
                }
            }),
            // Revenue Current Month
            prisma.sale.aggregate({ where: { ...branchFilter, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }, _sum: { total: true } }),
            // Revenue Last Month Aggregate (for basic ref)
            prisma.sale.aggregate({ where: { ...branchFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { total: true } }),
            // Stock Alerts
            prisma.productStock.findMany({
                where: { ...branchFilter, quantity: { lte: 3 } },
                include: { product: { select: { name: true } }, branch: { select: { name: true } } },
                take: 10,
                orderBy: { quantity: 'asc' }
            }),
            // Finished Repairs This Month (Finalized)
            prisma.repair.findMany({
                where: { ...branchFilter, finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }, statusId: { in: [5, 6, 7, 10] } },
                select: { statusId: true }
            }),
            // Sales Last Month Detailed for Profit Comparison
            prisma.sale.findMany({
                where: { ...branchFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                include: {
                    items: {
                        include: {
                            product: { select: { costPrice: true } },
                            repair: { include: { parts: { include: { sparePart: { select: { priceArg: true } } } } } }
                        }
                    }
                }
            })
        ]);

        const deliveredTotal = await prisma.repair.count({
            where: {
                ...branchFilter,
                statusId: 6, // DELIVERED
                finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            }
        }) + await prisma.repair.count({
            where: {
                ...branchFilter,
                statusId: 10, // INVOICED
                finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            }
        });



        // Fetch Warranties Count (New Requirement)
        const warrantiesCount = await prisma.repair.count({
            where: {
                ...branchFilter,
                isWarranty: true,
                createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            }
        });

        const revenue = revenueAgg._sum.total || 0;
        const lastMonthRevenue = salesLastMonthAgg._sum.total || 0;
        const salesGrowth = lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        // 3. Process Current Month Sales (Profit, Categories, Stock Cost)
        let cost = 0;
        let totalRepairPartsCost = 0;
        const categoryMap = new Map<string, number>();
        const productMap = new Map<string, number>();

        salesCurrentMonth.forEach(sale => {
            sale.items.forEach((item: any) => {
                let itemCost = 0;
                let catName = "Otros";
                productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);

                if (item.repair) {
                    catName = "Servicio Técnico";
                    if (item.repair.parts && item.repair.parts.length > 0) {
                        const partsCost = item.repair.parts.reduce((sum: number, part: any) => sum + (part.sparePart?.priceArg || 0) * part.quantity, 0);
                        itemCost = partsCost;
                        totalRepairPartsCost += partsCost * item.quantity;
                    }
                } else {
                    itemCost = item.product?.costPrice || 0;
                    catName = item.product?.category?.name || "Otros";
                }

                const totalLineCost = itemCost * item.quantity;
                cost += totalLineCost;
                const lineProfit = (item.price * item.quantity) - totalLineCost;
                if (lineProfit > 0) categoryMap.set(catName, (categoryMap.get(catName) || 0) + lineProfit);
            });
        });

        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        // Calculate Last Month Profit for Growth
        let lastMonthCost = 0;
        salesLastMonthDetailed.forEach(sale => {
            sale.items.forEach((item: any) => {
                let itemCost = 0;
                if (item.repair) {
                    if (item.repair.parts) {
                        itemCost = item.repair.parts.reduce((sum: number, part: any) => sum + (part.sparePart?.priceArg || 0) * part.quantity, 0);
                    }
                } else {
                    itemCost = item.product?.costPrice || 0;
                }
                lastMonthCost += (itemCost * item.quantity);
            });
        });
        const lastMonthProfit = lastMonthRevenue - lastMonthCost;
        const profitGrowth = lastMonthProfit > 0 ? ((profit - lastMonthProfit) / lastMonthProfit) * 100 : 0;

        const categoryShare = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const topProducts = Array.from(productMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const stockAlerts = stockAlertsRaw.map(s => ({
            productName: s.product.name,
            branchName: s.branch.name,
            quantity: s.quantity
        }));

        const okCountCount = (repairOutput as any[]).filter(r => r.statusId === 5 || r.statusId === 6 || r.statusId === 10).length;
        const noRepairCountCount = (repairOutput as any[]).filter(r => r.statusId === 7).length;

        // Efficiency calculation: (Successful Repairs) / (Total Finalized)
        const totalFinalized = okCountCount + noRepairCountCount;
        const efficiency = totalFinalized > 0
            ? Math.round((okCountCount / totalFinalized) * 100)
            : 0;

        return {
            financials: { revenue, profit, salesGrowth, profitMargin, profitGrowth },
            categoryShare: { total: profit, segments: categoryShare },
            stock: {
                health: totalRepairPartsCost,
                warrantiesCount,
                efficiency,
                alerts: stockAlerts,
                topSold: topProducts,
                okCount: okCountCount,
                noRepairCount: noRepairCountCount,
                totalFinalized: totalFinalized,
                deliveredCount: deliveredTotal,
                totalSalesCount: salesCurrentMonth.length
            }
        };

    } catch (e) {
        console.error("getSalesAnalytics error", e);
        return {
            financials: { revenue: 0, profit: 0, salesGrowth: 0, profitMargin: 0 },
            categoryShare: { segments: [] },
            stock: {
                alerts: [],
                topSold: [],
                okCount: 0,
                noRepairCount: 0,
                deliveredCount: 0,
                totalSalesCount: 0
            }
        };
    }
}

export async function getRecentTransactions(branchId?: string) {
    try {
        const branchFilter = branchId ? { branchId } : {};
        const { start: firstDayOfMonth } = getMonthlyRange(); // "This Month"

        const recentSales = await prisma.sale.findMany({
            where: { ...branchFilter, createdAt: { gte: firstDayOfMonth } },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, category: { select: { name: true } } } },
                        repair: true
                    }
                },
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const formattedRecentSales = recentSales.map((sale: any) => ({
            id: sale.id,
            saleNumber: sale.saleNumber,
            customerName: "Cliente Final",
            total: sale.total,
            branchName: sale.branch?.name || "Sucursal",
            createdAt: sale.createdAt,
            category: sale.items[0]?.repair ? "Servicio Técnico" : sale.items[0]?.product?.category?.name || "Otros",
            itemCount: sale.items.length
        }));

        return { tables: { recentSales: formattedRecentSales } };
    } catch (e) {
        return { tables: { recentSales: [] } };
    }
}