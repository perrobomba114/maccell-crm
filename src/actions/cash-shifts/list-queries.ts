"use server";

import { db as prisma } from "@/lib/db";
import { getDailyRange } from "@/lib/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import { enrichShiftsOptimized, CashShiftWithDetails } from "./enrich-utils";

const TIMEZONE = "America/Argentina/Buenos_Aires";

export async function getCashShifts(
    date?: Date,
    branchId?: string
): Promise<CashShiftWithDetails[]> {
    try {
        const whereClause: any = {};

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (date) {
            const dateStr = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
            const { start, end } = getDailyRange(dateStr);

            whereClause.startTime = {
                gte: start,
                lte: end
            };
        }

        const shifts = await prisma.cashShift.findMany({
            where: whereClause,
            include: {
                branch: { select: { name: true } },
                user: { select: { name: true } }
            },
            orderBy: {
                startTime: 'desc'
            }
        });

        if (shifts.length === 0) return [];

        let minTime = shifts[0].startTime;
        let maxTime = shifts[0].endTime || new Date();
        for (const s of shifts) {
            if (s.startTime < minTime) minTime = s.startTime;
            if (s.endTime && s.endTime > maxTime) maxTime = s.endTime;
        }

        return await enrichShiftsOptimized(shifts, minTime, maxTime, branchId);

    } catch (error) {
        console.error("Error fetching cash shifts:", error);
        return [];
    }
}

export async function getCashShiftById(shiftId: string): Promise<CashShiftWithDetails | null> {
    try {
        const shift = await prisma.cashShift.findUnique({
            where: { id: shiftId },
            include: {
                branch: { select: { name: true } },
                user: { select: { name: true } }
            }
        });

        if (!shift) return null;

        const enriched = await enrichShiftsOptimized([shift], shift.startTime, shift.endTime || new Date(), shift.branchId);
        return enriched[0] || null;

    } catch (error) {
        console.error("Error fetching shift details:", error);
        return null;
    }
}

export async function getDeepCashShiftsForDate(
    date: Date,
    branchId?: string
): Promise<CashShiftWithDetails[]> {
    const dateStr = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
    const { start: startOfDay, end: endOfDay } = getDailyRange(dateStr);

    return await getCashShiftsInRangeOptimized(startOfDay, endOfDay, branchId);
}

export async function getCashShiftsInRangeOptimized(start: Date, end: Date, branchId?: string) {
    const whereClause: any = {
        startTime: { gte: start, lte: end }
    };
    if (branchId && branchId !== "ALL") {
        whereClause.branchId = branchId;
    }

    const shifts = await prisma.cashShift.findMany({
        where: whereClause,
        include: {
            branch: { select: { name: true } },
            user: { select: { name: true } }
        },
        orderBy: { startTime: 'desc' }
    });

    if (shifts.length === 0) return [];

    return await enrichShiftsOptimized(shifts, start, end, branchId);
}
