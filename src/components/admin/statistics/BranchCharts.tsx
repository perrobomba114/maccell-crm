import { BarChart3 } from "lucide-react";

type BranchProfitDatum = { name: string; revenue: number; profit: number };
const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function BranchCharts({ branchStats }: { branchStats: { branchProfits: BranchProfitDatum[] } | null | undefined }) {
    if (!branchStats) return null;
    const rows = [...branchStats.branchProfits].sort((a, b) => b.revenue - a.revenue);
    const maxRevenue = Math.max(0, ...rows.map(row => row.revenue));
    return (
        <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 xl:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="size-5 text-blue-300" aria-hidden="true" /> Rendimiento por sucursal
            </h2>
            {rows.length ? <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">Ingresos y ganancia bruta del período en pesos argentinos, ordenados por ingresos</caption>
                <thead className="border-b border-zinc-700 text-zinc-300">
                    <tr><th scope="col" className="w-1/3 py-3">Sucursal</th><th scope="col" className="text-right">Ingresos</th><th scope="col" className="pl-2 text-right">Ganancia bruta</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {rows.map((row, index) => <tr key={index}>
                        <th scope="row" className="py-4 pr-2 font-medium [overflow-wrap:anywhere]">{row.name}</th>
                        <td className="py-4 text-right tabular-nums [overflow-wrap:anywhere]">{currency.format(row.revenue)}
                            {maxRevenue > 0 && <div aria-hidden="true" className="mt-1 h-1 rounded bg-zinc-800"><div className="h-full rounded bg-blue-400" style={{ width: `${Math.max(0, row.revenue) / maxRevenue * 100}%` }} /></div>}
                        </td>
                        <td className="py-4 pl-2 text-right tabular-nums [overflow-wrap:anywhere]">{currency.format(row.profit)}</td>
                    </tr>)}
                </tbody>
            </table> : <p className="text-sm text-zinc-300">Sin datos por sucursal para el período seleccionado.</p>}
        </section>
    );
}
