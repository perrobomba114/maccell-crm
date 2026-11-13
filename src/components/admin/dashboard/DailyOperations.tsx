import Link from "next/link";
import { db } from "@/lib/db";
import { formatArgentinaDate, getDailyRange } from "@/lib/date-utils";
import { REPAIR_STATUS as S } from "@/lib/repairs/status";

export async function DailyOperations({ branchId }: { branchId?: string }) {
    const today = formatArgentinaDate();
    const { start, end } = getDailyRange(today);
    const scope = branchId ? { branchId } : {};
    const outstanding = [S.PENDING, S.CLAIMED, S.IN_PROGRESS, S.PAUSED, S.DIAGNOSED, S.WAITING_CONFIRMATION, S.WAITING_PARTS];
    const due = { ...scope, promisedAt: { lte: end }, statusId: { in: outstanding } };
    const [sales, shifts, received, dueCount, tickets] = await Promise.all([
        db.sale.aggregate({ where: { ...scope, createdAt: { gte: start, lte: end } }, _sum: { total: true }, _count: true }),
        db.cashShift.count({ where: { ...scope, status: "OPEN" } }),
        db.repair.count({ where: { ...scope, createdAt: { gte: start, lte: end } } }),
        db.repair.count({ where: due }),
        db.repair.findMany({ where: due, orderBy: [{ promisedAt: "asc" }, { id: "asc" }], take: 5,
            select: { ticketNumber: true, deviceBrand: true, deviceModel: true, promisedAt: true, branch: { select: { name: true } } } }),
    ]);
    return <section className="mb-7 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-sky-800/60 bg-gradient-to-br from-slate-900 to-sky-950 p-5 sm:p-6">
            <h2 className="text-sm font-medium text-sky-200">Ventas de hoy · {formatArgentinaDate(start, "dd/MM/yyyy")}</h2>
            <p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(sales._sum.total ?? 0)}</p>
            <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-sky-800/60 pt-4">{[[sales._count, "Ventas"], [received, "Equipos ingresados"], [shifts, "Cajas abiertas"]].map(([value,label]) => <div key={label}><dt className="text-xs text-sky-100">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl>
        </div>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Compromisos del taller <span className="ml-1 text-amber-300">{dueCount}</span></h2>
            <p className="mb-2 text-sm text-zinc-400">Pendientes con fecha prometida hasta hoy. Primero los más antiguos.</p>
            {tickets.length ? <ul className="divide-y divide-zinc-800">{tickets.map(t => <li key={t.ticketNumber}><Link className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:underline" href={`/admin/repairs?${new URLSearchParams({ q: t.ticketNumber, branch: branchId || "ALL" })}`}>
                <span className="min-w-0 break-words"><strong>#{t.ticketNumber}</strong> · {t.deviceBrand} {t.deviceModel}<span className="block text-xs text-zinc-400">{t.branch.name}</span></span>
                <span className="shrink-0 text-amber-200">{formatArgentinaDate(t.promisedAt,"dd/MM/yy")}</span>
            </Link></li>)}</ul> : <p className="pt-3 text-sm">Sin compromisos pendientes para hoy.</p>}
            {dueCount > tickets.length && <p className="text-xs text-zinc-400">Se muestran los primeros {tickets.length} de {dueCount}.</p>}
        </div>
    </section>;
}
