import { isAdminRepairTicketLookupQuery } from "@/lib/admin-repairs-search-terms";

export type AdminRepairSearchParamUpdates = {
    q: string | null;
    date?: null;
    branch?: null;
    techId?: null;
    tech?: null;
    warranty?: null;
};

export function buildAdminRepairSearchParamUpdates(searchTerm: string): AdminRepairSearchParamUpdates {
    const query = searchTerm.trim();
    if (!query) return { q: null };

    if (!isAdminRepairTicketLookupQuery(query)) {
        return { q: query };
    }

    return {
        q: query,
        date: null,
        branch: null,
        techId: null,
        tech: null,
        warranty: null,
    };
}
