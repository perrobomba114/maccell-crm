"use server";

import { db as prisma } from "@/lib/db";
import { monthlyRepairStats } from "@/lib/monthly-repair-stats";
import { getMonthlyRange, reportMonth } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";


export async function getSalesAnalytics(branchId?: string, date = reportMonth()) {
    try {
        const branchFilter = branchId ? { branchId } : {};

        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(date.toISOString());
        const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1, 12));
        const { start: lastMonthStart, end: lastMonthEnd } = getMonthlyRange(previous.toISOString());

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
            monthlyRepairStats(branchId, firstDayOfMonth, lastDayOfMonth),
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
        const salesGrowth = lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

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
        const profitGrowth = lastMonthProfit > 0 ? ((profit - lastMonthProfit) / lastMonthProfit) * 100 : null;

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

        const { ok: okCountCount, unrepaired: noRepairCountCount, resolved: totalFinalized, delivered: deliveredTotal } = repairOutput;
        const efficiency = totalFinalized > 0
            ? Math.round((okCountCount / totalFinalized) * 100)
            : 0;

        return {
            financials: { revenue, profit, salesGrowth, profitMargin, profitGrowth },
            categoryShare: { total: profit, segments: categoryShare },
            stock: {
                received: repairOutput.received,
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
            financials: { revenue: 0, profit: 0, salesGrowth: null, profitGrowth: null, profitMargin: 0 },
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

export async function getRecentTransactions(branchId?: string, date = reportMonth()) {
    try {
        const branchFilter = branchId ? { branchId } : {};
        const { start: firstDayOfMonth, end } = getMonthlyRange(date.toISOString());

        const recentSales = await prisma.sale.findMany({
            where: { ...branchFilter, createdAt: { gte: firstDayOfMonth, lte: end } },
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
            paymentMethod: sale.paymentMethod,
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