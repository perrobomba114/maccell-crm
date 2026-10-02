import { Prisma } from "@prisma/client";
import { externalPurchasesSchema } from "./external-purchases";

export async function recordExternalPurchases(
    tx: Prisma.TransactionClient,
    repairId: string,
    userId: string,
    input: unknown,
) {
    const purchases = externalPurchasesSchema.parse(input);
    for (const purchase of purchases) {
        const unitCost = new Prisma.Decimal(purchase.unitCost);
        const data = {
            repairId, userId, requestId: purchase.requestId,
            description: purchase.description, supplier: purchase.supplier,
            quantity: purchase.quantity, unitCost,
            totalCost: unitCost.mul(purchase.quantity),
            purchasedAt: new Date(`${purchase.purchasedAt}T00:00:00.000Z`),
            receipt: purchase.receipt || null,
        };
        // Reintentar el mismo envío no duplica el gasto. Un cambio requiere otro registro.
        // INSERT ... ON CONFLICT DO NOTHING también cubre envíos concurrentes.
        // Un upsert con update vacío puede ser emulado por Prisma y competir al insertar.
        await tx.repairExternalPurchase.createMany({ data: [data], skipDuplicates: true });
        const stored = await tx.repairExternalPurchase.findUniqueOrThrow({
            where: { repairId_requestId: { repairId, requestId: purchase.requestId } },
        });
        if (stored.userId !== userId || stored.description !== data.description ||
            stored.supplier !== data.supplier || stored.quantity !== data.quantity ||
            !stored.unitCost.equals(unitCost) || stored.receipt !== data.receipt ||
            stored.purchasedAt.getTime() !== data.purchasedAt.getTime()) {
            throw new Error("Este envío ya fue registrado con otros datos. Volvé a abrir el formulario.");
        }
    }
}
