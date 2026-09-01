export const REPAIR_STATUS = {
    PENDING: 1,
    CLAIMED: 2,
    IN_PROGRESS: 3,
    PAUSED: 4,
    OK: 5,
    NO_REPAIR: 6,
    DIAGNOSED: 7,
    WAITING_CONFIRMATION: 8,
    WAITING_PARTS: 9,
    DELIVERED: 10,
    INVOICED: 10,
} as const;

/** Estados que requieren una actualización del técnico antes de entregar desde POS. */
export const POS_DELIVERY_BLOCKED_STATUS_IDS = [
    REPAIR_STATUS.CLAIMED,
    REPAIR_STATUS.IN_PROGRESS,
    REPAIR_STATUS.PAUSED,
] as const;

export type PosDeliveryBlockedStatusId = typeof POS_DELIVERY_BLOCKED_STATUS_IDS[number];

export function isPosDeliveryBlockedStatus(statusId: number): statusId is PosDeliveryBlockedStatusId {
    return POS_DELIVERY_BLOCKED_STATUS_IDS.includes(statusId as PosDeliveryBlockedStatusId);
}

export const ACTIVE_REPAIR_CHAT_STATUS_IDS = [
    REPAIR_STATUS.PENDING,
    REPAIR_STATUS.CLAIMED,
    REPAIR_STATUS.IN_PROGRESS,
    REPAIR_STATUS.PAUSED,
    REPAIR_STATUS.OK,
    REPAIR_STATUS.DIAGNOSED,
    REPAIR_STATUS.WAITING_CONFIRMATION,
    REPAIR_STATUS.WAITING_PARTS,
] as const;
export const FINAL_REPAIR_CHAT_STATUS_IDS = [REPAIR_STATUS.NO_REPAIR, REPAIR_STATUS.DELIVERED] as const;
export const REPAIR_HISTORY_STATUS_IDS = [
    REPAIR_STATUS.OK,
    REPAIR_STATUS.NO_REPAIR,
    REPAIR_STATUS.DIAGNOSED,
    REPAIR_STATUS.WAITING_CONFIRMATION,
    REPAIR_STATUS.WAITING_PARTS,
    REPAIR_STATUS.DELIVERED,
] as const;
