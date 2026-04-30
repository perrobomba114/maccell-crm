"use server";

import * as queriesMod from "./products/queries";
import * as mutMod from "./products/mutations";
import * as stockMod from "./products/stock";

export type { ProductImportRow } from "./products/stock";

export async function getProducts(...args: Parameters<typeof queriesMod.getProducts>) {
    return queriesMod.getProducts(...args);
}
export async function getAllProductsForExport(...args: Parameters<typeof queriesMod.getAllProductsForExport>) {
    return queriesMod.getAllProductsForExport(...args);
}
export async function createProduct(...args: Parameters<typeof mutMod.createProduct>) {
    return mutMod.createProduct(...args);
}
export async function updateProduct(...args: Parameters<typeof mutMod.updateProduct>) {
    return mutMod.updateProduct(...args);
}
export async function deleteProduct(...args: Parameters<typeof mutMod.deleteProduct>) {
    return mutMod.deleteProduct(...args);
}
export async function ensureProductStock(...args: Parameters<typeof stockMod.ensureProductStock>) {
    return stockMod.ensureProductStock(...args);
}
export async function bulkUpsertProducts(...args: Parameters<typeof stockMod.bulkUpsertProducts>) {
    return stockMod.bulkUpsertProducts(...args);
}
