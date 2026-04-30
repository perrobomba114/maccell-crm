"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";


export async function getTechnicianStats(technicianId: string) {
    try {
        const caller = await getCurrentUser();
        if (!caller) return null;
        // Only the technician themselves or an admin can view these stats
        if (caller.role !== "ADMIN" && caller.id !== technicianId) return null;

        const { start: todayStart } = getDailyRange();
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange();
        const { start: sevenDaysStart } = getLastDaysRange(6);

        // Last month range using AR timezone (same pattern as getSalesAnalytics)
        const nowAr = getArgentinaDate();
        const lastMonthAr = new Date(nowAr.getFullYear(), nowAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthAr.toISOString().split('T')[0];
        const { start: lastMonthStart, end: lastMonthEnd } = getMonthlyRange(lastMonthStr);

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
            // Completed Last Month for comparison — AR timezone-aware range
            prisma.repair.count({
                where: {
                    assignedUserId: technicianId,
                    statusId: { in: [5, 6, 7, 10] },
                    finishedAt: { gte: lastMonthStart, lte: lastMonthEnd }
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