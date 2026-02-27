"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate } from "@/lib/date-utils";

// Admin Dashboard Stats - Unified Executive Version
// --- Granular Data Fetching for Streaming ---

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
        const [salesCurrentMonth, revenueAgg, salesLastMonth, stockAlertsRaw, deliveredHistory] = await Promise.all([
            // Sales for Analysis
            prisma.sale.findMany({
                where: {
                    ...branchFilter,
                    createdAt: { gte: firstDayOfMonth }
                },
                include: {
                    items: {
                        include: {
                            product: { select: { costPrice: true, category: { select: { name: true } } } },
                            repair: {
                                include: {
                                    parts: {
                                        include: {
                                            sparePart: { select: { priceArg: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            // Revenue Current Month
            prisma.sale.aggregate({
                where: { ...branchFilter, createdAt: { gte: firstDayOfMonth } },
                _sum: { total: true }
            }),
            // Revenue Last Month
            prisma.sale.aggregate({
                where: { ...branchFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                _sum: { total: true }
            }),
            // Stock Alerts
            prisma.productStock.findMany({
                where: { ...branchFilter, quantity: { lte: 3 } },
                include: { product: { select: { name: true } }, branch: { select: { name: true } } },
                take: 10,
                orderBy: { quantity: 'asc' }
            }),
            // 5. Success/NoRepair counts from History (Current Month)
            prisma.repairStatusHistory.findMany({
                where: {
                    toStatusId: 10, // Entregado
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: branchFilter
                },
                select: { fromStatusId: true }
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

        // 2. Process Revenue Logic
        const revenue = revenueAgg._sum.total || 0;
        const lastMonthRevenue = salesLastMonth._sum.total || 0;
        const salesGrowth = lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        // 3. Process Sales (Profit, Categories, Stock Cost)
        let cost = 0;
        let totalRepairPartsCost = 0;
        const categoryMap = new Map<string, number>();
        const productMap = new Map<string, number>();

        salesCurrentMonth.forEach(sale => {
            sale.items.forEach((item: any) => {
                let itemCost = 0;
                let catName = "Otros";

                // Product Count
                productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);

                if (item.repair) {
                    catName = "Servicio Técnico";
                    if (item.repair.parts && item.repair.parts.length > 0) {
                        const partsCost = item.repair.parts.reduce((sum: number, part: any) => {
                            return sum + (part.sparePart?.priceArg || 0) * part.quantity;
                        }, 0);
                        itemCost = partsCost;
                        totalRepairPartsCost += partsCost * item.quantity;
                    }
                } else {
                    itemCost = item.product?.costPrice || 0;
                    catName = item.product?.category?.name || "Otros";
                }

                const totalLineCost = itemCost * item.quantity;
                cost += totalLineCost;
                const profit = (item.price * item.quantity) - totalLineCost;

                if (profit > 0) {
                    categoryMap.set(catName, (categoryMap.get(catName) || 0) + profit);
                }
            });
        });

        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

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

        const okCount = deliveredHistory.filter(h => h.fromStatusId === 5).length;
        const noRepairCount = deliveredHistory.filter(h => h.fromStatusId === 6).length;
        // Efficiency calculation: (Successful Repairs - Warranties) / Total Finalized
        // This penalizes warranties as they represent "bad repairs"
        const efficiency = (okCount + noRepairCount) > 0
            ? Math.max(0, Math.round(((okCount - warrantiesCount) / (okCount + noRepairCount)) * 100))
            : 0;

        return {
            financials: { revenue, profit, salesGrowth, profitMargin },
            categoryShare: { total: profit, segments: categoryShare },
            stock: {
                health: totalRepairPartsCost,
                warrantiesCount,
                efficiency,
                alerts: stockAlerts,
                topSold: topProducts,
                okCount,
                noRepairCount,
                deliveredCount: deliveredHistory.length,
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

export async function getRepairAnalytics(branchId?: string, date?: Date) {
    try {
        const branchFilter = branchId ? { branchId } : {};

        // Handle optional input date for "Reference Month"
        // If date is provided, use it to get that month's range. Else current month.
        const referenceDateString = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateString);

        // Tomorrow check implies "Active" logic usually relative to "Now"
        const tomorrow = new Date(); // Use UTC "Now" for simplified "is future" check
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Parallel Fetching (Independent Queries)
        const [repairsActive, techUsers, partsStats, repairsByStatusRaw, allStatuses, warrantiesCount] = await Promise.all([
            // Active Repairs
            prisma.repair.findMany({
                where: { ...branchFilter, statusId: { notIn: [10] } },
                select: { promisedAt: true, statusId: true }
            }),
            // Tech Users (needed for next query)
            prisma.user.findMany({
                where: { role: 'TECHNICIAN' },
                select: { id: true, name: true }
            }),
            // Frequent Parts (First Step)
            prisma.repairPart.groupBy({
                by: ['sparePartId'],
                where: { repair: branchFilter },
                _count: { _all: true },
                orderBy: { _count: { sparePartId: 'desc' } },
                take: 10
            }),
            // Monthly Distribution (Finalized Repairs Only)
            // Match logic from repair cards: only count completed repairs (5,6,7,10) using finishedAt
            prisma.repair.groupBy({
                by: ['statusId'],
                where: {
                    ...branchFilter,
                    statusId: { in: [5, 6, 7, 10] },  // Only finalized repairs
                    finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }  // Use finishedAt not createdAt
                },
                _count: { _all: true }
            }),
            // Status Names
            prisma.repairStatus.findMany(),
            // Warranties Count (Monthly)
            prisma.repair.count({
                where: {
                    ...branchFilter,
                    isWarranty: true,
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                }
            })
        ]);

        // 2. Dependent Queries (require results from above)
        const [detailedTechRepairs, partsDetails] = await Promise.all([
            // Tech Detailed Repairs
            prisma.repair.findMany({
                where: {
                    assignedUserId: { in: techUsers.map(u => u.id) },
                    OR: [
                        { statusId: { in: [3, 4] } },
                        { statusId: { in: [5, 6, 7, 10] }, finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
                    ],
                    ...branchFilter
                },
                select: { assignedUserId: true, statusId: true, estimatedTime: true, startedAt: true, finishedAt: true }
            }),
            // Part Details
            prisma.sparePart.findMany({
                where: { id: { in: partsStats.map(p => p.sparePartId) } },
                select: { id: true, name: true, stockLocal: true }
            })
        ]);

        // 3. Processing
        const activeRepairsCount = repairsActive.length;
        const highPriorityCount = repairsActive.filter(r => r.promisedAt && new Date(r.promisedAt) < tomorrow).length;

        const topTechnicians = techUsers.map(user => {
            const userRepairs = detailedTechRepairs.filter(r => r.assignedUserId === user.id);
            const count = userRepairs.length;
            let remainingLoad = 0;
            const now = new Date();
            userRepairs.forEach(r => {
                if (r.statusId === 4) remainingLoad += (r.estimatedTime || 0);
                else if (r.statusId === 3) {
                    if (r.startedAt && r.estimatedTime) {
                        const elapsedMs = now.getTime() - new Date(r.startedAt).getTime();
                        if (elapsedMs > 0) {
                            remainingLoad += Math.max(0, r.estimatedTime - Math.floor(elapsedMs / 60000));
                        } else {
                            remainingLoad += (r.estimatedTime || 0);
                        }
                    } else remainingLoad += (r.estimatedTime || 0);
                }
            });
            return { name: user.name, repairs: count, time: remainingLoad, percent: 0 };
        }).sort((a, b) => b.repairs - a.repairs);

        const maxRepairs = topTechnicians.length > 0 ? topTechnicians[0].repairs : 0;
        topTechnicians.forEach(t => t.percent = maxRepairs > 0 ? (t.repairs / maxRepairs) * 100 : 0);

        const frequentParts = partsStats.map(p => {
            const detail = partsDetails.find(d => d.id === p.sparePartId);
            return { name: detail?.name || "Unknown", usage: p._count._all, stock: detail?.stockLocal || 0 };
        });

        const colorMap: Record<string, string> = {
            blue: "#3b82f6",
            indigo: "#6366f1",
            yellow: "#eab308",
            gray: "#71717a",
            green: "#22c55e",
            red: "#ef4444",
            purple: "#a855f7",
            orange: "#f97316",
            amber: "#f59e0b",
            slate: "#3b82f6", // Blue for "Entregados"
            entregado: "#3b82f6",
            entregados: "#3b82f6",
            emerald: "#10b981",
            pink: "#ec4899",
            violet: "#8b5cf6"
        };

        const monthlyStatusDistribution = repairsByStatusRaw.map(item => {
            const status = allStatuses.find(s => s.id === item.statusId);
            const rawColor = status?.color || 'gray';
            return {
                name: status?.name || `Status ${item.statusId}`,
                value: item._count._all,
                color: colorMap[rawColor as keyof typeof colorMap] || rawColor || '#888'
            };
        });

        // Add Warranties as a category
        if (warrantiesCount > 0) {
            monthlyStatusDistribution.push({
                name: "Garantías",
                value: warrantiesCount,
                color: colorMap.orange
            });
        }

        monthlyStatusDistribution.sort((a, b) => b.value - a.value);

        return {
            repairs: {
                active: activeRepairsCount,
                highPriority: highPriorityCount,
                technicians: topTechnicians,
                frequentParts,
                monthlyStatusDistribution
            }
        };

    } catch (e) {
        console.error("getRepairAnalytics error", e);
        return { repairs: { active: 0, technicians: [], frequentParts: [], monthlyStatusDistribution: [] } };
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

export async function getAdminStats(branchId?: string) {
    const [sales, repairs, transactions] = await Promise.all([
        getSalesAnalytics(branchId),
        getRepairAnalytics(branchId),
        getRecentTransactions(branchId)
    ]);

    return {
        ...sales,
        ...repairs,
        ...transactions
    };
}

// Vendor and Technician Stats - RESTORED
export async function getVendorStats(vendorId: string, branchId?: string) {
    try {
        // Use Argentina Time Ranges
        const { start: todayStart } = getDailyRange();
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange();

        const nowAr = getArgentinaDate();
        const lastMonthAr = new Date(nowAr.getFullYear(), nowAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthAr.toISOString().split('T')[0];
        const { start: lastMonthStart, end: lastMonthEnd } = getMonthlyRange(lastMonthStr);

        // 1. Sales Metrics (Current Month)
        // We really want to filter by the VENDOR (user) if possible, or Branch if it's a general dashboard.
        // Usually "Vendor Dashboard" implies PERSONAL stats, but falling back to BRANCH stats is common if they want to see "How we are doing".
        // The user asked for "Vendor Role" dashboard. Usually vendors want to see their own sales.
        // Let's filter by vendorId for sales.

        const salesPromise = Promise.all([
            // Sales Count (Month)
            prisma.sale.count({
                where: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: firstDayOfMonth }
                }
            }),
            // Total Revenue (Month)
            prisma.sale.aggregate({
                where: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: firstDayOfMonth }
                },
                _sum: { total: true }
            }),
            // Sales Today (for comparison or "Live" feel)
            prisma.sale.count({
                where: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: todayStart }
                }
            }),
            // Total Revenue (Last Month)
            prisma.sale.aggregate({
                where: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: lastMonthStart, lte: lastMonthEnd } // <= OJO: el lte
                },
                _sum: { total: true }
            }),
            // 5. Success/NoRepair counts from History (Current Month)
            prisma.repairStatusHistory.findMany({
                where: {
                    toStatusId: 10, // Entregado
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    repair: branchId ? { branchId } : {}
                },
                select: { fromStatusId: true }
            })
        ]);

        const [salesMonthCount, salesMonthTotal, salesTodayCount, salesLastMonthTotalAgg, deliveredHistory] = await salesPromise;

        const currentMonthRevenue = salesMonthTotal._sum.total || 0;
        const lastMonthRevenue = salesLastMonthTotalAgg._sum.total || 0;
        const salesMonthGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        // 2. Repairs Intakes (Month) - "Equipos recibidos"
        // This is usually repairs CREATED by this vendor (userId is the creator)
        const repairsIntakeMonth = await prisma.repair.count({
            where: {
                userId: vendorId,
                createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
            }
        });

        // 3. Workshop Income (Ingresos Taller)
        // Interpreted as: Revenue from Repairs that were COMPLETED (and likely paid) this month.
        // This is tricky. A repair pays when it is part of a Sale (usually).
        // Or we can sum the 'price' of repairs that reached 'Delivered' state this month.
        // Let's try to look at SALES that include a REPAIR item, sold by this vendor.

        const repairSales = await prisma.sale.findMany({
            where: {
                vendorId, // Sold by this vendor
                createdAt: { gte: firstDayOfMonth },
                items: {
                    some: {
                        repairId: { not: null }
                    }
                }
            },
            include: {
                items: {
                    where: { repairId: { not: null } },
                    select: { price: true, quantity: true }
                }
            }
        });

        let repairRevenue = 0;
        let repairCount = 0;
        repairSales.forEach(sale => {
            sale.items.forEach(item => {
                repairRevenue += item.price * item.quantity;
                repairCount += item.quantity;
            });
        });


        // 4. "Para Retirar" (Ready for Pickup)
        // This is relevant for the BRANCH, not just the vendor, so any vendor can hand it over.
        const branchFilter = branchId ? { branchId } : {};
        const readyForPickupRaw = await prisma.repair.findMany({
            where: {
                ...branchFilter,
                statusId: 6, // 6 = Ready/Reparado (Check your specific status ID map, usually 6 or 7)
            },
            select: {
                id: true,
                ticketNumber: true,
                customer: { select: { name: true, phone: true } },
                deviceModel: true,
                estimatedPrice: true // Using estimatedPrice as proxy for cost
            },
            orderBy: { updatedAt: 'desc' },
            take: 10
        });

        const readyForPickup = readyForPickupRaw.map(r => ({
            id: r.id,
            ticket: r.ticketNumber,
            customer: r.customer?.name || "Cliente",
            phone: r.customer?.phone || "",
            device: r.deviceModel,
            amount: r.estimatedPrice || 0
        }));


        // 5. Best Selling Products (Month)
        // Group by Product Name (or ID) from SalesItems
        const salesItems = await prisma.saleItem.groupBy({
            by: ['productId', 'name'],
            where: {
                sale: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: firstDayOfMonth }
                },
                productId: { not: null } // Only products, not repairs
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10
        });

        // Format for Chart
        const topSellingProducts = salesItems.map(item => ({
            name: item.name || "Producto",
            value: item._sum.quantity || 0,
            fill: "var(--color-" + item.name?.replace(/[^a-zA-Z0-9]/g, '') + ")" // Placeholder, color handled in UI usually
        }));


        // 6. Sales Last 7 Days (Chart) - Keep this as it's useful
        const { start: sevenDaysStart } = getLastDaysRange(6); // 6 days ago + today = 7 days

        const salesLast7 = await prisma.sale.findMany({
            where: {
                OR: [
                    { vendorId },
                    { branchId, saleNumber: { startsWith: 'H' } }
                ],
                createdAt: { gte: sevenDaysStart }
            },
            select: { createdAt: true, total: true }
        });

        const weeklyOutputMap = new Map<string, number>();
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        // Fill 0s for last 7 days including today
        const todayAr = getArgentinaDate();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayAr);
            d.setDate(d.getDate() - i);
            const dayName = days[d.getDay()];
            weeklyOutputMap.set(dayName, 0); // Warning: Overwrites duplicates if circling weeks? No, 7 unique days.
        }

        salesLast7.forEach(sale => {
            // Note: createdAt is UTC. We need day of week in AR.
            // Simplified: The chart labels are arbitrary "Dom/Lun", precision error of few hours is less critical 
            // for "Last 7 days" trend than for "Daily Total". 
            // BUT, let's use the helper if we can. 
            // For now, standard JS Date .getDay() in Node (server) might be UTC or Local. Usually UTC.
            const dayName = days[new Date(sale.createdAt).getDay()];
            weeklyOutputMap.set(dayName, (weeklyOutputMap.get(dayName) || 0) + sale.total);
        });

        const salesLast7Days = Array.from(weeklyOutputMap.entries()).map(([name, total]) => ({ name, total }));


        // 7. Recent Activity (Latest Sales)
        const recentActivityRaw = await prisma.sale.findMany({
            where: {
                OR: [
                    { vendorId },
                    { branchId, saleNumber: { startsWith: 'H' } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                items: { include: { product: true, repair: true } }
            }
        });

        const recentActivity = recentActivityRaw.map(sale => {
            const isRepair = sale.items.some(i => i.repairId);
            return {
                id: sale.id,
                action: isRepair ? "Entrega Reparación" : "Venta Producto",
                details: `${sale.items.length} items - $${sale.total}`,
                date: sale.createdAt.toLocaleDateString('es-AR'),
                time: sale.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            };
        });


        // 8. Monthly Repairs Distribution (Branch)
        const repairsStatusRaw = await prisma.repair.groupBy({
            by: ['statusId'],
            where: {
                branchId,
                createdAt: { gte: firstDayOfMonth }
            },
            _count: { _all: true }
        });

        const allStatuses = await prisma.repairStatus.findMany();
        const monthlyStatusDistribution = repairsStatusRaw.map(item => {
            const status = allStatuses.find(s => s.id === item.statusId);
            return {
                name: status?.name || `Status ${item.statusId}`,
                value: item._count._all,
                color: status?.color || '#888'
            };
        }).sort((a, b) => b.value - a.value);

        // 9. Undelivered Count (Branch, Stacked)
        const branchUndeliveredRaw = await prisma.repair.groupBy({
            by: ['statusId'],
            where: {
                branchId,
                statusId: { not: 10 }
            },
            _count: { _all: true }
        });

        const branchUndeliveredDataPoint: any = { name: "Mi Sucursal" };
        const presentUndeliveredIds = new Set<number>();

        branchUndeliveredRaw.forEach(item => {
            const sName = allStatuses.find(s => s.id === item.statusId)?.name || `Status ${item.statusId}`;
            branchUndeliveredDataPoint[sName] = item._count._all;
            presentUndeliveredIds.add(item.statusId);
        });

        const branchUndeliveredData = [branchUndeliveredDataPoint];

        const branchUndeliveredKeys = allStatuses
            .filter(s => presentUndeliveredIds.has(s.id))
            .map(s => ({ name: s.name, color: s.color || '#888' }));


        return {
            salesMonthCount: salesMonthCount,
            salesMonthTotal: salesMonthTotal._sum.total || 0,
            salesMonthGrowth,
            repairsIntakeMonth,
            repairRevenueMonth: repairRevenue,
            repairCountMonth: repairCount,
            readyForPickup,
            topSellingProducts,
            salesLast7Days,
            recentActivity,
            monthlyStatusDistribution, // Added
            branchUndeliveredData, // Added
            branchUndeliveredKeys, // Added
            okCount: deliveredHistory.filter(h => h.fromStatusId === 5).length,
            noRepairCount: deliveredHistory.filter(h => h.fromStatusId === 6).length,
            deliveredCount: deliveredHistory.length
        };

    } catch (error) {
        console.error("Error getVendorStats:", error);
        return {
            salesMonthCount: 0,
            salesMonthTotal: 0,
            salesMonthGrowth: 0,
            repairsIntakeMonth: 0,
            repairRevenueMonth: 0,
            readyForPickup: [],
            topSellingProducts: [],
            salesLast7Days: [],
            recentActivity: [],
            monthlyStatusDistribution: [],
            branchUndeliveredData: [],
            branchUndeliveredKeys: []
        };
    }
}

export async function getTechnicianStats(technicianId: string) {
    try {
        const { start: todayStart } = getDailyRange();
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange();
        const { start: sevenDaysStart } = getLastDaysRange(6);

        // 1. Fetch Key Counts and Distributions
        const [pendingRepairsCount, activeRepairsCount, completedToday, completedMonth, statusDist, finishedLast30, completedLastMonth] = await Promise.all([
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [1, 2, 4] } } }), // Pending, Assigned, Diagnosing
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: 3 } }), // In Progress
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [5, 6, 7, 10] }, finishedAt: { gte: todayStart } } }),
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [5, 6, 7, 10] }, finishedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
            prisma.repair.groupBy({ by: ['statusId'], where: { assignedUserId: technicianId }, _count: { _all: true } }),
            // Performance Metrics Fetching (Last 30 Days)
            prisma.repair.findMany({
                where: {
                    assignedUserId: technicianId,
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: { gte: getLastDaysRange(30).start }
                },
                select: {
                    id: true,
                    finishedAt: true,
                    promisedAt: true,
                    warrantyRepairs: { select: { id: true } } // Check if it generated warranties
                }
            }),
            // NEW: Completed Last Month for comparison
            // Use same lastMonth logic as above
            prisma.repair.count({
                where: {
                    assignedUserId: technicianId,
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), // Naive rough estimation for now or ideally use getMonthlyRange w/ date
                        lt: firstDayOfMonth
                    }
                }
            })
        ]);

        const statusNames = await prisma.repairStatus.findMany();
        const statusDistribution = statusDist.map(item => {
            const status = statusNames.find(s => s.id === item.statusId);
            return {
                name: status?.name || `Status ${item.statusId}`,
                value: item._count._all,
                color: status?.color || '#888'
            };
        });

        // --- Performance Metrics Calculation ---
        const totalFinished30 = finishedLast30.length;

        // 1. Quality Score (Repairs without warranty returns)
        // If has warrantyRepairs > 0, it failed quality.
        const warrantyReturns = finishedLast30.filter(r => r.warrantyRepairs.length > 0).length;
        const qualityScore = totalFinished30 > 0
            ? Math.round(((totalFinished30 - warrantyReturns) / totalFinished30) * 100)
            : 100; // Default to 100 if no repairs yet

        // 2. On-Time Rate (Finished <= Promised)
        const onTimeRepairs = finishedLast30.filter(r => {
            if (!r.finishedAt || !r.promisedAt) return true; // Assume ok if missing data
            return new Date(r.finishedAt) <= new Date(r.promisedAt);
        }).length;
        const onTimeRate = totalFinished30 > 0
            ? Math.round((onTimeRepairs / totalFinished30) * 100)
            : 100;

        // 3. Stagnation Radar (Active repairs inactive > 48h)
        const stagnationThreshold = new Date();
        stagnationThreshold.setHours(stagnationThreshold.getHours() - 48);

        const stagnatedRepairsRaw = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { notIn: [5, 6, 7, 8, 9, 10] }, // Not finished/cancelled
                updatedAt: { lte: stagnationThreshold }
            },
            select: {
                id: true,
                ticketNumber: true,
                deviceModel: true,
                statusId: true,
                updatedAt: true
            },
            take: 5
        });

        const stagnatedRepairs = stagnatedRepairsRaw.map(r => ({
            id: r.id,
            ticketNumber: r.ticketNumber,
            device: r.deviceModel,
            daysInactive: Math.floor((new Date().getTime() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
            statusName: statusNames.find(s => s.id === r.statusId)?.name || "?"
        }));

        // 2. Active Workspace (Detailed)
        // Fetch items strictly In Progress (3) OR Paused/Planned (4)
        const activeWorkspaceRaw = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { in: [3, 4] }
            },
            include: {
                status: true,
                customer: true
            },
            orderBy: { updatedAt: 'desc' } // Order by recent activity so newly assigned appear top
        });

        const activeWorkspace = activeWorkspaceRaw.map(r => ({
            id: r.id,
            ticket: r.ticketNumber,
            ticketNumber: r.ticketNumber,
            device: `${r.deviceBrand} ${r.deviceModel}`,
            customer: r.customer?.name || "Cliente",
            problem: r.problemDescription,
            repairType: r.problemDescription,
            startedAt: r.startedAt || r.updatedAt,
            estimatedTime: r.estimatedTime || 0,
            statusName: r.status.name,
            statusColor: r.status.color || "#3b82f6",
            isWet: r.isWet,
            isWarranty: r.isWarranty
        }));

        // 3. Queue (Pending/Assigned)
        const queueRaw = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { in: [1, 2, 4] } // Pending, Assigned, Diagnosing
            },
            include: {
                status: true,
                customer: true
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
            take: 10
        });

        const queue = queueRaw.map(r => ({
            id: r.id,
            ticket: r.ticketNumber,
            ticketNumber: r.ticketNumber,
            device: `${r.deviceBrand} ${r.deviceModel}`,
            customer: r.customer?.name || "Cliente",
            problem: r.problemDescription,
            repairType: r.problemDescription,
            createdAt: r.createdAt,
            statusName: r.status.name,
            statusColor: r.status.color || "#888",
            isWet: r.isWet,
            isWarranty: r.isWarranty
        }));

        // 4. Weekly Output Chart
        // Get all completed repairs in last 7 days to group by day
        const weeklyCompleted = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { in: [5, 6, 7, 10] }, // Done
                finishedAt: { gte: sevenDaysStart }
            },
            select: { finishedAt: true }
        });

        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const weeklyOutputMap = new Map<string, number>();

        // Initialize last 7 days in map
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = days[d.getDay()];
            if (!weeklyOutputMap.has(dayName)) {
                weeklyOutputMap.set(dayName, 0);
            }
        }

        weeklyCompleted.forEach((r: any) => {
            if (!r.finishedAt) return;
            const dayName = days[new Date(r.finishedAt).getDay()];
            weeklyOutputMap.set(dayName, (weeklyOutputMap.get(dayName) || 0) + 1);
        });

        // Convert to array in correct order (Today is last)
        const weeklyOutput = Array.from(weeklyOutputMap.entries())
            .map(([name, count]) => ({ name, count }))
            .reverse(); // Simplified ordering, might need precise sorting if strict "last 7 days" order needed, but this is okay for "Recent"


        // 5. Avg Repair Time
        // Calc average of (finishedAt - startedAt) for repairs that have both
        const repairsWithTime = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { in: [5, 6, 7, 10] },
                // startedAt: { not: null }, // REMOVED to include null startedAt
                finishedAt: { not: null }
            },
            select: { startedAt: true, finishedAt: true },
            orderBy: { finishedAt: 'desc' }, // CRITICAL: Get MOST RECENT repairs to reflect current performance
            take: 50 // Limit sample size for performance
        });

        let avgTimeMinutes = 0;
        if (repairsWithTime.length > 0) {
            const totalMinutes = repairsWithTime.reduce((acc, r) => {
                let minutes = 0;

                if (r.startedAt && r.finishedAt) {
                    const diff = new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
                    minutes = diff / 1000 / 60;
                }

                // Si la reparación es menor a 1 minuto (error de tracking o muy rápida), tratarla como 15 minutos
                const effectiveMinutes = (!minutes || minutes < 1) ? 15 : minutes;

                return acc + effectiveMinutes;
            }, 0);
            avgTimeMinutes = Math.round(totalMinutes / repairsWithTime.length);
        }

        const hours = Math.floor(avgTimeMinutes / 60);
        const mins = avgTimeMinutes % 60;
        const avgRepairTime = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;


        return {
            pendingTickets: pendingRepairsCount,
            activeRepairs: activeRepairsCount,
            completedToday,
            completedMonth,
            avgRepairTime,

            qualityScore,
            onTimeRate,
            stagnatedRepairs,
            completedLastMonth,
            statusDistribution,
            activeWorkspace,
            queue,
            weeklyOutput
        };
    } catch (error) {
        console.error("Error fetching technician stats:", error);
        return {
            pendingTickets: 0, activeRepairs: 0, completedToday: 0, completedMonth: 0,
            avgRepairTime: "0 min", statusDistribution: [], activeWorkspace: [], queue: [], weeklyOutput: [],
            qualityScore: 0, onTimeRate: 0, stagnatedRepairs: []
        };
    }
}

