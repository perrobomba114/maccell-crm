"use server";

import * as searchMod from "@/actions/pos/search";
import * as checkoutMod from "@/actions/pos/checkout";
import * as afipMod from "@/actions/pos/afip-padron";

export type { PosProduct, PosRepair } from "@/actions/pos/search";

export async function searchProductsForPos(...args: Parameters<typeof searchMod.searchProductsForPos>) {
    return searchMod.searchProductsForPos(...args);
}
export async function searchRepairsForPos(...args: Parameters<typeof searchMod.searchRepairsForPos>) {
    return searchMod.searchRepairsForPos(...args);
}
export async function getRepairForPos(...args: Parameters<typeof searchMod.getRepairForPos>) {
    return searchMod.getRepairForPos(...args);
}
export async function processPosSale(...args: Parameters<typeof checkoutMod.processPosSale>) {
    return checkoutMod.processPosSale(...args);
}
export async function getAfipPadronData(...args: Parameters<typeof afipMod.getAfipPadronData>) {
    return afipMod.getAfipPadronData(...args);
}
