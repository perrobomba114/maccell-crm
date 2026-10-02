import { formatArgentinaDate, getMonthlyRange } from "./date-utils";

/** Twelve complete calendar months; the current partial month is excluded. */
export function getVendorPrizeRange(now = new Date()) {
    const currentDate = formatArgentinaDate(now);
    const [year, month] = currentDate.split("-").map(Number);
    return {
        start: getMonthlyRange(`${year - 1}-${String(month).padStart(2, "0")}-01`).start,
        endExclusive: getMonthlyRange(currentDate).start,
    };
}

export function calculateVendorPrize(currentMonthTotal: number, previousTwelveMonthsTotal: number) {
    const monthlyAverage = previousTwelveMonthsTotal / 12;
    if (!Number.isFinite(monthlyAverage) || monthlyAverage <= 0 || !Number.isFinite(currentMonthTotal)) {
        return { monthlyAverage: null, currentMonthTotal, remainingPercent: null, achieved: false };
    }
    const remaining = Math.max(0, monthlyAverage - currentMonthTotal);
    return {
        monthlyAverage,
        currentMonthTotal,
        // Round upward so a small outstanding amount never appears as an achieved target.
        remainingPercent: Math.min(100, Math.ceil((remaining / monthlyAverage) * 1000) / 10),
        achieved: currentMonthTotal >= monthlyAverage,
    };
}

export type VendorPrize = ReturnType<typeof calculateVendorPrize>;
