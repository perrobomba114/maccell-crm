// FILE DEPRECATED / UNUSED
// Please use StatisticsWidgets.tsx, GlobalFinancials.tsx, BranchCharts.tsx etc instead.
// This file was confusingly named and edited by mistake.

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CheckCircle2,
    Package,
    Wrench,
    Filter,
    ArrowUpRight,
    Trophy,
    AlertTriangle,
    Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Types ---
interface UnifiedStatisticsProps {
    globalStats: any;
    branchStats: any;
    productStats: any;
    repairStats: any;
    branches: any[];
    currentBranchId?: string;
}

// --- Helper Components ---

function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon }: any) {
    const colorMap: any = {
        emerald: "bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border-emerald-500/20 text-emerald-400",
        blue: "bg-gradient-to-br from-blue-500/10 to-blue-900/5 border-blue-500/20 text-blue-400",
        violet: "bg-gradient-to-br from-violet-500/10 to-violet-900/5 border-violet-500/20 text-violet-400",
        orange: "bg-gradient-to-br from-orange-500/10 to-orange-900/5 border-orange-500/20 text-orange-400",
        pink: "bg-gradient-to-br from-pink-500/10 to-pink-900/5 border-pink-500/20 text-pink-400",
    };

    const containerStyle = colorMap[accentColor] || colorMap.blue;
    // Extract icon bg color roughly
    const iconStyle = accentColor === "emerald" ? "bg-emerald-500/20 text-emerald-400" :
        accentColor === "blue" ? "bg-blue-500/20 text-blue-400" :
            accentColor === "violet" ? "bg-violet-500/20 text-violet-400" :
                accentColor === "orange" ? "bg-orange-500/20 text-orange-400" :
                    "bg-pink-500/20 text-pink-400";

    const isPositive = trend?.value >= 0;

    return (
        <div className={cn("relative overflow-hidden rounded-2xl p-6 border flex flex-col justify-between h-full min-h-[140px] transition-all shadow-sm hover:shadow-md", containerStyle)}>
            {/* Background Glow removed/replaced by gradient above */}

            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-zinc-400 transition-colors">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                </div>
                <div className={cn("p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center backdrop-blur-sm", iconStyle)}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 z-10 relative">
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
                        isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
                <span className="text-xs text-zinc-500 font-medium truncate">{subtext}</span>
            </div>
        </div>
    );
}

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
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? '#8b5cf6' : '#6366f1'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}


// --- Main Unified Component ---

export function UnifiedStatisticsDashboard({
    globalStats,
    branchStats,
    productStats,
    repairStats,
    branches,
    currentBranchId
}: UnifiedStatisticsProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Format money
    const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

    // Get current branch label
    const currentBranchName = currentBranchId
        ? branches.find(b => b.id === currentBranchId)?.name
        : "Todas las Sucursales";

    if (!isMounted) return <div className="min-h-screen bg-[#09090b]" />;

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-zinc-900/80 pb-8 px-1">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Centro de Estadísticas</h1>
                    <p className="text-zinc-500 text-sm max-w-md">
                        Análisis financiero, operativo y de inventario en tiempo real.
                    </p>
                </div>

                {/* Unified Filter */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider hidden md:block">Filtrar por:</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-[#18181b] border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 min-w-[180px] justify-between">
                                <span className="flex items-center gap-2">
                                    <Filter size={14} className="text-violet-500" />
                                    {currentBranchName}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#18181b] border-zinc-800 text-zinc-300 w-[200px]">
                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                <Link href="/admin/statistics">Todas las Sucursales</Link>
                            </DropdownMenuItem>
                            {branches.map((branch) => (
                                <DropdownMenuItem key={branch.id} asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                    <Link href={`/admin/statistics?branchId=${branch.id}`}>
                                        {branch.name}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MetricCard
                    title="Facturación Total"
                    value={fmtMoney(globalStats.salesThisMonth)}
                    subtext="Ingresos del mes"
                    trend={{ value: globalStats.growthPercent }}
                    accentColor="blue"
                    icon={DollarSign}
                />
                <MetricCard
                    title="Ganancia Estimada"
                    value={fmtMoney(globalStats.profitThisMonth)}
                    subtext="Margen operativo"
                    trend={{ value: 0 }} // Assuming profit growth isn't calc'd separately here yet
                    accentColor="emerald"
                    icon={Wallet}
                />
                <MetricCard
                    title="Equipos en Taller"
                    value={repairStats.phonesInShop}
                    subtext="En proceso de reparación"
                    accentColor="violet"
                    icon={Wrench}
                />
                <MetricCard
                    title="Ticket Promedio"
                    value={fmtMoney(globalStats.averageTicket || 0)}
                    subtext="Valor medio por venta"
                    accentColor="pink"
                    icon={TrendingUp}
                />
            </div>

            {/* Main Visuals Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">

                {/* Main Graph: Revenue/Profit */}
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

                {/* Secondary Graph: Top Products */}
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
            </div>

            {/* Operational Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">

                {/* Tech Leaderboard */}
                <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Top Técnicos</h3>
                            <p className="text-sm text-zinc-500">Líderes en reparaciones</p>
                        </div>
                        <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
                            <Trophy size={18} />
                        </div>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {repairStats.bestTechnicians.length === 0 ? (
                            <div className="text-zinc-500 text-sm text-center py-10">Sin datos</div>
                        ) : repairStats.bestTechnicians.map((tech: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        i === 0 ? "bg-yellow-500 text-black" : "bg-zinc-700 text-zinc-300"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-medium text-white">{tech.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-blue-400">{tech.count}</span>
                                    <span className="text-[10px] text-zinc-500 ml-1">rep</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock Alerts */}
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
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
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

                {/* Parts Usage */}
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

            </div>

            <div className="text-center text-xs text-zinc-700 pb-10">
                MacCell Analytics • Actualizado en tiempo real
            </div>

        </div>
    );
}
