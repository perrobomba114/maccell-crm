"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";


export async function getRepairAnalytics(branchId?: string, date?: Date) {
    try {
        const caller = await getCurrentUser();
        if (!caller || (caller.role !== "ADMIN" && caller.role !== "VENDOR")) return { repairs: { active: 0, technicians: [], frequentParts: [], monthlyStatusDistribution: [] } };
        // Vendors can only see their own branch
        const resolvedBranchId = caller.role === "VENDOR" ? (caller.branch?.id ?? branchId) : branchId;
        const branchFilter = resolvedBranchId ? { branchId: resolvedBranchId } : {};

        // Handle optional input date for "Reference Month"
        // If date is provided, use it to get that month's range. Else current month.
        const referenceDateString = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateString);

        // Tomorrow check implies "Active" logic usually relative to "Now"
        const tomorrow = new Date(); // Use UTC "Now" for simplified "is future" check
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Parallel Fetching (Independent Queries)
        const [repairsActive, techUsers, partsStats, repairsByStatusRaw, allStatuses, warrantiesCount] = await Promise.all([
            // Active Repairs (Pending, Claimed, In Progress, Paused)
            prisma.repair.findMany({
                where: { ...branchFilter, statusId: { in: [1, 2, 3, 4] } },
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
        const techIds = techUsers.map(u => u.id);
        const [activeTechRepairs, finishedEvents, partsDetails] = await Promise.all([
            // Carga activa actual (para barra de tiempo restante por técnico)
            prisma.repair.findMany({
                where: {
                    assignedUserId: { in: techIds },
                    statusId: { in: [3, 4] },
                    ...branchFilter
                },
                select: { assignedUserId: true, statusId: true, estimatedTime: true, startedAt: true }
            }),
            // Tickets reparados por técnico ESTE MES — eventos reales no-final → final, dedupe por (repairId, técnico)
            prisma.repairStatusHistory.findMany({
                where: {
                    userId: { in: techIds },
                    toStatusId: { in: [5, 6, 7, 10] },
                    fromStatusId: { notIn: [5, 6, 7, 10] },
                    createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
                    ...(resolvedBranchId ? { repair: { branchId: resolvedBranchId } } : {})
                },
                select: { userId: true, repairId: true }
            }),
            prisma.sparePart.findMany({
                where: { id: { in: partsStats.map(p => p.sparePartId) } },
                select: { id: true, name: true, stockLocal: true }
            })
        ]);

        // 3. Processing
        const activeRepairsCount = repairsActive.length;
        const highPriorityCount = repairsActive.filter(r => r.promisedAt && new Date(r.promisedAt) < tomorrow).length;

        // Tickets reparados por técnico (1 por ticket, sin importar cuántas transiciones hizo)
        const finishedTicketsByTech = new Map<string, Set<string>>();
        for (const ev of finishedEvents) {
            if (!ev.userId) continue;
            const set = finishedTicketsByTech.get(ev.userId) ?? new Set<string>();
            set.add(ev.repairId);
            finishedTicketsByTech.set(ev.userId, set);
        }

        const now = new Date();
        const topTechnicians = techUsers.map(user => {
            const finishedSet = finishedTicketsByTech.get(user.id);
            const count = finishedSet ? finishedSet.size : 0;
            const userActive = activeTechRepairs.filter(r => r.assignedUserId === user.id);
            let remainingLoad = 0;
            userActive.forEach(r => {
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
            return { id: user.id, name: user.name, repairs: count, time: remainingLoad, percent: 0 };
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

        return workloads;

    } catch (error) {
        console.error("Error fetching technicians workload:", error);
        return [];
    }
}
