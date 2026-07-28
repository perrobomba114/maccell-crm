export type RepairPartRequest = {
    id: string;
};

type GroupedRepairPartRequest = {
    id: string;
    quantity: number;
};

type RepairPartConsumptionTransaction = {
    sparePart: {
        findMany(args: {
            where: { id: { in: string[] }; deletedAt: null };
            select: { id: true; name: true };
        }): Promise<Array<{ id: string; name: string }>>;
        updateMany(args: {
            where: { id: string; deletedAt: null; stockLocal: { gte: number } };
            data: { stockLocal: { decrement: number } };
        }): Promise<{ count: number }>;
    };
    repairPart: {
        create(args: {
            data: { repairId: string; sparePartId: string; quantity: number };
        }): Promise<unknown>;
    };
    sparePartHistory: {
        create(args: {
            data: {
                sparePartId: string;
                userId: string;
                branchId: string;
                quantity: number;
                reason: string;
                isChecked: false;
            };
        }): Promise<unknown>;
    };
};

type ConsumeRepairPartsInput = {
    repairId: string;
    ticketNumber: string;
    actorUserId: string;
    branchId: string;
    parts: RepairPartRequest[];
    reason: string;
};

export function groupRepairPartRequests(parts: RepairPartRequest[]): GroupedRepairPartRequest[] {
    const quantities = new Map<string, number>();

    for (const part of parts) {
        const id = part.id.trim();
        if (!id) continue;
        quantities.set(id, (quantities.get(id) ?? 0) + 1);
    }

    return Array.from(quantities, ([id, quantity]) => ({ id, quantity }));
}

export async function consumeRepairParts(
    tx: RepairPartConsumptionTransaction,
    input: ConsumeRepairPartsInput,
): Promise<string[]> {
    const groupedParts = groupRepairPartRequests(input.parts);
    if (groupedParts.length === 0) return [];

    const storedParts = await tx.sparePart.findMany({
        where: {
            id: { in: groupedParts.map((part) => part.id) },
            deletedAt: null,
        },
        select: { id: true, name: true },
    });
    const storedPartsById = new Map(storedParts.map((part) => [part.id, part]));

    if (storedPartsById.size !== groupedParts.length) {
        throw new Error("Uno o más repuestos ya no están disponibles.");
    }

    for (const part of groupedParts) {
        const storedPart = storedPartsById.get(part.id);
        if (!storedPart) throw new Error("Repuesto no encontrado.");

        const stockUpdate = await tx.sparePart.updateMany({
            where: {
                id: part.id,
                deletedAt: null,
                stockLocal: { gte: part.quantity },
            },
            data: { stockLocal: { decrement: part.quantity } },
        });
        if (stockUpdate.count !== 1) {
            throw new Error(`Sin stock suficiente para el repuesto: ${storedPart.name}`);
        }

        await tx.repairPart.create({
            data: {
                repairId: input.repairId,
                sparePartId: part.id,
                quantity: part.quantity,
            },
        });
        await tx.sparePartHistory.create({
            data: {
                sparePartId: part.id,
                userId: input.actorUserId,
                branchId: input.branchId,
                quantity: -part.quantity,
                reason: `Reparación #${input.ticketNumber} (${input.reason})`,
                isChecked: false,
            },
        });
    }

    return groupedParts.map((part) => storedPartsById.get(part.id)?.name ?? part.id);
}
