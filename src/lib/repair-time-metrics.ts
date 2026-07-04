export const FINAL_REPAIR_STATUS_IDS = [5, 6, 7, 10] as const;
export const TECHNICIAN_REPAIR_TIME_SAMPLE_SIZE = 100;

export type RepairTimeSample = {
    startedAt?: Date | string | null;
    finishedAt?: Date | string | null;
};

export function getRepairDurationMinutes(sample: RepairTimeSample): number | null {
    if (!sample.finishedAt) return null;

    if (sample.startedAt) {
        const start = new Date(sample.startedAt).getTime();
        const end = new Date(sample.finishedAt).getTime();
        const minutes = (end - start) / 1000 / 60;

        if (Number.isFinite(minutes) && minutes >= 1) {
            return minutes;
        }
    }

    return 15;
}

export function getAverageRepairTimeMinutes(samples: RepairTimeSample[]): number {
    const durations = samples
        .map(getRepairDurationMinutes)
        .filter((minutes): minutes is number => minutes !== null);

    if (durations.length === 0) return 0;

    const totalMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);
    return Math.round(totalMinutes / durations.length);
}

export function formatRepairTimeMinutes(minutes: number): string {
    const safeMinutes = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;

    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}