export async function getBranchMaxWorkload(branchId?: string) {
    try {
        // Fetch ALL Active (3) and Paused (4) repairs
        const activeRepairs = await prisma.repair.findMany({
            where: {
                ...(branchId ? { branchId } : {}),
                statusId: { in: [3, 4] },
                estimatedTime: { not: null, gt: 0 }
            },
            select: {
                id: true,
                ticketNumber: true,
                startedAt: true,
                estimatedTime: true,
                statusId: true
            }
        });

        if (activeRepairs.length === 0) {
            return {
                id: "idle",
                ticketNumber: "IDLE",
                startedAt: null,
                estimatedTime: 0
            };
        }

        // Calculate Total Remaining Minutes
        let totalRemainingMinutes = 0;
        const now = new Date();

        activeRepairs.forEach(r => {
            if (r.statusId === 4) {
                // Paused: Add full estimated time
                totalRemainingMinutes += (r.estimatedTime || 0);
            } else if (r.statusId === 3) {
                // In Progress: Add remaining time (Estimate - Elapsed)
                if (r.startedAt) {
                    const elapsedMs = now.getTime() - new Date(r.startedAt).getTime();
                    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                    const remaining = Math.max(0, (r.estimatedTime || 0) - elapsedMinutes);
                    totalRemainingMinutes += remaining;
                } else {
                    totalRemainingMinutes += (r.estimatedTime || 0);
                }
            }
        });

        const hasRunningRepairs = activeRepairs.some(r => r.statusId === 3);

        // Return a "Synthetic" Repair representing the total workload
        // If NO running repairs (all paused), startedAt = null (Static display)
        // If YES running repairs, startedAt = NOW (Counts down from estimatedTime)

        return {
            id: "global_workload",
            ticketNumber: "GLOBAL",
            startedAt: hasRunningRepairs ? new Date() : null,
            estimatedTime: totalRemainingMinutes
        };

    } catch (error) {
        console.error("Error fetching max workload:", error);
        return {
            id: "error",
            ticketNumber: "ERROR",
            startedAt: null,
            estimatedTime: 0
        };
    }
}

