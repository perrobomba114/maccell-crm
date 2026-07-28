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

export const ACTIVE_REPAIR_CHAT_STATUS_IDS = [1, 2, 3, 4, 8, 9] as const;
export const FINAL_REPAIR_CHAT_STATUS_IDS = [5, 6, 7, 10] as const;
