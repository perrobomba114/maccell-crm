"use client";

import React from "react";
import {
    DollarSign,
    Zap,
    Wrench,
    Package,
    AlertTriangle,
    CheckCircle2,
    Trophy
} from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { BranchFilter } from "@/components/admin/dashboard/BranchFilter";
import { BranchProfitChart, BranchGrowthChart, BranchUndeliveredChart, RepairsByStatusChart, BranchStockHealthChart } from "@/components/admin/dashboard/BranchCharts";
import { ReplenishmentTable } from "@/components/admin/dashboard/ReplenishmentTable";
import { cn } from "@/lib/utils";
import { TechLeaderboard } from "@/components/admin/dashboard/TechLeaderboard";
import { SmartInsights } from "@/components/admin/dashboard/SmartInsights";
import { ProfitDonut } from "@/components/admin/dashboard/ProfitDonut";
import { useState } from "react";
import { Maximize2, Minimize2, Trash2, Loader2 } from "lucide-react";
import { cleanupCorruptedImagesAction } from "@/actions/maintenance-actions";
import { toast } from "sonner";

// --- Types ---
interface UnifiedDashboardProps {
    stats: any;
    branches: any[];
    currentBranchId?: string;
    currentUser: { name: string | null };
    branchStats?: any;
    productStats?: any;
}

// --- Utils ---
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtCompact = (n: number) => new Intl.NumberFormat("es-AR", { notation: "compact", compactDisplay: "short" }).format(n);

// --- Sub-Components ---

// 1. Metric Card (Unchanged, already good)
function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon }: any) {
    const colorMap: any = {
        blue: "text-blue-500 bg-blue-500/10",
        emerald: "text-emerald-500 bg-emerald-500/10",
        violet: "text-violet-500 bg-violet-500/10",
        orange: "text-orange-500 bg-orange-500/10"
    };

    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col justify-between h-full min-h-[160px] hover:border-zinc-700 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 group-hover:text-zinc-400 transition-colors">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight truncate" title={String(value)}>
                        {value}
                    </h3>
                </div>
                <div className={cn("p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110", colorMap[accentColor])}>
                    <Icon size={24} strokeWidth={2} />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
                {trend && (
                    <span className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0",
                        trend.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {trend.value}
                    </span>
                )}
                <span className="text-xs text-zinc-500 font-medium truncate">{subtext}</span>
            </div>
        </div>
    );
}

