"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange, getMonthlyRange, getLastDaysRange, getArgentinaDate, TIMEZONE } from "@/lib/date-utils";
import { getCurrentUser } from "@/actions/auth-actions";
import { formatInTimeZone } from "date-fns-tz";


export async function getTechnicianStats(technicianId: string) {
    try {
        const caller = await getCurrentUser();
        if (!caller) return null;
        // Only the technician themselves or an admin can view these stats
        if (caller.role !== "ADMIN" && caller.id !== technicianId) return null;

        const { start: todayStart, end: todayEnd } = getDailyRange();
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange();
        const { start: sevenDaysStart } = getLastDaysRange(6);
        const { start: thirtyDaysStart } = getLastDaysRange(30);

        // Last month range using AR timezone (same pattern as getSalesAnalytics)
        const nowAr = getArgentinaDate();
        const lastMonthAr = new Date(nowAr.getFullYear(), nowAr.getMonth() - 1, 1);
        const lastMonthStr = lastMonthAr.toISOString().split('T')[0];
        const { start: lastMonthStart, end: lastMonthEnd } = getMonthlyRange(lastMonthStr);

        const FINAL_STATUSES = [5, 6, 7, 10];

        // Cuenta tickets únicos donde el técnico transicionó de no-final → final dentro del rango.
        // Garantiza: 1 ticket = 1 conteo por día, sin importar rebotes ni que el `finishedAt` quede stale.
        const countCompletedTickets = async (gte: Date, lte?: Date) => {
            const events = await prisma.repairStatusHistory.findMany({
                where: {
                    userId: technicianId,
                    toStatusId: { in: FINAL_STATUSES },
                    fromStatusId: { notIn: FINAL_STATUSES },
                    createdAt: lte ? { gte, lte } : { gte }
                },
                select: { repairId: true }
            });
            return new Set(events.map(e => e.repairId)).size;
        };

        // 1. Fetch Key Counts and Distributions
        const [pendingRepairsCount, activeRepairsCount, completedToday, completedMonth, statusDist, completedLastMonth] = await Promise.all([
            // En Cola: solo planificadas/pausadas (status 4). Status 1 (PENDING) y 2 (CLAIMED, retirada del local) NO cuentan para el técnico hasta que asigna tiempo.
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: 4 } }),
            prisma.repair.count({ where: { assignedUserId: technicianId, statusId: 3 } }), // En Mesa
            countCompletedTickets(todayStart, todayEnd),
            countCompletedTickets(firstDayOfMonth, lastDayOfMonth),
            prisma.repair.groupBy({ by: ['statusId'], where: { assignedUserId: technicianId, statusId: { notIn: [1, 2] } }, _count: { _all: true } }),
            countCompletedTickets(lastMonthStart, lastMonthEnd)
        ]);

        // Performance Metrics (últimos 30 días) — basadas en eventos reales de finalización
        const finalEvents30 = await prisma.repairStatusHistory.findMany({
            where: {
                userId: technicianId,
                toStatusId: { in: FINAL_STATUSES },
                fromStatusId: { notIn: FINAL_STATUSES },
                createdAt: { gte: thirtyDaysStart }
            },
            select: { repairId: true, createdAt: true }
        });
        // Primer evento de finalización por ticket (dedupe)
        const firstFinalByRepair = new Map<string, Date>();
        for (const e of finalEvents30) {
            const prev = firstFinalByRepair.get(e.repairId);
            if (!prev || e.createdAt < prev) firstFinalByRepair.set(e.repairId, e.createdAt);
        }
        const finishedLast30 = firstFinalByRepair.size > 0
            ? await prisma.repair.findMany({
                where: { id: { in: Array.from(firstFinalByRepair.keys()) } },
                select: {
                    id: true,
                    promisedAt: true,
                    warrantyRepairs: { select: { id: true } }
                }
            })
            : [];

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
        const warrantyReturns = finishedLast30.filter(r => r.warrantyRepairs.length > 0).length;
        const qualityScore = totalFinished30 > 0
            ? Math.round(((totalFinished30 - warrantyReturns) / totalFinished30) * 100)
            : 100;

        // 2. On-Time Rate: comparar la fecha REAL de finalización (primer evento) vs promisedAt
        const onTimeRepairs = finishedLast30.filter(r => {
            const finishedAt = firstFinalByRepair.get(r.id);
            if (!finishedAt || !r.promisedAt) return true;
            return finishedAt <= new Date(r.promisedAt);
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

        // 3. Queue (solo planificadas — status 4). Status 1/2 no son trabajo del técnico.
        const queueRaw = await prisma.repair.findMany({
            where: {
                assignedUserId: technicianId,
                statusId: 4
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

        // 4. Weekly Output Chart — eventos de finalización del técnico en últimos 7 días, dedupe por (ticket, día AR).
        const weeklyEvents = await prisma.repairStatusHistory.findMany({
            where: {
                userId: technicianId,
                toStatusId: { in: FINAL_STATUSES },
                fromStatusId: { notIn: FINAL_STATUSES },
                createdAt: { gte: sevenDaysStart }
            },
            select: { repairId: true, createdAt: true }
        });

        // Día en zona AR para evitar desfase por TZ del servidor
        const dayKey = (d: Date) => formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        const seenPerDay = new Set<string>(); // key: `${repairId}|${dayKey}` → cuenta una sola vez por día
        const countsByDayKey = new Map<string, number>();
        for (const e of weeklyEvents) {
            const dk = dayKey(e.createdAt);
            const k = `${e.repairId}|${dk}`;
            if (seenPerDay.has(k)) continue;
            seenPerDay.add(k);
            countsByDayKey.set(dk, (countsByDayKey.get(dk) || 0) + 1);
        }

        // Construir últimos 7 días en orden cronológico (oldest → today)
        const weeklyOutput: { name: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dk = formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
            const dayIdx = Number(formatInTimeZone(d, TIMEZONE, "i")) % 7; // 1=Mon..7=Sun → mod7 → 0=Sun
            weeklyOutput.push({ name: days[dayIdx], count: countsByDayKey.get(dk) || 0 });
        }


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