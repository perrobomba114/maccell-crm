import { AlertTriangle, Package } from "lucide-react";
import { BranchStockHealthChart } from "./charts/BranchStockHealthChart";
import { ReplenishmentTable } from "./ReplenishmentTable";

interface Props {
    stats: { stock: { alerts: { productName: string; branchName: string; quantity: number }[] }; repairs: { frequentParts: { name: string; usage: number; stock: number }[] } };
    branchStats?: { stockHealthStats?: { name: string; health: number }[] };
    productStats?: { lowStock: { name: string; branch: string; quantity: number; suggestedQuantity?: number }[] };
}

export function InventorySection({ stats, branchStats, productStats }: Props) {
    return <section className="mb-8 space-y-4">
        <h2 className="text-xl font-bold">Control de Inventario</h2>
        <BranchStockHealthChart data={branchStats?.stockHealthStats} />
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-red-900/70 bg-zinc-950 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="text-red-400" size={20} />Alertas Críticas</h3>
                <p className="mb-3 text-sm text-zinc-400">Productos con 3 unidades o menos, por sucursal.</p>
                <ul className="divide-y divide-zinc-800">{stats.stock.alerts.map((r,i) => <li key={i} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{r.productName}<small className="block text-zinc-400">{r.branchName}</small></span><strong className="shrink-0 text-red-300">{r.quantity} un.</strong></li>)}</ul>
                {!stats.stock.alerts.length && <p className="text-sm">Sin alertas de stock.</p>}
            </section>
            <section className="rounded-2xl border border-cyan-900/70 bg-zinc-950 p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold"><Package className="text-cyan-400" size={20} />Top Repuestos</h3>
                <p className="mb-3 text-sm text-zinc-400">Asignaciones del mes y stock disponible hoy.</p>
                <ol className="divide-y divide-zinc-800">{stats.repairs.frequentParts.map((r,i) => <li key={i} className="grid grid-cols-[1.5rem_1fr_auto] gap-2 py-2 text-sm"><span className="font-bold text-cyan-400">{i+1}</span><span>{r.name}<small className="block text-zinc-400">Stock actual · {r.stock} un.</small></span><strong>{r.usage} usos</strong></li>)}</ol>
                {!stats.repairs.frequentParts.length && <p className="text-sm">Sin repuestos usados en el mes.</p>}
            </section>
        </div>
        {productStats && <ReplenishmentTable data={productStats.lowStock} />}
    </section>;
}
