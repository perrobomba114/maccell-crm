"use server";

import * as queriesMod from "./spare-parts/queries";
import * as mutMod from "./spare-parts/mutations";
import * as stockMod from "./spare-parts/stock";
import * as historyMod from "./spare-parts/history";

export type { SparePartImportRow } from "./spare-parts/stock";

export async function getSpareParts(...args: Parameters<typeof queriesMod.getSpareParts>) {
    return queriesMod.getSpareParts(...args);
}
export async function getAllSparePartsForExport(...args: Parameters<typeof queriesMod.getAllSparePartsForExport>) {
    return queriesMod.getAllSparePartsForExport(...args);
}
export async function getSparePartsForBuyReport(...args: Parameters<typeof queriesMod.getSparePartsForBuyReport>) {
    return queriesMod.getSparePartsForBuyReport(...args);
}
export async function createSparePart(...args: Parameters<typeof mutMod.createSparePart>) {
    return mutMod.createSparePart(...args);
}
export async function updateSparePart(...args: Parameters<typeof mutMod.updateSparePart>) {
    return mutMod.updateSparePart(...args);
}
export async function deleteSparePart(...args: Parameters<typeof mutMod.deleteSparePart>) {
    return mutMod.deleteSparePart(...args);
}
export async function updateSparePartsPrices(...args: Parameters<typeof mutMod.updateSparePartsPrices>) {
    return mutMod.updateSparePartsPrices(...args);
}
export async function replenishSparePart(...args: Parameters<typeof stockMod.replenishSparePart>) {
    return stockMod.replenishSparePart(...args);
}
export async function decrementStockLocal(...args: Parameters<typeof stockMod.decrementStockLocal>) {
    return stockMod.decrementStockLocal(...args);
}
export async function bulkUpsertSpareParts(...args: Parameters<typeof stockMod.bulkUpsertSpareParts>) {
    return stockMod.bulkUpsertSpareParts(...args);
}
export async function getSparePartsHistory(...args: Parameters<typeof historyMod.getSparePartsHistory>) {
    return historyMod.getSparePartsHistory(...args);
}
export async function toggleHistoryChecked(...args: Parameters<typeof historyMod.toggleHistoryChecked>) {
    return historyMod.toggleHistoryChecked(...args);
}
export async function syncRepairHistoryAction(...args: Parameters<typeof historyMod.syncRepairHistoryAction>) {
    return historyMod.syncRepairHistoryAction(...args);
}
