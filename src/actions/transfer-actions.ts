"use server";

import * as mutMod from "./transfers/mutations";
import * as queriesMod from "./transfers/queries";
import * as adminMod from "./transfers/admin";

export async function createStockTransfer(...args: Parameters<typeof mutMod.createStockTransfer>) {
    return mutMod.createStockTransfer(...args);
}
export async function respondToTransfer(...args: Parameters<typeof mutMod.respondToTransfer>) {
    return mutMod.respondToTransfer(...args);
}
export async function getPendingTransfers(...args: Parameters<typeof queriesMod.getPendingTransfers>) {
    return queriesMod.getPendingTransfers(...args);
}
export async function getAllTransfersAdmin(...args: Parameters<typeof adminMod.getAllTransfersAdmin>) {
    return adminMod.getAllTransfersAdmin(...args);
}
export async function updateTransferAdmin(...args: Parameters<typeof adminMod.updateTransferAdmin>) {
    return adminMod.updateTransferAdmin(...args);
}
export async function deleteTransferAdmin(...args: Parameters<typeof adminMod.deleteTransferAdmin>) {
    return adminMod.deleteTransferAdmin(...args);
}
