type JsonObject = Record<string, unknown>;

export type StockDiscrepancyDisplay = {
    productName: string;
    sku: string;
    branchName: string;
    currentQuantity: number;
    proposedQuantity: number;
    adjustment: number;
    reporterName: string;
};

export type RepairEntryDisplay = {
    promisedDate: string;
    promisedTime: string;
};

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string) {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getStockDiscrepancyDisplay(actionData: unknown): StockDiscrepancyDisplay | null {
    if (!isJsonObject(actionData) || actionData.type !== "STOCK_DISCREPANCY") {
        return null;
    }

    return {
        productName: readString(actionData.productName, "Producto sin nombre"),
        sku: readString(actionData.sku, "Sin SKU"),
        branchName: readString(actionData.branchName, "Sucursal sin informar"),
        currentQuantity: readNumber(actionData.currentQuantity),
        proposedQuantity: readNumber(actionData.proposedQuantity),
        adjustment: readNumber(actionData.adjustment),
        reporterName: readString(actionData.reporterName, "Usuario"),
    };
}

export function getRepairEntryDisplay(actionData: unknown): RepairEntryDisplay | null {
    if (!isJsonObject(actionData)) return null;

    const promisedDate = readString(actionData.promisedDate, "");
    const promisedTime = readString(actionData.promisedTime, "");

    if (!promisedDate || !promisedTime) return null;

    return { promisedDate, promisedTime };
}
