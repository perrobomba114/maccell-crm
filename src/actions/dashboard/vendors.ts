"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";


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
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                }
            }),
            // Total Revenue (Month)
            prisma.sale.aggregate({
                where: {
                    OR: [
                        { vendorId },
                        { branchId, saleNumber: { startsWith: 'H' } }
                    ],
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
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
                createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
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
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
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