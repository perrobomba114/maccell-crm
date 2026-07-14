import type { Prisma } from "@prisma/client";

import { db as prisma } from "@/lib/db";

export const ACTIVE_CEREBRO_REPAIR_STATUSES = [1, 2, 3, 4] as const;

export type CerebroRepairUser = {
    id: string;
    role: string;
};

export type CerebroRepair = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    diagnosis: string | null;
    diagnosisEnriched: string | null;
    observations: string[];
    deviceImages: string[];
    statusId: number;
    statusName: string;
    branchName: string;
    technicianName: string;
    isWet: boolean;
    isWarranty: boolean;
    updatedAt: Date;
};

export type CerebroRepairSummary = Pick<CerebroRepair,
    | "id"
    | "ticketNumber"
    | "deviceBrand"
    | "deviceModel"
    | "problemDescription"
    | "statusId"
    | "statusName"
    | "branchName"
    | "technicianName"
    | "updatedAt"
> & { hasImages: boolean };

export function toCerebroRepairSummary(repair: CerebroRepair): CerebroRepairSummary {
    return {
        id: repair.id,
        ticketNumber: repair.ticketNumber,
        deviceBrand: repair.deviceBrand,
        deviceModel: repair.deviceModel,
        problemDescription: repair.problemDescription,
        statusId: repair.statusId,
        statusName: repair.statusName,
        branchName: repair.branchName,
        technicianName: repair.technicianName,
        updatedAt: repair.updatedAt,
        hasImages: repair.deviceImages.length > 0,
    };
}

export function buildCerebroRepairWhere(user: CerebroRepairUser): Prisma.RepairWhereInput {
    if (user.role !== "ADMIN" && user.role !== "TECHNICIAN") {
        throw new Error("Usuario sin acceso a Cerebro");
    }
    return {
        assignedUserId: user.role === "TECHNICIAN" ? user.id : { not: null },
        statusId: { in: [...ACTIVE_CEREBRO_REPAIR_STATUSES] },
    };
}

function withSearch(where: Prisma.RepairWhereInput, search: string): Prisma.RepairWhereInput {
    const term = search.trim();
    if (!term) return where;
    return {
        ...where,
        OR: [
            { ticketNumber: { contains: term, mode: "insensitive" } },
            { deviceBrand: { contains: term, mode: "insensitive" } },
            { deviceModel: { contains: term, mode: "insensitive" } },
            { problemDescription: { contains: term, mode: "insensitive" } },
        ],
    };
}

const repairSelect = {
    id: true,
    ticketNumber: true,
    deviceBrand: true,
    deviceModel: true,
    problemDescription: true,
    diagnosis: true,
    diagnosisEnriched: true,
    deviceImages: true,
    statusId: true,
    isWet: true,
    isWarranty: true,
    updatedAt: true,
    status: { select: { name: true } },
    branch: { select: { name: true } },
    assignedTo: { select: { name: true } },
    observations: {
        select: { content: true },
        orderBy: { createdAt: "asc" as const },
        take: 30,
    },
} satisfies Prisma.RepairSelect;

function toCerebroRepair(row: Prisma.RepairGetPayload<{ select: typeof repairSelect }>): CerebroRepair {
    return {
        id: row.id,
        ticketNumber: row.ticketNumber,
        deviceBrand: row.deviceBrand,
        deviceModel: row.deviceModel,
        problemDescription: row.problemDescription,
        diagnosis: row.diagnosis,
        diagnosisEnriched: row.diagnosisEnriched,
        observations: row.observations.map((observation) => observation.content),
        deviceImages: row.deviceImages,
        statusId: row.statusId,
        statusName: row.status.name,
        branchName: row.branch.name,
        technicianName: row.assignedTo?.name ?? "Sin técnico",
        isWet: row.isWet,
        isWarranty: row.isWarranty,
        updatedAt: row.updatedAt,
    };
}

export async function listAuthorizedCerebroRepairs(
    user: CerebroRepairUser,
    search = "",
): Promise<CerebroRepair[]> {
    const rows = await prisma.repair.findMany({
        where: withSearch(buildCerebroRepairWhere(user), search),
        select: repairSelect,
        orderBy: { updatedAt: "desc" },
        take: 100,
    });
    return rows.map(toCerebroRepair);
}

export async function getAuthorizedCerebroRepair(
    user: CerebroRepairUser,
    repairId: string,
    requireActive = true,
): Promise<CerebroRepair | null> {
    const scope = requireActive ? buildCerebroRepairWhere(user) : (
        user.role === "TECHNICIAN"
            ? { assignedUserId: user.id }
            : user.role === "ADMIN" ? {} : { id: "__denied__" }
    );
    const row = await prisma.repair.findFirst({
        where: { ...scope, id: repairId },
        select: repairSelect,
    });
    return row ? toCerebroRepair(row) : null;
}
