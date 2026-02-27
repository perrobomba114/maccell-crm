"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    ReferenceLine,
    PieChart,
    Pie
} from "recharts";
import { TrendingUp, TrendingDown, ArrowRight, LayoutList, AlertCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

// --- Branch Profit Chart ---
interface BranchProfitProps {
    data: {
        name: string;
        profit: number;
        revenue: number;
    }[];
}

export function BranchProfitChart({ data }: BranchProfitProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Ganancias por Sucursal</CardTitle>
                <CardDescription className="text-zinc-500">Comparativa de Ingresos vs Ganancia Real</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800" />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => [`$${Math.round(Number(value) || 0).toLocaleString("es-AR")}`, undefined]}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// --- Growth Chart ---
interface BranchGrowthProps {
    data: {
        name: string;
        percent: number;
    }[];
}

export function BranchGrowthChart({ data }: BranchGrowthProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Crecimiento Mensual</CardTitle>
                <CardDescription className="text-zinc-500">% vs Mes Anterior</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="growthPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="growthNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800/50" />
                        <XAxis
                            dataKey="name"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a" }}
                            dy={10}
                        />
                        <YAxis
                            fontSize={11}
                            tick={{ fill: "#71717a" }}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                            domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 0)]}
                        />
                        <Tooltip
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{
                                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                                borderColor: 'rgba(39, 39, 42, 0.5)',
                                borderRadius: '12px',
                                color: '#fff',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}
                            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Crecimiento"]}
                        />
                        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                        <Bar dataKey="percent" name="Crecimiento %" radius={[6, 6, 6, 6]} maxBarSize={60} animationDuration={1500}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.percent >= 0 ? "url(#growthPositive)" : "url(#growthNegative)"}
                                    stroke={entry.percent >= 0 ? "#059669" : "#b91c1c"}
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

const RepairTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // En modo 'expand', payload[i].value es el porcentaje. 
        // Usamos payload[0].payload que contiene el objeto de datos original.
        const data = payload[0].payload;
        const relevantKeys = payload.map((p: any) => p.dataKey);
        const total = relevantKeys.reduce((sum: number, key: string) => sum + (Number(data[key]) || 0), 0);

        return (
            <div className="bg-[#18181b] border border-zinc-800 p-3 rounded-lg shadow-xl min-w-[180px] z-[100]">
                <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-1.5">
                    <span className="font-bold text-white text-sm tracking-tight">{label}</span>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Activos</span>
                </div>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => {
                        const val = data[entry.dataKey] || 0;
                        return (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-zinc-400 text-xs">{entry.name}</span>
                                </div>
                                <span className="text-white font-bold text-sm">{val}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase">Total</span>
                    <span className="text-sm font-bold text-white">{total} Equipos</span>
                </div>
            </div>
        );
    }
    return null;
};

export function BranchUndeliveredChart({ data, keys }: { data: any[], keys?: { name: string, color: string }[] }) {
    if (!data || data.length === 0) return null;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex flex-col overflow-visible">
            <CardHeader className="pb-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Stock de Reparaciones
                        </CardTitle>
                        <CardDescription className="text-zinc-500 text-xs">
                            Equipos actualmente en proceso por sucursal
                        </CardDescription>
                    </div>
                </div>

                {/* Compact Custom Legend - Cleaner */}
                {keys && keys.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 px-2 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        {keys.map((k) => (
                            <div key={k.name} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full ring-1 ring-white/10" style={{ backgroundColor: k.color }} />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{k.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 pb-6 relative min-h-0 pl-0">
                <div className="w-full" style={{ height: Math.max(400, data.length * 100) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            stackOffset="expand" // Use 'sign' or 'none' if you want absolute. 'expand' makes 100% width bars. 
                            // Wait, for "Stock" typically we want absolute numbers, but the user image shows full width bars (100% stacked).
                            // If user wants comparison of volume, 'expand' is wrong if volumes differ. 
                            // However, let's stick to the 'sleek' look. If volumes differ greatly, relative might be better.
                            // Let's use standard stacked (not expand) to show real volume differences, which is more honest for stock.
                            // BUT, if the user liked the "fat" bars filling the width, maybe they want normalized?
                            // I will use normal stacking to show TRUE scale, but with a background bar?
                            // Let's stick to standard stacking to be safe for inventory.
                            barCategoryGap={20} // Space between branch groups
                            margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                        >
                            <CartesianGrid strokeDasharray="12 12" horizontal={false} stroke="#27272a" opacity={0.3} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={<RepairTooltip />}
                                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
                                wrapperStyle={{ zIndex: 100 }}
                            />

                            {keys && keys.length > 0 ? (
                                keys.map((k, index) => {
                                    // Logic for rounded corners only on ends
                                    const isFirst = index === 0;
                                    const isLast = index === keys.length - 1;
                                    const radius: [number, number, number, number] = isFirst ? [4, 0, 0, 4] : isLast ? [0, 4, 4, 0] : [0, 0, 0, 0];

                                    return (
                                        <Bar
                                            key={k.name}
                                            dataKey={k.name}
                                            stackId="repairs"
                                            fill={k.color}
                                            radius={[0, 0, 0, 0]} // Keep flat intersections
                                            barSize={20} // Much thinner and elegant
                                            stroke="#18181b"
                                            strokeWidth={1}
                                            className="transition-all duration-300 hover:opacity-90"
                                            animationDuration={1500}
                                        />
                                    );
                                })
                            ) : (
                                <Bar
                                    dataKey="undelivered"
                                    fill="#f97316"
                                    radius={[4, 4, 4, 4]}
                                    barSize={20}
                                    name="Equipos"
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function RepairsByStatusChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex items-center justify-center">
            <span className="text-zinc-500 text-sm">Sin datos registrados</span>
        </Card>
    );

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-blue-500" />
                    Estado Mensual
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                    Distribución de reparaciones (Mes Actual)
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-12 px-6 pb-6">
                <div className="h-[280px] w-[280px] shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={85}
                                outerRadius={115}
                                paddingAngle={5}
                                dataKey="value"
                                animationDuration={1000}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-white leading-none">{total}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium">Total</span>
                    </div>
                </div>

                <div className="flex-1 w-full space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs group py-0.5">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                <span className="text-zinc-300 group-hover:text-white transition-colors truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-100">{item.value}</span>
                                <span className="text-[10px] text-zinc-500">{Math.round((item.value / total) * 100)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// --- Stock Health Chart ---
interface BranchStockHealthProps {
    data: {
        name: string;
        health: number;
    }[];
}

export function BranchStockHealthChart({ data }: BranchStockHealthProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Control de Stock por Sucursal
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">
                    % de stock auditado en los últimos 30 días
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800/50" />
                        <XAxis
                            dataKey="name"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a" }}
                        />
                        <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                            tick={{ fill: "#71717a" }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }}
                            contentStyle={{
                                backgroundColor: '#09090b',
                                borderColor: '#27272a',
                                borderRadius: '12px',
                                color: '#fff',
                                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => [`${value}%`, "Auditado"]}
                        />
                        <Bar
                            dataKey="health"
                            name="Auditado"
                            fill="url(#healthGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
