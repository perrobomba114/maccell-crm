"use server";

import { db as prisma } from "@/lib/db";

// Admin Dashboard Stats - Unified Executive Version
export async function getAdminStats(branchId?: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const branchFilter = branchId ? { branchId } : {};

        // 1. Basic Counts
        const [totalSalesCount] = await Promise.all([
            prisma.sale.count({ where: branchFilter }),
        ]);

        // 2. Financials (Current Month)
        const salesCurrentMonth = await prisma.sale.findMany({
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
        });

        // 3. Financials (Last Month)
        const salesLastMonth = await prisma.sale.findMany({
            where: {
                ...branchFilter,
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd } // Strictly last month
            },
            select: { total: true }
        });
        const lastMonthRevenue = salesLastMonth.reduce((acc, curr) => acc + curr.total, 0);

        // Calculate Current Month Metrics
        let revenue = 0;
        let cost = 0;
        const categoryMap = new Map<string, number>();

        salesCurrentMonth.forEach(sale => {
            revenue += sale.total;
            sale.items.forEach((item: any) => {
                let itemCost = 0;
                let catName = "Otros";

                if (item.repair) {
                    // It's a Repair
                    catName = "Servicio Técnico";
                    // Calculate cost from spare parts used
                    if (item.repair.parts && item.repair.parts.length > 0) {
                        itemCost = item.repair.parts.reduce((sum: number, part: any) => {
                            // Assuming priceArg is the cost as discussed
                            return sum + (part.sparePart?.priceArg || 0) * part.quantity;
                        }, 0);
                    }
                } else {
                    // It's a Product
                    itemCost = item.product?.costPrice || 0;
                    catName = item.product?.category?.name || "Otros";
                }

                // If item has quantity > 1 (rare for repairs but possible for products)
                // For repairs, the cost calculated above is total for the repair (parts), 
                // but item.quantity in SaleItem for repair is usually 1. 
                // If SaleItem quantity > 1, we multiply cost.
                cost += itemCost * item.quantity;

                // Profit per category
                // For repairs: item.price is the Service Price. itemCost is the Spare Part cost.
                const profit = (item.price - itemCost) * item.quantity;

                if (profit > 0) {
                    categoryMap.set(catName, (categoryMap.get(catName) || 0) + profit);
                }
            });
        });

        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const salesGrowth = lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

        // 4. Stock Health Metrics
        const stockItems = await prisma.productStock.findMany({
            where: branchFilter,
            select: { quantity: true }
        });
        const totalStockItems = stockItems.length;
        const criticalStockItems = stockItems.filter(s => s.quantity <= 3).length;
        // If 0 items, health is 100%.
        const stockHealth = totalStockItems > 0
            ? ((totalStockItems - criticalStockItems) / totalStockItems) * 100
            : 100;


        // 5. Active Repairs & Priority
        const repairsActive = await prisma.repair.findMany({
            where: {
                ...branchFilter,
                statusId: { notIn: [10] } // 10 = Delivered
            },
            select: { promisedAt: true, statusId: true }
        });

        const activeRepairsCount = repairsActive.length;
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const highPriorityCount = repairsActive.filter(r =>
            r.promisedAt && new Date(r.promisedAt) < tomorrow
        ).length;


        // 6. Category Share
        const categoryShare = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);


        // 7. Top Technicians


        // 8. Top Technicians (Corrected to include ALL technicians)
        const techUsers = await prisma.user.findMany({
            where: {
                role: 'TECHNICIAN',
                // Removed branchId filter to include global technicians (like Alejandro)
            },
            select: { id: true, name: true }
        });

        // Fetch detailed repairs to calculate REAL-TIME remaining workload
        const detailedTechRepairs = await prisma.repair.findMany({
            where: {
                assignedUserId: { in: techUsers.map(u => u.id) },
                OR: [
                    { statusId: { in: [3, 4] } }, // Active (Started) or Paused (Planned)
                    {
                        statusId: { in: [5, 6, 7, 10] }, // Completed (This month)
                        updatedAt: { gte: firstDayOfMonth }
                    }
                ],
                ...(branchId ? { branchId } : {})
            },
            select: {
                assignedUserId: true,
                statusId: true,
                estimatedTime: true,
                startedAt: true
            }
        });

        const topTechnicians = techUsers.map(user => {
            const userRepairs = detailedTechRepairs.filter(r => r.assignedUserId === user.id);

            // 1. Calculate Count (Total Throughput + Active Load)
            const count = userRepairs.length;

            // 2. Calculate Remaining Time (Load)
            let remainingLoad = 0;
            const now = new Date();

            userRepairs.forEach(r => {
                if (r.statusId === 4) {
                    // Paused/Planned: Full estimated time counts as load
                    remainingLoad += (r.estimatedTime || 0);
                } else if (r.statusId === 3) {
                    // In Progress: Remaining time = Estimated - Elapsed
                    if (r.startedAt && r.estimatedTime) {
                        const elapsedMs = now.getTime() - new Date(r.startedAt).getTime();
                        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                        const remaining = Math.max(0, r.estimatedTime - elapsedMinutes);
                        remainingLoad += remaining;
                    } else {
                        // Fallback if missing data, assume full time
                        remainingLoad += (r.estimatedTime || 0);
                    }
                }
                // Completed repairs (5, 6, 7, 10) contribute 0 to "Remaining Load"
            });

            return {
                name: user.name,
                repairs: count,
                time: remainingLoad, // This is now "Remaining Minutes"
                percent: 0
            };
        }).sort((a, b) => b.repairs - a.repairs); // Sort by count, or maybe by time? User didn't specify, stick to repairs count for rank.

        const maxRepairs = topTechnicians.length > 0 ? topTechnicians[0].repairs : 0;
        topTechnicians.forEach(t => t.percent = maxRepairs > 0 ? (t.repairs / maxRepairs) * 100 : 0);


        // 8. Stock Alerts List
        const stockAlertsRaw = await prisma.productStock.findMany({
            where: {
                ...branchFilter,
                quantity: { lte: 3 }
            },
            include: {
                product: { select: { name: true } },
                branch: { select: { name: true } }
            },
            take: 10,
            orderBy: { quantity: 'asc' }
        });
        const stockAlerts = stockAlertsRaw.map(s => ({
            productName: s.product.name,
            branchName: s.branch.name,
            quantity: s.quantity
        }));


        // 9. Top Products
        const productMap = new Map<string, number>();
        salesCurrentMonth.forEach(sale => {
            sale.items.forEach((item: any) => {
                productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
            });
        });
        const topProducts = Array.from(productMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 10. Spare Parts stats 
        // Requires join with RepairPart -> SparePart
        const partsStats = await prisma.repairPart.groupBy({
            by: ['sparePartId'],
            where: {
                repair: branchFilter // This works in newer prisma
            },
            _count: { _all: true }, // usage count
            orderBy: { _count: { sparePartId: 'desc' } },
            take: 10
        });
        // Fetch part details
        const partIds = partsStats.map(p => p.sparePartId);
        const partsDetails = await prisma.sparePart.findMany({
            where: { id: { in: partIds } },
            select: { id: true, name: true, stockLocal: true }
        });
        const frequentParts = partsStats.map(p => {
            const detail = partsDetails.find(d => d.id === p.sparePartId);
            return {
                name: detail?.name || "Unknown Part",
                usage: p._count._all,
                stock: detail?.stockLocal || 0
            };
        });


        // 11. Recent Sales (Rich Data for Dashboard Tables)
        const recentSales = await prisma.sale.findMany({
            where: {
                ...branchFilter,
                createdAt: { gte: firstDayOfMonth }
            },
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
            customerName: "Cliente Final", // Placeholder as not in schema
            total: sale.total,
            branchName: sale.branch?.name || "Sucursal",
            createdAt: sale.createdAt,
            // Determine "Main Category" of the sale for filtering
            category: sale.items[0]?.repair ? "Servicio Técnico" : sale.items[0]?.product?.category?.name || "Otros",
            itemCount: sale.items.length
        }));

        // Return Unified Structure
        return {
            financials: {
                revenue,
                profit,
                salesGrowth,
                profitMargin
            },
            tables: { // Added this section
                recentSales: formattedRecentSales
            },
            repairs: {
                active: activeRepairsCount,
                highPriority: highPriorityCount,
                technicians: topTechnicians,
                frequentParts
            },
            stock: {
                health: stockHealth,
                criticalCount: criticalStockItems,
                alerts: stockAlerts,
                topSold: topProducts
            },
            categoryShare: {
                total: profit,
                segments: categoryShare
            }
        };

    } catch (error) {
        console.error("[Unified Dashboard] Error:", error);
        return {
            financials: { revenue: 0, profit: 0, salesGrowth: 0, profitMargin: 0 },
            repairs: { active: 0, highPriority: 0, technicians: [], frequentParts: [] },
            stock: { health: 0, criticalCount: 0, alerts: [], topSold: [] },
            categoryShare: { total: 0, segments: [] }
        };
    }
}

