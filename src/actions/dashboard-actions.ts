"use server";

import * as salesMod from "./dashboard/sales";
import * as repairsMod from "./dashboard/repairs";
import * as vendorsMod from "./dashboard/vendors";
import * as techsMod from "./dashboard/technicians";

export async function getSalesAnalytics(...args: Parameters<typeof salesMod.getSalesAnalytics>) {
    return salesMod.getSalesAnalytics(...args);
}
export async function getRecentTransactions(...args: Parameters<typeof salesMod.getRecentTransactions>) {
    return salesMod.getRecentTransactions(...args);
}
export async function getRepairAnalytics(...args: Parameters<typeof repairsMod.getRepairAnalytics>) {
    return repairsMod.getRepairAnalytics(...args);
}
export async function getBranchMaxWorkload(...args: Parameters<typeof repairsMod.getBranchMaxWorkload>) {
    return repairsMod.getBranchMaxWorkload(...args);
}
export async function getTechniciansWorkload(...args: Parameters<typeof repairsMod.getTechniciansWorkload>) {
    return repairsMod.getTechniciansWorkload(...args);
}
export async function getVendorStats(...args: Parameters<typeof vendorsMod.getVendorStats>) {
    return vendorsMod.getVendorStats(...args);
}
export async function getTechnicianStats(...args: Parameters<typeof techsMod.getTechnicianStats>) {
    return techsMod.getTechnicianStats(...args);
}

export async function getAdminStats(branchId?: string) {
    const [sales, repairs, transactions] = await Promise.all([
        salesMod.getSalesAnalytics(branchId),
        repairsMod.getRepairAnalytics(branchId),
        salesMod.getRecentTransactions(branchId)
    ]);

    return {
        ...sales,
        ...repairs,
        ...transactions
    };
}
