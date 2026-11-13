import { db } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";
import { monthlyRepairStats } from "@/lib/monthly-repair-stats";
import { growthLabel } from "@/lib/monthly-growth";

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const periodLabel = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric", timeZone: "UTC" });

async function readPeriod(period: Date, branchId?: string) {
    const { start, end } = getMonthlyRange(period.toISOString());
    const where = { ...(branchId ? { branchId } : {}), createdAt: { gte: start, lte: end } };
    const [sales, expenses, repairs] = await Promise.all([
        db.sale.aggregate({ where, _sum: { total: true }, _count: true }),
        db.expense.aggregate({ where, _sum: { amount: true } }),
        monthlyRepairStats(branchId, start, end),
    ]);
    return { sales: sales._sum.total ?? 0, count: sales._count, expenses: expenses._sum.amount ?? 0, repairs };
}

export async function MonthlyReview({ period, branchId }: { period: Date; branchId?: string }) {
    const previous = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() - 1, 1, 12));
    const [now, before] = await Promise.all([readPeriod(period, branchId), readPeriod(previous, branchId)]);
    const growth = before.sales > 0 ? growthLabel((now.sales - before.sales) / before.sales * 100) : "Sin base de comparación";
    const rows = [
        { label: "Ventas registradas", a: now.count, b: before.count, format: number },
        { label: "Ticket promedio", a: now.count ? now.sales / now.count : null, b: before.count ? before.sales / before.count : null, format: pesos },
        { label: "Gastos registrados", a: now.expenses, b: before.expenses, format: pesos },
        { label: "Equipos ingresados", a: now.repairs.received, b: before.repairs.received, format: number },
        { label: "Reparadas OK", a: now.repairs.ok, b: before.repairs.ok, format: number },
        { label: "Sin reparación", a: now.repairs.unrepaired, b: before.repairs.unrepaired, format: number },
        { label: "Entregadas", a: now.repairs.delivered, b: before.repairs.delivered, format: number },
    ];
    return <section className="mb-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <div className="rounded-2xl border border-teal-800 bg-gradient-to-br from-teal-950 to-zinc-900 p-5 sm:p-7">
            <h2 className="text-sm font-semibold text-teal-200">Ventas del mes · {periodLabel.format(period)}</h2>
            <p className="my-4 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{pesos.format(now.sales)}</p>
            <p className="text-sm text-teal-100">{growth}</p>
            <p className="mt-4 border-t border-teal-800 pt-4 text-sm text-zinc-300">Mes anterior completo · {pesos.format(before.sales)}</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold">Comparación mensual</h2>
            <table className="w-full table-fixed text-sm"><thead><tr className="text-zinc-400"><th className="w-[42%] pb-2 text-left" scope="col">Indicador</th>
                {[period, previous].map(date => <th key={date.toISOString()} scope="col" className="pb-2 text-right">{periodLabel.format(date)}</th>)}</tr></thead>
                <tbody className="divide-y divide-zinc-800">{rows.map(row => <tr key={row.label}>
                    <th scope="row" className="py-2 pr-2 text-left font-medium">{row.label}</th>
                    {[row.a, row.b].map((v,i) => <td key={i} className={`py-2 pl-1 text-right tabular-nums [overflow-wrap:anywhere] ${i ? "text-zinc-400" : ""}`}>{v === null ? "—" : row.format.format(v)}</td>)}
                </tr>)}</tbody></table>
        </div>
    </section>;
}
