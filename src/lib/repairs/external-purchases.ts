import { z } from "zod";
import { REPAIR_STATUS } from "./status";

export const externalPurchaseSchema = z.object({
    requestId: z.string().uuid(),
    description: z.string().trim().min(2, "Ingresá el nombre del repuesto.").max(200),
    supplier: z.string().trim().min(2, "Ingresá el proveedor.").max(160),
    quantity: z.number().int().min(1).max(1000),
    unitCost: z.string().trim().regex(/^\d{1,9}([.,]\d{1,2})?$/, "Ingresá un costo válido, sin separador de miles y con hasta 2 decimales.")
        .transform(value => value.replace(",", "."))
        .refine(value => Number(value) > 0, "El costo de compra debe ser mayor a cero."),
    purchasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Fecha de compra inválida."),
    receipt: z.string().trim().max(160).optional().default(""),
});
export const externalPurchasesSchema = z.array(externalPurchaseSchema).max(20);
export type ExternalPurchaseInput = z.input<typeof externalPurchaseSchema>;

type Actor = { id: string; role: string; branch?: { id: string } | null };
type RepairScope = { branchId: string; assignedUserId: string | null };

export function canAccessExternalPurchases(actor: Actor, repair: RepairScope) {
    return actor.role === "ADMIN" || (actor.role === "TECHNICIAN" && (
        repair.assignedUserId === actor.id || actor.branch?.id === repair.branchId
    ));
}

export const EXTERNAL_PURCHASE_EDITABLE_STATUSES = [
    REPAIR_STATUS.PENDING, REPAIR_STATUS.CLAIMED, REPAIR_STATUS.IN_PROGRESS,
    REPAIR_STATUS.PAUSED, REPAIR_STATUS.DIAGNOSED, REPAIR_STATUS.WAITING_CONFIRMATION,
    REPAIR_STATUS.WAITING_PARTS,
];
