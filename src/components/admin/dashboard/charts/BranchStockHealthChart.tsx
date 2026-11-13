import { ShieldCheck } from "lucide-react";

export function BranchStockHealthChart({ data = [] }: { data?: { name: string; health: number }[] }) {
    return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-emerald-400" />Control de stock por sucursal</h3>
        <p className="mb-4 text-sm text-zinc-400">Artículos con existencias auditados en los últimos 30 días.</p>
        <div className="grid gap-4 sm:grid-cols-2">{data.map(row => <div key={row.name}>
            <div className="flex justify-between gap-2 text-sm"><span>{row.name}</span><strong>{row.health}%</strong></div>
            <div aria-hidden="true" className="mt-2 h-2 rounded bg-zinc-800"><div className="h-full rounded bg-emerald-500" style={{ width: `${row.health}%` }} /></div>
        </div>)}</div>{!data.length && <p>Sin datos de auditoría.</p>}
    </section>;
}
