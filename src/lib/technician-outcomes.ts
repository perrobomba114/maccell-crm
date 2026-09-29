export type TechnicianOutcome = { id: number; name: string; count: number };
type OutcomeEntry = {
    repairId: string;
    userId: string | null;
    toStatus: { id: number; name: string };
};

// Entries arrive newest first: a reopened ticket counts once per technician,
// under its most recent finalization in the selected period.
export function summarizeTechnicianOutcomes(entries: OutcomeEntry[]) {
    const grouped = new Map<string, { total: number; outcomes: TechnicianOutcome[] }>();
    const seen = new Map<string, Set<string>>();
    for (const entry of entries) {
        if (!entry.userId) continue;
        const repairIds = seen.get(entry.userId) ?? new Set<string>();
        if (repairIds.has(entry.repairId)) continue;
        repairIds.add(entry.repairId);
        seen.set(entry.userId, repairIds);
        const summary = grouped.get(entry.userId) ?? { total: 0, outcomes: [] };
        const outcome = summary.outcomes.find(status => status.id === entry.toStatus.id);
        if (outcome) outcome.count += 1;
        else summary.outcomes.push({ ...entry.toStatus, count: 1 });
        summary.total += 1;
        grouped.set(entry.userId, summary);
    }
    for (const summary of grouped.values()) summary.outcomes.sort((a, b) => a.id - b.id);
    return grouped;
}
