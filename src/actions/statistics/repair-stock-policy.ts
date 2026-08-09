import type { Prisma } from "@prisma/client";

import { REPAIR_STATUS } from "@/lib/repairs/status";

export function buildRepairStockWhere(): Prisma.RepairWhereInput {
    return {
        statusId: { not: REPAIR_STATUS.DELIVERED },
        saleItems: { none: {} },
    };
}
