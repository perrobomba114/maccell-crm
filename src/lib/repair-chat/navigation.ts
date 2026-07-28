import { FINAL_REPAIR_CHAT_STATUS_IDS } from "@/lib/repairs/status";

export type RepairChatRole = "ADMIN" | "VENDOR" | "TECHNICIAN";

type RepairNavigationTarget = {
    id: string;
    statusId: number;
};

export function buildRepairDetailsHref(role: RepairChatRole, repair: RepairNavigationTarget): string {
    const query = `repairId=${encodeURIComponent(repair.id)}`;
    if (role === "ADMIN") return `/admin/repairs?${query}`;

    const isArchived = FINAL_REPAIR_CHAT_STATUS_IDS.some((statusId) => statusId === repair.statusId);
    if (role === "VENDOR") {
        return `${isArchived ? "/vendor/repairs/history" : "/vendor/repairs/active"}?${query}`;
    }

    return `${isArchived ? "/technician/history" : "/technician/repairs"}?${query}`;
}

export function removeRepairDetailsParam(pathname: string, searchParams: { toString(): string }): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("repairId");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}
