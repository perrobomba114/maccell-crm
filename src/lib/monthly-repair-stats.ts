import { db } from "@/lib/db";
import { REPAIR_STATUS as S } from "@/lib/repairs/status";

export async function monthlyRepairStats(branchId: string | undefined, start: Date, end: Date) {
    const branch = branchId ? { branchId } : {};
    const range = { gte: start, lte: end };
    const outcomes: number[] = [S.OK, S.NO_REPAIR];
    const [received, events, legacy] = await Promise.all([
        db.repair.count({ where: { ...branch, createdAt: range } }),
        db.repairStatusHistory.findMany({
            where: { repair: branch, createdAt: range, toStatusId: { in: [...outcomes, S.DELIVERED] } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { repairId: true, toStatusId: true, fromStatusId: true },
        }),
        db.repair.findMany({
            where: { ...branch, finishedAt: range, statusId: { in: outcomes }, statusHistory: { none: { toStatusId: { in: outcomes } } } },
            select: { id: true, statusId: true },
        }),
    ]);
    return summarizeMonthlyRepairs(received, events, legacy);
}

export function summarizeMonthlyRepairs(received: number,
    events: { repairId: string; toStatusId: number; fromStatusId: number | null }[],
    legacy: { id: string; statusId: number }[]) {
    const results = new Map(legacy.map(r => [r.id, r.statusId]));
    const deliveries = new Set<string>();
    for (const event of events) {
        if (event.toStatusId === S.DELIVERED) deliveries.add(event.repairId);
        else if (event.fromStatusId !== event.toStatusId) results.set(event.repairId, event.toStatusId);
    }
    const resolved = results.size;
    const ok = Array.from(results.values()).filter(status => status === S.OK).length;
    return { received, resolved, ok, unrepaired: resolved - ok, delivered: deliveries.size };
}
