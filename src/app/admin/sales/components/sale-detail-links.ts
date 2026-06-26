import type { SaleItemSummary } from "@/types/sales";

const TICKET_LABEL_PATTERN = /^ticket\s*#?\s*/i;

export function getRepairTicketSearchQuery(item: Pick<SaleItemSummary, "name" | "repairId">): string | null {
    if (!item.repairId) return null;

    const ticketQuery = item.name.replace(TICKET_LABEL_PATTERN, "").trim();
    return ticketQuery || null;
}

export function buildAdminRepairSearchHref(item: Pick<SaleItemSummary, "name" | "repairId">): string | null {
    const query = getRepairTicketSearchQuery(item);
    if (!query) return null;

    return `/admin/repairs?${new URLSearchParams({ q: query }).toString()}`;
}