// Vendor and Technician Stats - RESTORED
export async function getVendorStats(vendorId: string, branchId?: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const branchFilter = branchId ? { branchId } : {};

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
                    createdAt: { gte: today }
                }
            })
        ]);

        const [salesMonthCount, salesMonthTotal, salesTodayCount] = await salesPromise;

        // 2. Repairs Intakes (Month) - "Equipos recibidos"
        // This is usually repairs CREATED by this vendor (userId is the creator)
        const repairsIntakeMonth = await prisma.repair.count({
            where: {
                userId: vendorId,
                createdAt: { gte: firstDayOfMonth }
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
        repairSales.forEach(sale => {
            sale.items.forEach(item => {
                repairRevenue += item.price * item.quantity;
            });
        });


        // 4. "Para Retirar" (Ready for Pickup)
        // This is relevant for the BRANCH, not just the vendor, so any vendor can hand it over.
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
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const salesLast7 = await prisma.sale.findMany({
            where: {
                OR: [
                    { vendorId },
                    { branchId, saleNumber: { startsWith: 'H' } }
                ],
                createdAt: { gte: sevenDaysAgo }
            },
            select: { createdAt: true, total: true }
        });

        const weeklyOutputMap = new Map<string, number>();
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        // Fill 0s
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dayName = days[d.getDay()];
            weeklyOutputMap.set(dayName, 0);
        }

        salesLast7.forEach(sale => {
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


        return {
            salesMonthCount: salesMonthCount,
            salesMonthTotal: salesMonthTotal._sum.total || 0,
            repairsIntakeMonth,
            repairRevenueMonth: repairRevenue,
            readyForPickup,
            topSellingProducts,
            salesLast7Days,
            recentActivity
        };

    } catch (error) {
        console.error("Error getVendorStats:", error);
        return {
            salesMonthCount: 0,
            salesMonthTotal: 0,
            repairsIntakeMonth: 0,
            repairRevenueMonth: 0,
            readyForPickup: [],
            topSellingProducts: [],
            salesLast7Days: [],
            recentActivity: []
        };
    }
}

export async function getTechnicianStats(technicianId: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // 1. Fetch Key Counts and Distributions
        const [pendingRepairsCount, activeRepairsCount, completedToday, completedMonth, statusDist] = await Promise.all([
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [1, 2, 4] } } }), // Pending, Assigned, Diagnosing
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: 3 } }), // In Progress
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [5, 6, 7, 10] }, updatedAt: { gte: today } } }),
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: { in: [5, 6, 7, 10] }, updatedAt: { gte: firstDayOfMonth } } }),
            prisma.repair.groupBy({ by: ['statusId'], where: { assignedUserId: technicianId }, _count: { _all: true } })
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

        // 2. Active Workspace (Detailed)
        // Fetch items strictly In Progress (3) OR Paused/Planned (4)
        const activeWorkspaceRaw = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: { in: [3, 4] }
            },
            include: {
                status: true
            },
            orderBy: { updatedAt: 'desc' } // Order by recent activity so newly assigned appear top
        });

        const activeWorkspace = activeWorkspaceRaw.map(r => ({
            id: r.id,
            ticketNumber: r.ticketNumber,
            device: `${r.deviceBrand} ${r.deviceModel}`,
            problem: r.problemDescription,
            startedAt: r.startedAt || r.updatedAt, // Fallback if startedAt is null
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
                status: true
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
            take: 10
        });

        const queue = queueRaw.map(r => ({
            id: r.id,
            ticketNumber: r.ticketNumber,
            device: `${r.deviceBrand} ${r.deviceModel}`,
            problem: r.problemDescription,
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
                updatedAt: { gte: sevenDaysAgo }
            },
            select: { updatedAt: true }
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
            const dayName = days[new Date(r.updatedAt).getDay()];
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
                startedAt: { not: null },
                finishedAt: { not: null }
            },
            select: { startedAt: true, finishedAt: true },
            take: 50 // Limit sample size for performance
        });

        let avgTimeMinutes = 0;
        if (repairsWithTime.length > 0) {
            const totalMinutes = repairsWithTime.reduce((acc, r) => {
                const diff = new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime();
                return acc + (diff / 1000 / 60);
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
            statusDistribution,
            activeWorkspace,
            queue,
            weeklyOutput
        };
    } catch (error) {
        console.error("Error fetching technician stats:", error);
        return {
            pendingTickets: 0, activeRepairs: 0, completedToday: 0, completedMonth: 0,
            avgRepairTime: "0 min", statusDistribution: [], activeWorkspace: [], queue: [], weeklyOutput: []
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
                const hours = diffMs / (1000 * 60 * 60);
                if (hours > 4) {
                    isOnline = false; // Effectively offline
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
