import { printRepairTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";

type PrintRepairTicketInput = NonNullable<Parameters<typeof printRepairTicket>[0]>;

type PrintableRepair = {
    ticketNumber: string;
    branch?: PrintRepairTicketInput["branch"];
    customer?: PrintRepairTicketInput["customer"];
    deviceBrand?: string | null;
    deviceModel?: string | null;
    problemDescription?: string | null;
    isWet?: boolean | null;
    estimatedPrice?: number | null;
    promisedAt?: Date | string | null;
    parts?: {
        quantity?: number | null;
        sparePart?: { name?: string | null } | null;
    }[];
    statusId?: number | null;
    status?: {
        id?: number | null;
        name?: string | null;
    } | null;
};

const FOLLOW_UP_PRINT_DELAY_MS = 900;

function runAfterBrowserDelay(callback: () => void, delayMs: number) {
    if (typeof window === "undefined") return;

    const start = window.performance.now();
    const tick = (timestamp: number) => {
        if (timestamp - start >= delayMs) {
            callback();
            return;
        }

        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
}

function shouldPrintWarrantyTicket(repair: PrintableRepair): boolean {
    return repair.statusId === 10 || repair.status?.id === 10 || repair.status?.name === "Entregado";
}

function buildRepairTicketInput(repair: PrintableRepair): PrintRepairTicketInput {
    return {
        ticketNumber: repair.ticketNumber,
        branch: repair.branch,
        customer: repair.customer,
        deviceBrand: repair.deviceBrand,
        deviceModel: repair.deviceModel,
        problemDescription: repair.problemDescription,
        isWet: repair.isWet,
        estimatedPrice: repair.estimatedPrice,
        promisedAt: repair.promisedAt,
        parts: repair.parts
            ?.filter((part) => typeof part.quantity === "number")
            .map((part) => ({
                quantity: part.quantity ?? 0,
                sparePart: part.sparePart,
            })),
    };
}

function buildWarrantyRepair(repair: PrintableRepair): PrintRepairTicketInput {
    return {
        ticketNumber: repair.ticketNumber,
        deviceBrand: repair.deviceBrand,
        deviceModel: repair.deviceModel,
        customer: repair.customer,
        isWet: repair.isWet,
        branch: repair.branch,
    };
}

export function printRepairTicketSequence(repair: PrintableRepair) {
    printRepairTicket(buildRepairTicketInput(repair));

    if (!shouldPrintWarrantyTicket(repair)) return;

    const warrantyRepair = buildWarrantyRepair(repair);
    runAfterBrowserDelay(() => {
        printWarrantyTicket(warrantyRepair);
        if (repair.isWet) {
            runAfterBrowserDelay(() => printWetReport(warrantyRepair), FOLLOW_UP_PRINT_DELAY_MS);
        }
    }, FOLLOW_UP_PRINT_DELAY_MS);
}
