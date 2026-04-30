"use server";

import * as searchMod from "@/actions/repairs/search";
import * as historyMod from "@/actions/repairs/history";
import * as adminListMod from "@/actions/repairs/admin-list";
import * as referenceMod from "@/actions/repairs/reference";
import * as createMod from "@/actions/repairs/create";
import * as updateMod from "@/actions/repairs/update";
import * as takeMod from "@/actions/repairs/take";
import * as deleteMod from "@/actions/repairs/delete";
import * as techStatusMod from "@/actions/repairs/tech-status";
import * as techAssignMod from "@/actions/repairs/tech-assign";
import * as techPartsMod from "@/actions/repairs/tech-parts";
import * as imagesMod from "@/actions/repairs/images";
import * as utilsMod from "@/actions/repairs/utils";

export async function searchWarrantyRepairs(...args: Parameters<typeof searchMod.searchWarrantyRepairs>) {
    return searchMod.searchWarrantyRepairs(...args);
}
export async function searchSparePartsAction(...args: Parameters<typeof searchMod.searchSparePartsAction>) {
    return searchMod.searchSparePartsAction(...args);
}
export async function getActiveRepairsAction(...args: Parameters<typeof historyMod.getActiveRepairsAction>) {
    return historyMod.getActiveRepairsAction(...args);
}
export async function getRepairHistoryAction(...args: Parameters<typeof historyMod.getRepairHistoryAction>) {
    return historyMod.getRepairHistoryAction(...args);
}
export async function getAllRepairsForAdminAction(...args: Parameters<typeof adminListMod.getAllRepairsForAdminAction>) {
    return adminListMod.getAllRepairsForAdminAction(...args);
}
export async function getRepairByIdAction(...args: Parameters<typeof adminListMod.getRepairByIdAction>) {
    return adminListMod.getRepairByIdAction(...args);
}
export async function checkTicketAvailability(...args: Parameters<typeof referenceMod.checkTicketAvailability>) {
    return referenceMod.checkTicketAvailability(...args);
}
export async function getAllStatusesAction(...args: Parameters<typeof referenceMod.getAllStatusesAction>) {
    return referenceMod.getAllStatusesAction(...args);
}
export async function getAllTechniciansAction(...args: Parameters<typeof referenceMod.getAllTechniciansAction>) {
    return referenceMod.getAllTechniciansAction(...args);
}
export async function createRepairAction(...args: Parameters<typeof createMod.createRepairAction>) {
    return createMod.createRepairAction(...args);
}
export async function updateRepairAction(...args: Parameters<typeof updateMod.updateRepairAction>) {
    return updateMod.updateRepairAction(...args);
}
export async function takeRepairAction(...args: Parameters<typeof takeMod.takeRepairAction>) {
    return takeMod.takeRepairAction(...args);
}
export async function deleteRepairAction(...args: Parameters<typeof deleteMod.deleteRepairAction>) {
    return deleteMod.deleteRepairAction(...args);
}
export async function startRepairAction(...args: Parameters<typeof techStatusMod.startRepairAction>) {
    return techStatusMod.startRepairAction(...args);
}
export async function pauseRepairAction(...args: Parameters<typeof techStatusMod.pauseRepairAction>) {
    return techStatusMod.pauseRepairAction(...args);
}
export async function finishRepairAction(...args: Parameters<typeof techStatusMod.finishRepairAction>) {
    return techStatusMod.finishRepairAction(...args);
}
export async function techTakeRepairAction(...args: Parameters<typeof techAssignMod.techTakeRepairAction>) {
    return techAssignMod.techTakeRepairAction(...args);
}
export async function assignTimeAction(...args: Parameters<typeof techAssignMod.assignTimeAction>) {
    return techAssignMod.assignTimeAction(...args);
}
export async function transferRepairAction(...args: Parameters<typeof techAssignMod.transferRepairAction>) {
    return techAssignMod.transferRepairAction(...args);
}
export async function createSinglePartReturnAction(...args: Parameters<typeof techPartsMod.createSinglePartReturnAction>) {
    return techPartsMod.createSinglePartReturnAction(...args);
}
export async function addPartToRepairAction(...args: Parameters<typeof techPartsMod.addPartToRepairAction>) {
    return techPartsMod.addPartToRepairAction(...args);
}
export async function addRepairImagesAction(...args: Parameters<typeof imagesMod.addRepairImagesAction>) {
    return imagesMod.addRepairImagesAction(...args);
}
export async function removeRepairImageAction(...args: Parameters<typeof imagesMod.removeRepairImageAction>) {
    return imagesMod.removeRepairImageAction(...args);
}
export async function calculatePromisedDateAction(...args: Parameters<typeof utilsMod.calculatePromisedDateAction>) {
    return utilsMod.calculatePromisedDateAction(...args);
}
