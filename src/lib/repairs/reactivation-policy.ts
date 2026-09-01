import { REPAIR_STATUS } from "@/lib/repairs/status";
import { VENDOR_REACTIVATABLE_STATUS_IDS } from "@/lib/repairs/status-sets";

export type RepairReactivationActor = {
    id: string;
    name: string;
    role: "ADMIN" | "VENDOR" | "TECHNICIAN";
    branchId: string | null;
};

export type RepairReactivationTarget = {
    id: string;
    ticketNumber: string;
    statusId: number;
    statusName: string;
    branchId: string;
    assignedUserId: string | null;
};

export type ReactivationMutation = {
    repair: {
        statusId: typeof REPAIR_STATUS.PENDING;
        assignedUserId: null;
        startedAt: null;
        finishedAt: null;
    };
    history: {
        fromStatusId: number;
        toStatusId: typeof REPAIR_STATUS.PENDING;
        userId: string;
    };
    observation: string;
};

export function isReactivatableRepair(statusId: number): statusId is typeof VENDOR_REACTIVATABLE_STATUS_IDS[number] {
    return VENDOR_REACTIVATABLE_STATUS_IDS.includes(statusId as typeof VENDOR_REACTIVATABLE_STATUS_IDS[number]);
}

export function getReactivationAuthorizationError(
    actor: RepairReactivationActor,
    repair: Pick<RepairReactivationTarget, "branchId">,
): string | null {
    if (actor.role === "ADMIN") return null;
    if (actor.role !== "VENDOR" || actor.branchId !== repair.branchId) return "No autorizado";
    return null;
}

export function buildReactivationMutation(
    repair: RepairReactivationTarget,
    actor: Pick<RepairReactivationActor, "id" | "name">,
): ReactivationMutation {
    return {
        repair: {
            statusId: REPAIR_STATUS.PENDING,
            assignedUserId: null,
            startedAt: null,
            finishedAt: null,
        },
        history: {
            fromStatusId: repair.statusId,
            toStatusId: REPAIR_STATUS.PENDING,
            userId: actor.id,
        },
        observation: `Reactivada por ${actor.name}. Estado anterior: ${repair.statusName}. Disponible nuevamente para técnico.`,
    };
}
