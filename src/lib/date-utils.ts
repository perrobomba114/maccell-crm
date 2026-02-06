import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from "date-fns";

export const TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Returns the current date/time in Argentina Timezone, as a Date object (system time equivalent).
 * Useful for logging or displaying "Now" in UI references.
 */
export function getArgentinaDate(): Date {
    return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Returns a UTC Date Range (start, end) that corresponds to the full day in Argentina Timezone.
 * Example: Input "2026-02-01" -> 
 * Returns { 
 *   start: 2026-02-01 03:00:00 UTC, 
 *   end: 2026-02-02 02:59:59.999 UTC 
 * }
 * 
 * @param dateStr Optional YYYY-MM-DD string. Defaults to Today (AR time).
 */
export function getDailyRange(dateStr?: string) {
    // If no date provided, get "Today" in AR
    const referenceStr = dateStr || formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

    const start = fromZonedTime(`${referenceStr} 00:00:00`, TIMEZONE);
    const end = fromZonedTime(`${referenceStr} 23:59:59.999`, TIMEZONE);

    return { start, end };
}

/**
 * Returns a UTC Date Range for the entire Month of the given date (in AR context).
 */
export function getMonthlyRange(dateStr?: string) {
    const referenceStr = dateStr || formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const [year, month] = referenceStr.split('-').map(Number); // Month is 1-12 here if from string, or handled carefully below

    // We can rely on string construction for safety
    // First day: YYYY-MM-01 00:00:00 AR
    const start = fromZonedTime(`${year}-${String(month).padStart(2, '0')}-01 00:00:00`, TIMEZONE);

    // Last day: tricky without date math, let's use JS Date for day calc
    // "Day 0" of next month is last day of current
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const end = fromZonedTime(`${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth} 23:59:59.999`, TIMEZONE);

    return { start, end };
}

/**
 * Returns a UTC Range for the "Last X Days" ending Yesterday/Today in AR time.
 * @param days Number of past days (e.g. 7)
 */
export function getLastDaysRange(days: number) {
    const todayArStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const todayAr = new Date(todayArStr); // Naive local date for math

    const startAr = subDays(todayAr, days); // Go back X days
    // We want start of that day (00:00 AR)
    const startStr = startAr.toISOString().split('T')[0];
    const start = fromZonedTime(`${startStr} 00:00:00`, TIMEZONE);

    // End is "Now" or End of Today
    // Usually for stats we want up to *Now*
    const end = new Date(); // Current UTC is fine as upper bound 

    return { start, end };
}
