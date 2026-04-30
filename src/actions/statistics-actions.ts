"use server";

import * as globalMod from "./statistics/global";
import * as productsMod from "./statistics/products";
import * as branchesMod from "./statistics/branches";
import * as repairsMod from "./statistics/repairs";

export async function getBranchesList(...args: Parameters<typeof globalMod.getBranchesList>) {
    return globalMod.getBranchesList(...args);
}
export async function getGlobalStats(...args: Parameters<typeof globalMod.getGlobalStats>) {
    return globalMod.getGlobalStats(...args);
}
export async function getProductStats(...args: Parameters<typeof productsMod.getProductStats>) {
    return productsMod.getProductStats(...args);
}
export async function getBranchStats(...args: Parameters<typeof branchesMod.getBranchStats>) {
    return branchesMod.getBranchStats(...args);
}
export async function getRepairStats(...args: Parameters<typeof repairsMod.getRepairStats>) {
    return repairsMod.getRepairStats(...args);
}