// 3. Tech Performance - Redesigned (Modern Leaderboard)
function TechPerformance({ technicians }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 h-full flex flex-col overflow-hidden">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Top Técnicos</h3>
                    <p className="text-sm text-zinc-500">Líderes en reparaciones</p>
                </div>
                <div className="bg-violet-500/10 p-2 rounded-lg text-violet-500">
                    <Trophy size={18} />
                </div>
            </div>

            <div className="flex-1 space-y-5 flex flex-col justify-center">
                {technicians.length === 0 ? (
                    <div className="text-zinc-500 text-center text-sm">Sin datos</div>
                ) : technicians.slice(0, 3).map((tech: any, i: number) => {
                    const max = technicians[0]?.repairs || 1;
                    const percent = (tech.repairs / max) * 100;

                    return (
                        <div key={i} className="group">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                                        i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                            i === 1 ? "bg-zinc-500/20 text-zinc-400" :
                                                i === 2 ? "bg-orange-700/20 text-orange-600" : "bg-zinc-800 text-zinc-600"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <span className="text-sm text-zinc-200 font-medium">{tech.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="flex flex-col items-end">
                                        <div>
                                            <span className="text-sm font-bold text-white">{tech.repairs}</span>
                                            <span className="text-[10px] text-zinc-500 ml-1">rep</span>
                                        </div>
                                        {tech.time > 0 && (
                                            <span className="text-[10px] text-violet-400/80 font-medium tracking-tight">
                                                {Math.floor(tech.time / 60)}h {tech.time % 60}m
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bar with Glow */}
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-700 ease-out relative",
                                        i === 0 ? "bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]" :
                                            "bg-gradient-to-r from-blue-900 to-blue-600"
                                    )}
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 4. Stock Alerts Widget (Refined)
function StockAlertsWidget({ alerts, health }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Alertas de Stock</h3>
                    <p className="text-sm text-zinc-500">Productos críticos (&lt;3 unidades)</p>
                </div>
                <div className="bg-red-500/10 p-2 rounded-lg text-red-500"><AlertTriangle size={18} /></div>
            </div>

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm bg-zinc-900/30 rounded-xl">Todo en orden</div>
                ) : (
                    alerts.slice(0, 10).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors border border-transparent hover:border-zinc-800">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-zinc-200 font-medium truncate pr-2">{item.productName}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.branchName}</span>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/10">
                                {item.quantity} low
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// 5. Parts Table (Refined)
function PartsTable({ parts }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="mb-6">
                <h3 className="font-bold text-lg text-white mb-1">Repuestos Top</h3>
                <p className="text-sm text-zinc-500">Alta rotación en taller</p>
            </div>

            <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider border-b border-zinc-800/50">
                        <tr>
                            <th className="pb-3 pl-2">Item</th>
                            <th className="pb-3 text-right">Uso</th>
                            <th className="pb-3 text-right pr-2">Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                        {parts.slice(0, 10).map((p: any, i: number) => (
                            <tr key={i} className="group hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3 pl-2 text-zinc-300 font-medium truncate max-w-[140px] group-hover:text-white">
                                    {p.name}
                                </td>
                                <td className="py-3 text-right text-zinc-400">{p.usage}</td>
                                <td className={`py-3 pr-2 text-right font-bold ${p.stock <= 2 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {p.stock}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 6. Top Products (Refined)
function TopProductsWidget({ products }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="mb-6">
                <h3 className="font-bold text-lg text-white mb-1">Productos Virales</h3>
                <p className="text-sm text-zinc-500">Mayor volumen de ventas</p>
            </div>

            <div className="space-y-5 flex-1">
                {products.length === 0 ? (
                    <div className="text-sm text-zinc-500 text-center py-10">Sin ventas</div>
                ) : products.slice(0, 10).map((p: any, i: number) => {
                    const max = products[0]?.count || 1;
                    const percent = (p.count / max) * 100;
                    return (
                        <div key={i}>
                            <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider text-zinc-400">
                                <span className="truncate max-w-[180px]">{p.name}</span>
                                <span className="text-white">{p.count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-violet-600 rounded-full"
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Main Layout ---
export function UnifiedDashboard({ stats, branches, currentBranchId, currentUser, branchStats, productStats }: UnifiedDashboardProps) {
    const { financials, repairs, stock, categoryShare } = stats;
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [zenMode, setZenMode] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filter "Recent Sales" based on selected category
    const recentSales = stats.tables?.recentSales || [];
    const filteredRecentSales = selectedCategory
        ? recentSales.filter((s: any) => s.category === selectedCategory)
        : recentSales;

    return (
        <div className={cn(
            "min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-10 selection:bg-violet-500/30 transition-all duration-500",
            zenMode ? "p-4 lg:p-4" : ""
        )}>

            {/* Header */}
            {!zenMode && (
                <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-violet-500/20">
                            <Zap size={28} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Ejecutivo</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const newState = !zenMode;
                            setZenMode(newState);
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('zen-mode-change', { detail: { collapsed: newState } }));
                            }
                        }}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                        title="Modo Zen"
                    >
                        <Maximize2 size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Modo Zen</span>
                    </button>
                    <button
                        onClick={async () => {
                            if (!confirm("¿Seguro que quieres limpiar las imágenes corruptas de toda la base de datos?")) return;
                            const res = await cleanupCorruptedImagesAction();
                            if (res.success) toast.success(res.message);
                            else toast.error(res.error);
                        }}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors flex items-center gap-2"
                        title="Limpiar Fotos Corruptas"
                    >
                        <Trash2 size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Limpiar Fotos</span>
                    </button>
                </header>
            )}

            {zenMode && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => {
                            setZenMode(false);
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('zen-mode-change', { detail: { collapsed: false } }));
                            }
                        }}
                        className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                        <Minimize2 size={24} />
                    </button>
                </div>
            )}

            {/* Smart Insights (Collapsible) */}
            {!zenMode && <SmartInsights stats={stats} />}

            {/* Filters */}
            {!zenMode && (
                <div className="mb-10 overflow-x-auto pb-4 scrollbar-hide">
                    <BranchFilter branches={branches} currentBranchId={currentBranchId} />
                </div>
            )}

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Ingresos Mensuales"
                    value={fmtMoney(financials.revenue)}
                    accentColor="blue"
                    icon={DollarSign}
                    trend={{ value: `${financials.salesGrowth > 0 ? '+' : ''}${financials.salesGrowth.toFixed(1)}%`, positive: financials.salesGrowth >= 0 }}
                    subtext="vs mes anterior"
                />
                <MetricCard
                    title="Ganancia Neta"
                    value={fmtMoney(financials.profit)}
                    accentColor="emerald"
                    icon={CheckCircle2}
                    trend={{ value: `+${financials.profitMargin.toFixed(1)}%`, positive: true }}
                    subtext="Margen real"
                />
                <MetricCard
                    title="Reparaciones Activas"
                    value={`${repairs.active}`}
                    accentColor="violet"
                    icon={Wrench}
                    trend={{ value: "En Taller", positive: true }}
                    subtext={`${repairs.highPriority} Urgentes`}
                />
                <MetricCard
                    title="Gasto en Repuestos"
                    value={fmtMoney(stock.health)} // stock.health now holds the monetary cost
                    accentColor="orange"
                    icon={Package}
                    trend={{ value: "Costo Mensual", positive: false }} // Red/Neutral since it's an expense? Or just info. Let's make it neutral-ish or just 'info'
                    subtext="Costo de repuestos usados"
                />
            </div>

            {/* Middle Row: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 h-[450px]">
                    <ProfitDonut
                        data={categoryShare.segments}
                        total={categoryShare.total}
                        onCategorySelect={setSelectedCategory}
                        selectedCategory={selectedCategory}
                    />
                </div>
                <div className="lg:col-span-1 h-[450px]">
                    <TechLeaderboard technicians={repairs.technicians} />
                </div>
            </div>

            {/* EXPANSION: REPAIR INSIGHTS (NEW) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Monthly Status Distribution */}
                <div className="h-[500px]">
                    <RepairsByStatusChart data={repairs.monthlyStatusDistribution} />
                </div>

                {/* Undelivered by Branch */}
                {branchStats && (
                    <div className="h-[500px]">
                        <BranchUndeliveredChart
                            data={branchStats.undeliveredChartData}
                            keys={branchStats.statusKeys}
                        />
                    </div>
                )}
            </div>

            {/* Expansion: Profit, Growth & Stock Health Charts */}
            {!zenMode && branchStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    <BranchProfitChart data={branchStats.branchProfits} />
                    <BranchGrowthChart data={branchStats.growthStats} />
                    <BranchStockHealthChart data={branchStats.stockHealthStats} />
                </div>
            )}

            {/* Expansion: Low Stock Table */}
            {productStats && productStats.lowStock.length > 0 && (
                <div className="mb-8">
                    <ReplenishmentTable data={productStats.lowStock} />
                </div>
            )}

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StockAlertsWidget alerts={stock.alerts} health={stock.health} />

                {/* Replaced TopProducts with Recent Sales Table if available, or keep TopProducts? */}
                {/* Actually, let's use the recent sales data we added for a new widget 'Recent Transactions' */}
                {/* But to keep layout, let's replace TopProductsWidget with a 'Transaction Feed' if we have data, or keep it. */}
                {/* Let's keep TopProducts but add Recent Sales below or swap one. */}
                {/* The user asked for Drill Down. Let's make the 2nd widget dynamic. */}

                <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full col-span-1">
                    <div className="mb-4">
                        <h3 className="font-bold text-lg text-white mb-1">
                            {selectedCategory ? `Ventas: ${selectedCategory}` : "Últimas Ventas"}
                        </h3>
                        <p className="text-sm text-zinc-500">Transacciones recientes</p>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-800">
                        {filteredRecentSales.length === 0 ? (
                            <div className="text-zinc-500 text-sm text-center py-4">Sin ventas recientes en esta categoría</div>
                        ) : (
                            filteredRecentSales.map((sale: any, i: number) => (
                                <div key={i} className="flex items-center justify-between border-b border-zinc-900/50 pb-2 last:border-0 hover:bg-zinc-900/30 p-2 rounded-lg transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">#{sale.saleNumber}</span>
                                        <span className="text-xs text-zinc-500">
                                            {isMounted ? new Date(sale.createdAt).toLocaleDateString() : '...'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-emerald-400 block">{fmtMoney(sale.total)}</span>
                                        <span className="text-[10px] text-zinc-600 uppercase">{sale.branchName}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <PartsTable parts={repairs.frequentParts} />
            </div>

        </div>
    );
}

// Keep the old inline components (TechPerformance is replaced) but others are needed unless we extract them.
// I'll keep the ones not replaced (StockAlertsWidget, PartsTable) here for now to avoid errors, 
// as I didn't extract them to files yet.

// ... (Keeping existing inline components below, EXCEPT ProfitDonut and TechPerformance which are replaced) ...
// End of file
