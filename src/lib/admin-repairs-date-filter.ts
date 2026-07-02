import { formatInTimeZone } from "date-fns-tz";
import { normalizeRepairDateFilter } from "@/lib/repair-date-filter";
import { TIMEZONE } from "@/lib/date-utils";

export const HISTORY_REPAIR_DATE_FILTER = "HISTORY";

export function getTodayRepairDateFilter(referenceDate: Date = new Date()): string {
    return formatInTimeZone(referenceDate, TIMEZONE, "yyyy-MM-dd");
}

export function resolveAdminRepairDateSelection(
    date: string | null | undefined,
    referenceDate: Date = new Date(),
): string {
    const normalized = normalizeRepairDateFilter(date);
    if (!normalized) return getTodayRepairDateFilter(referenceDate);
    if (normalized.toUpperCase() === HISTORY_REPAIR_DATE_FILTER) return getTodayRepairDateFilter(referenceDate);
    return normalized;
}

export function resolveAdminRepairDateFilter(
    date: string | null | undefined,
    referenceDate: Date = new Date(),
): string {
    return resolveAdminRepairDateSelection(date, referenceDate);
}
