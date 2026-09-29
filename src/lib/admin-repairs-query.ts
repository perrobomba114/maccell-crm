import type { Prisma } from "@prisma/client";
import { getRepairDateFilterRange } from "@/lib/repair-date-filter";
import { resolveAdminRepairDateFilterForSearch } from "@/lib/admin-repairs-date-filter";
import { buildAdminRepairSearchFilters } from "@/lib/admin-repairs-search";
import { FINAL_REPAIR_STATUS_IDS } from "@/lib/repair-time-metrics";
import { normalizeAdminRepairStatusId } from "@/lib/admin-repairs-status-filter";
import type { AdminRepairsQuery } from "@/types/admin-repairs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const FINISHED_HISTORY_STATUS_IDS = FINAL_REPAIR_STATUS_IDS;

export function normalizeAdminRepairsQuery(input: string | AdminRepairsQuery = ""): Required<AdminRepairsQuery> {
    const params = typeof input === "string" ? { query: input } : input;
    const pageSize = Math.min(Math.max(Number(params.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const query = params.query?.trim() || "";
    const date = resolveAdminRepairDateFilterForSearch(params.date, query);

    return {
        query,
        branchId: params.branchId || "ALL",
        warrantyOnly: params.warrantyOnly ?? false,
        statusId: normalizeAdminRepairStatusId(params.statusId),
        technician: params.technician?.trim() || "",
        technicianId: params.technicianId?.trim() || "",
        date,
        page: Math.max(Number(params.page) || 1, 1),
        pageSize,
    };
}

export function buildAdminRepairsWhere(params: Required<AdminRepairsQuery>): Prisma.RepairWhereInput {
    const whereClause: Prisma.RepairWhereInput = {};
    const andFilters: Prisma.RepairWhereInput[] = [];

    if (params.query) {
        andFilters.push(...buildAdminRepairSearchFilters(params.query));
    }

    if (params.branchId !== "ALL") {
        whereClause.branchId = params.branchId;
    }

    if (params.warrantyOnly) {
        whereClause.isWarranty = true;
    }

    if (params.statusId) {
        whereClause.statusId = params.statusId;
        if (params.technicianId) whereClause.assignedUserId = params.technicianId;
        else if (params.technician) whereClause.assignedTo = { name: params.technician };
        const range = getRepairDateFilterRange(params.date);
        if (range) andFilters.push({ OR: [
            { createdAt: { gte: range.start, lte: range.end } },
            { statusHistory: { some: { toStatusId: params.statusId, createdAt: { gte: range.start, lte: range.end } } } },
        ] });
        if (andFilters.length) whereClause.AND = andFilters;
        return whereClause;
    }

    // 1. Technician Filter (ID or Name)
    if (params.technicianId) {
        const dateRange = getRepairDateFilterRange(params.date);
        
        // Strictly match the "Finalized by this technician" criteria to align with Podio/KPIs
        // This ensures the table count matches the card count.
        andFilters.push({
            statusHistory: {
                some: {
                    userId: params.technicianId,
                    toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                    fromStatusId: { notIn: [...FINISHED_HISTORY_STATUS_IDS] },
                    ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
                },
            },
        });
    } else if (params.technician) {
        const dateRange = getRepairDateFilterRange(params.date);
        
        andFilters.push({
            statusHistory: {
                some: {
                    user: { name: params.technician },
                    toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                    fromStatusId: { notIn: [...FINISHED_HISTORY_STATUS_IDS] },
                    ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
                },
            },
        });
    } else if (params.date) {
        // 2. Global Date Filter
        const dateRange = getRepairDateFilterRange(params.date);
        if (dateRange) {
            const finishedOnDate: Prisma.RepairWhereInput = {
                statusHistory: {
                    some: {
                        toStatusId: { in: [...FINISHED_HISTORY_STATUS_IDS] },
                        createdAt: { gte: dateRange.start, lte: dateRange.end },
                    },
                },
            };

            andFilters.push({
                OR: [
                    { createdAt: { gte: dateRange.start, lte: dateRange.end } },
                    finishedOnDate,
                ],
            });
        }
    }

    if (andFilters.length > 0) {
        whereClause.AND = andFilters;
    }

    return whereClause;
}

