"use client";

import { BarChart3 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

function BranchProfitChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sin datos financieros</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="#71717a"
                    dy={10}
                />
                <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="#71717a"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    formatter={(value: any) => [`$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`, ""]}
                    contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
                    }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="profit" name="Ganancia Neta" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function BranchCharts({ branchStats }: { branchStats: any }) {
    if (!branchStats) return null;

    return (
        <div className="xl:col-span-2 bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col min-h-[450px]">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Rendimiento Financiero</h3>
                    <p className="text-sm text-zinc-500">Comparativa de ingresos y ganancias brutas</p>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <BarChart3 size={20} />
                </div>
            </div>
            <div className="flex-1 w-full h-full">
                <BranchProfitChart data={branchStats.branchProfits} />
            </div>
        </div>
    );
}
