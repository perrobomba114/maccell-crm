"use server";

import * as enrichMod from "./cash-shifts/enrich-utils";
import * as listMod from "./cash-shifts/list-queries";
import * as statsMod from "./cash-shifts/stats-queries";
import * as mutMod from "./cash-shifts/mutations";

export type { CashShiftWithDetails, CashDashboardStats } from "./cash-shifts/enrich-utils";

export async function enrichShiftsOptimized(...args: Parameters<typeof enrichMod.enrichShiftsOptimized>) {
    return enrichMod.enrichShiftsOptimized(...args);
}
export async function getCashShifts(...args: Parameters<typeof listMod.getCashShifts>) {
    return listMod.getCashShifts(...args);
}
export async function getCashShiftById(...args: Parameters<typeof listMod.getCashShiftById>) {
    return listMod.getCashShiftById(...args);
}
export async function getDeepCashShiftsForDate(...args: Parameters<typeof listMod.getDeepCashShiftsForDate>) {
    return listMod.getDeepCashShiftsForDate(...args);
}
export async function getCashShiftsInRangeOptimized(...args: Parameters<typeof listMod.getCashShiftsInRangeOptimized>) {
    return listMod.getCashShiftsInRangeOptimized(...args);
}
export async function getCashDashboardStats(...args: Parameters<typeof statsMod.getCashDashboardStats>) {
    return statsMod.getCashDashboardStats(...args);
}
export async function updateCashShiftDate(...args: Parameters<typeof mutMod.updateCashShiftDate>) {
    return mutMod.updateCashShiftDate(...args);
}
export async function deleteCashShift(...args: Parameters<typeof mutMod.deleteCashShift>) {
    return mutMod.deleteCashShift(...args);
}
