import { formatInTimeZone } from "date-fns-tz";
import { getDailyRange, getMonthlyRange, TIMEZONE } from "@/lib/date-utils";

export type RepairDateFilterInput = Date | string | null | undefined;

export type RepairDateRange = {
    start: Date;
    end: Date;
};

export function normalizeRepairDateFilter(date: RepairDateFilterInput): string {
    if (!date) return "";

    if (date instanceof Date) {
        if (Number.isNaN(date.getTime())) return "";
        return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
    }

    const trimmed = date.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return "";
    if (trimmed.toUpperCase() === "MONTH") return "MONTH";
    if (trimmed.toUpperCase() === "HISTORY") return "HISTORY";

    return trimmed.slice(0, 10);
}

export function getRepairDateFilterRange(
    date: RepairDateFilterInput,
    referenceDate: Date = new Date(),
): RepairDateRange | null {
    const normalized = normalizeRepairDateFilter(date);
    if (!normalized) return null;
    if (normalized === "HISTORY") return null;

    if (normalized === "MONTH") {
        const referenceStr = formatInTimeZone(referenceDate, TIMEZONE, "yyyy-MM-dd");
        return getMonthlyRange(referenceStr);
    }

    return getDailyRange(normalized);
}
