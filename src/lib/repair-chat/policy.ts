import type { Role } from "@prisma/client";
import { FINAL_REPAIR_CHAT_STATUS_IDS } from "@/lib/repairs/status";

export type RepairChatUser = {
    id: string;
    role: Role;
    branchId: string | null;
};

export type RepairChatRepair = {
    branchId: string;
    assignedUserId: string | null;
    statusId: number;
};

export function canAccessRepairChat(user: RepairChatUser, repair: RepairChatRepair): boolean {
    if (user.role === "ADMIN") return true;
    if (user.role === "VENDOR") return Boolean(user.branchId) && user.branchId === repair.branchId;
    if (user.role === "TECHNICIAN") return user.id === repair.assignedUserId;
    return false;
}

export function isRepairChatReadOnly(statusId: number): boolean {
    return FINAL_REPAIR_CHAT_STATUS_IDS.some((finalStatusId) => finalStatusId === statusId);
}
