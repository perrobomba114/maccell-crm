import { REPAIR_STATUS } from "./status";

export function getRepairTimerState(startedAt: Date | string | null, estimatedMinutes: number | null, statusId: number, now: number) {
    if (!startedAt || !estimatedMinutes || statusId !== REPAIR_STATUS.IN_PROGRESS) {
        return { text: estimatedMinutes ? `${estimatedMinutes} min` : "-", overdue: false };
    }
    const end = new Date(startedAt).getTime() + estimatedMinutes * 60_000;
    if (!Number.isFinite(end)) return { text: "-", overdue: false };
    const remaining = Math.max(0, Math.ceil((end - now) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return { text: `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`, overdue: end <= now };
}
