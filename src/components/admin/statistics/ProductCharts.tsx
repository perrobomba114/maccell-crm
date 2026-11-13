"use client";

import { useState } from "react";
import { TrendingUp, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
type TopProductDatum = {
    name: string;
    quantity: number;
};

type LowStockItem = {
    name: string;
    branch: string;
    quantity: number;
};

type UsedPart = {
    name: string;
    count: number;
};

type ProductStatsData = {
    topSelling: TopProductDatum[];
    lowStock: LowStockItem[];
    stockByBranch?: { name: string; count: number }[];
};

type RepairStatsData = {
    mostUsedParts: UsedPart[];
};

export function ProductCharts({ productStats }: { productStats: ProductStatsData | null | undefined; repairStats?: RepairStatsData | null }) {
    if (!productStats) return null;

    return (
        <>
            {/* Top Selling Products - Grid Item */}
            <div className="xl:col-span-1 bg-[#18181b] rounded-2xl border border-zinc-800 p-4 sm:p-5 flex flex-col min-w-0">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Top Productos</h3>
                        <p className="text-sm text-zinc-500">Más vendidos por volumen</p>
                    </div>
                    <div className="bg-violet-500/10 p-2 rounded-lg text-violet-500">
                        <TrendingUp size={20} />
                    </div>
                </div>
                <div className="flex-1 w-full h-full">
                    <ol className="divide-y divide-zinc-800">{productStats.topSelling.map((item, index) => <li key={index} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2 py-2 text-sm">
                        <span className="font-bold text-violet-400">{index + 1}</span><span className="min-w-0 break-words">{item.name}</span><strong>{item.quantity} un.</strong>
                    </li>)}</ol>{!productStats.topSelling.length && <p className="text-sm text-zinc-400">Sin productos vendidos en el período.</p>}
                </div>
            </div>

            {/* Low Stock Alerts & Parts Usage - In Next Row */}
            {/* We export these as sub-components or render them here?
                The layout in UnifiedDashboard had a grid.
                Let's export standalone components for the lower grid.
            */}
        </>
    );
}

export function StockAlertsList({ productStats }: { productStats: ProductStatsData | null | undefined }) {
    const [expanded, setExpanded] = useState(false);
    if (!productStats) return null;

    return (
        <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-4 sm:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Stock Crítico</h3>
                    <p className="text-sm text-zinc-500">{productStats.lowStock.length} artículos con reposición sugerida</p>
                </div>
                <div className="bg-red-500/10 p-2 rounded-lg text-red-500">
                    <AlertTriangle size={18} />
                </div>
            </div>
            {!!productStats.stockByBranch?.length && <div className="mb-3 border-b border-zinc-700 pb-3">
                <p className="mb-2 text-xs text-zinc-400">Vendidos en el mes con stock local bajo</p>
                {productStats.stockByBranch.map(row => <div key={row.name} className="flex justify-between gap-2 text-sm"><span>{row.name}</span><strong>{row.count}</strong></div>)}
            </div>}
            <div className="space-y-2 flex-1">
                {productStats.lowStock.length === 0 ? (
                    <div className="text-zinc-500 text-sm text-center py-10 flex flex-col items-center">
                        <CheckCircle2 size={30} className="mb-2 text-emerald-500/50" />
                        Todo en orden
                    </div>
                ) : (expanded ? productStats.lowStock : productStats.lowStock.slice(0, 5)).map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors" title={item.name}>
                        <div>
                            <h4 className="text-sm font-semibold text-white [overflow-wrap:anywhere]">{item.name}</h4>
                            <p className="text-xs text-zinc-400">{item.branch}</p>
                        </div>
                        <div className="px-2 py-1 bg-red-500/10 rounded-md text-red-500 text-xs font-bold border border-red-500/20">
                            {item.quantity} un.
                        </div>
                    </div>
                ))}
            </div>
            {productStats.lowStock.length > 5 && <button aria-expanded={expanded} className="mt-2 min-h-11 self-start text-sm font-medium text-red-300" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Ver menos" : `Ver los ${productStats.lowStock.length} artículos`}
            </button>}
        </div>
    );
}

export function TopPartsList({ repairStats }: { repairStats: RepairStatsData | null | undefined }) {
    if (!repairStats) return null;

    return (
        <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-4 sm:p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Repuestos más usados</h3>
                    <p className="text-sm text-zinc-500">Unidades utilizadas en el período</p>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                    <Package size={18} />
                </div>
            </div>
            <div className="space-y-2 flex-1">
                {repairStats.mostUsedParts.length === 0 ? (
                    <div className="text-zinc-500 text-sm text-center py-10">Sin datos</div>
                ) : repairStats.mostUsedParts.map((part, i) => (
                    <div key={i} className="group">
                        <div className="flex justify-between items-center gap-3 mb-1 text-sm">
                            <span className="min-w-0 text-zinc-300 font-medium [overflow-wrap:anywhere]">{part.name}</span>
                            <span className="text-emerald-300 font-bold">{part.count} un.</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500/70 rounded-full group-hover:bg-emerald-500 transition-colors"
                                style={{ width: `${(part.count / Math.max(repairStats.mostUsedParts[0]?.count, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
