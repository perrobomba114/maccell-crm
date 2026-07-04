import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { normalizeRepairDateFilter } from "@/lib/repair-date-filter";
import { TIMEZONE } from "@/lib/date-utils";
import { isAdminRepairTicketLookupQuery } from "@/lib/admin-repairs-search-terms";

export const HISTORY_REPAIR_DATE_FILTER = "HISTORY";
export const MONTH_REPAIR_DATE_FILTER = "MONTH";

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

export function resolveAdminRepairDateSelectionForSearch(
    date: string | null | undefined,
    query: string | null | undefined,
    referenceDate: Date = new Date(),
): string {
    const normalized = normalizeRepairDateFilter(date);
    const hasQuery = (query ?? "").trim().length > 0;

    if (isAdminRepairTicketLookupQuery(query)) return "";
    if (hasQuery && !normalized) return "";
    return resolveAdminRepairDateSelection(date, referenceDate);
}

export function resolveAdminRepairDateFilterForSearch(
    date: string | null | undefined,
    query: string | null | undefined,
    referenceDate: Date = new Date(),
): string {
    return resolveAdminRepairDateSelectionForSearch(date, query, referenceDate);
}

export function parseAdminRepairCalendarDate(date: string | null | undefined): Date | undefined {
    const normalized = normalizeRepairDateFilter(date);
    if (!normalized || normalized === HISTORY_REPAIR_DATE_FILTER || normalized === MONTH_REPAIR_DATE_FILTER) {
        return undefined;
    }

    const [year, month, day] = normalized.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatAdminRepairCalendarDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function shiftAdminRepairDateFilter(
    date: string | null | undefined,
    days: number,
    referenceDate: Date = new Date(),
): string {
    const activeDate = resolveAdminRepairDateSelection(date, referenceDate);
    const parsed = parseAdminRepairCalendarDate(activeDate) ?? parseAdminRepairCalendarDate(getTodayRepairDateFilter(referenceDate));
    if (!parsed) return getTodayRepairDateFilter(referenceDate);

    return formatAdminRepairCalendarDate(addDays(parsed, days));
}

export function isDefaultAdminRepairDateFilter(
    date: string | null | undefined,
    referenceDate: Date = new Date(),
): boolean {
    return resolveAdminRepairDateSelection(date, referenceDate) === getTodayRepairDateFilter(referenceDate);
}