export async function getTechniciansWorkload(branchId?: string) {
    try {
        // 1. Get all technicians
        const technicians = await prisma.user.findMany({
            where: {
                role: "TECHNICIAN",
                ...(branchId
                    ? {
                        OR: [
                            { branchId },
                            { branchId: null }
                        ]
                    }
                    : {}
                )
            },
            select: {
                id: true,
                name: true,
                isOnline: true,
                lastActiveAt: true
            }
        });

        // 2. Calculate workload for each
        const workloads = await Promise.all(technicians.map(async (tech) => {
            // Check if session expired (> 4 hours)
            let isOnline = tech.isOnline;
            const now = new Date();
            if (isOnline && tech.lastActiveAt) {
                const diffMs = now.getTime() - new Date(tech.lastActiveAt).getTime();
                const minutes = diffMs / (1000 * 60);
                if (minutes > 8) {
                    isOnline = false; // Sin heartbeat en los últimos 8 min = offline real
                }
            }

            // Get active repairs
            const activeRepairs = await prisma.repair.findMany({
                where: {
                    assignedUserId: tech.id,
                    statusId: { in: [3, 4] }, // In Progress or Paused
                    estimatedTime: { not: null, gt: 0 }
                },
                select: {
                    startedAt: true,
                    estimatedTime: true,
                    statusId: true
                }
            });

            let totalMinutes = 0;

            activeRepairs.forEach(r => {
                if (r.statusId === 4) {
                    // Paused
                    totalMinutes += (r.estimatedTime || 0);
                } else if (r.statusId === 3) {
                    // Running
                    if (r.startedAt) {
                        const elapsedMs = now.getTime() - new Date(r.startedAt).getTime();
                        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                        const remaining = Math.max(0, (r.estimatedTime || 0) - elapsedMinutes);
                        totalMinutes += remaining;
                    } else {
                        totalMinutes += (r.estimatedTime || 0);
                    }
                }
            });

            return {
                id: tech.id,
                name: tech.name,
                isOnline,
                workload: totalMinutes
            };
        }));

        return JSON.parse(JSON.stringify(workloads));

    } catch (error) {
        console.error("Error fetching technicians workload:", error);
        return [];
    }
}
