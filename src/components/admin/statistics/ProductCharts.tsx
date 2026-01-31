"use client";

import { TrendingUp, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { cn } from "@/lib/utils";

function TopProductsInternalChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sin datos de productos</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                <XAxis type="number" fontSize={11} stroke="#71717a" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="#a1a1aa"
                />
                <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                />
                <Bar dataKey="quantity" name="Cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16}>
                    {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? '#8b5cf6' : '#6366f1'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export function ProductCharts({ productStats, repairStats }: { productStats: any, repairStats: any }) {
    if (!productStats) return null;

    return (
        <>
            {/* Top Selling Products - Grid Item */}
            <div className="xl:col-span-1 bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col min-h-[450px]">
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
                    <TopProductsInternalChart data={productStats.topSelling} />
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

export function StockAlertsList({ productStats }: { productStats: any }) {
    if (!productStats) return null;

    return (
        <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Stock Crítico</h3>
                    <p className="text-sm text-zinc-500">Reposición prioritaria</p>
                </div>
                <div className="bg-red-500/10 p-2 rounded-lg text-red-500">
                    <AlertTriangle size={18} />
                </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {productStats.lowStock.length === 0 ? (
                    <div className="text-zinc-500 text-sm text-center py-10 flex flex-col items-center">
                        <CheckCircle2 size={30} className="mb-2 text-emerald-500/50" />
                        Todo en orden
                    </div>
                ) : productStats.lowStock.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors" title={item.name}>
                        <div>
                            <h4 className="text-xs font-bold text-white max-w-[150px] truncate">{item.name}</h4>
                            <p className="text-[10px] text-zinc-500">{item.branch}</p>
                        </div>
                        <div className="px-2 py-1 bg-red-500/10 rounded-md text-red-500 text-xs font-bold border border-red-500/20">
                            {item.stock} un.
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TopPartsList({ repairStats }: { repairStats: any }) {
    if (!repairStats) return null;

    return (
        <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Repuestos Top</h3>
                    <p className="text-sm text-zinc-500">Mayor rotación</p>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                    <Package size={18} />
                </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {repairStats.mostUsedParts.length === 0 ? (
                    <div className="text-zinc-500 text-sm text-center py-10">Sin datos</div>
                ) : repairStats.mostUsedParts.map((part: any, i: number) => (
                    <div key={i} className="group">
                        <div className="flex justify-between items-center mb-1 text-xs">
                            <span className="text-zinc-300 font-medium truncate max-w-[180px]">{part.name}</span>
                            <span className="text-emerald-500 font-bold">{part.count}</span>
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
