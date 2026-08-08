export const REPAIR_STATUS = {
    PENDING: 1,
    CLAIMED: 2,
    IN_PROGRESS: 3,
    PAUSED: 4,
    OK: 5,
    DELIVERED: 6,
    NO_REPAIR: 7,
    INVOICED: 10,
} as const;

/** Estados que requieren una actualización del técnico antes de entregar desde POS. */
export const POS_DELIVERY_BLOCKED_STATUS_IDS = [
    REPAIR_STATUS.CLAIMED,
    REPAIR_STATUS.IN_PROGRESS,
    REPAIR_STATUS.PAUSED,
    REPAIR_STATUS.OK,
] as const;

export type PosDeliveryBlockedStatusId = typeof POS_DELIVERY_BLOCKED_STATUS_IDS[number];

export function isPosDeliveryBlockedStatus(statusId: number): statusId is PosDeliveryBlockedStatusId {
    return POS_DELIVERY_BLOCKED_STATUS_IDS.includes(statusId as PosDeliveryBlockedStatusId);
}

export const ACTIVE_REPAIR_CHAT_STATUS_IDS = [1, 2, 3, 4, 5, 7, 8, 9] as const;
export const FINAL_REPAIR_CHAT_STATUS_IDS = [6, 10] as const;
export const REPAIR_HISTORY_STATUS_IDS = [5, 6, 7, 10] as const;
