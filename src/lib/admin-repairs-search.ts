import type { Prisma } from "@prisma/client";
export {
    getAdminRepairSearchTerms,
    getAdminRepairSearchTermVariants,
    isAdminRepairTicketLookupQuery,
} from "@/lib/admin-repairs-search-terms";
import { getAdminRepairSearchTermVariants, getAdminRepairSearchTerms } from "@/lib/admin-repairs-search-terms";

function contains(value: string) {
    return { contains: value, mode: "insensitive" as const };
}

function buildVariantConditions(variant: string): Prisma.RepairWhereInput[] {
    return [
        { ticketNumber: contains(variant) },
        { customer: { name: contains(variant) } },
        { customer: { phone: contains(variant) } },
        { deviceBrand: contains(variant) },
        { deviceModel: contains(variant) },
        { problemDescription: contains(variant) },
        { diagnosis: contains(variant) },
        { diagnosisEnriched: contains(variant) },
        { branch: { name: contains(variant) } },
        { assignedTo: { is: { name: contains(variant) } } },
        { createdBy: { name: contains(variant) } },
        { originalRepair: { is: { ticketNumber: contains(variant) } } },
        { originalRepair: { is: { problemDescription: contains(variant) } } },
    ];
}

export function buildAdminRepairSearchFilters(query: string | null | undefined): Prisma.RepairWhereInput[] {
    return getAdminRepairSearchTerms(query).map((term) => ({
        OR: getAdminRepairSearchTermVariants(term).flatMap(buildVariantConditions),
    }));
}
