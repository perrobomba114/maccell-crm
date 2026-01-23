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

// --- Sub-Components ---

// 1. Metric Card (Refined for Large Numbers & Clickable)
import Link from "next/link"; // Ensure Link is imported if not globally available, usually fine to rename/import inside. 
// Actually Link global import is better. checking file imports... it is NOT imported yet.
// I can't inject import easily with this tool at top. I see "use client" at top.
// I will use fully qualified name or just assume I'll add import at top later? No, duplicate imports logic.
// The file has imports at 3-24. 
// I will rely on the fact that I can't easily add import statement far away unless I replace a larger chunk or use multi_replace.
// I'll assume I can add it to the component or use standard <a> or replace the imports area.
// Best approach: Replace the component AND the imports section if needed? 
// Actually, `Link` is standard next.js. 
// I'll use multi_replace_file_content to add import and update component.

function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon, href }: any) {
    const colorMap: any = {
        blue: "from-blue-600/20 to-blue-600/5 text-blue-500 border-blue-600/20",
        emerald: "from-emerald-600/20 to-emerald-600/5 text-emerald-500 border-emerald-600/20",
        violet: "from-violet-600/20 to-violet-600/5 text-violet-500 border-violet-600/20",
        orange: "from-orange-600/20 to-orange-600/5 text-orange-500 border-orange-600/20"
    };

    const styles = colorMap[accentColor] || colorMap.blue;
    const valueStr = String(value);
    const isLong = valueStr.length > 10;
    const isVeryLong = valueStr.length > 14;

    const Content = () => (
        <>
            {/* Background Glow */}
            <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 bg-gradient-to-br", styles)}></div>

            <div className="flex justify-between items-start z-10 relative">
                <div className="flex-1 w-full overflow-hidden">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-zinc-400 transition-colors">{title}</p>
                    <div className="flex items-baseline gap-1 w-full">
                        <h3 className={cn(
                            "font-bold text-white tracking-tight truncate leading-none",
                            isVeryLong ? "text-xl" : isLong ? "text-2xl" : "text-3xl"
                        )} title={valueStr}>
                            {value}
                        </h3>
                    </div>
                </div>
                <div className={cn("p-2.5 rounded-xl ml-3 flex-shrink-0 bg-zinc-900/50 border border-current opacity-80", styles.split(" ")[2], styles.split(" ")[3])}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 z-10 relative">
                {trend && (
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1",
                        trend.positive ? "bg-emerald-500/10 text-emerald-500" : (accentColor === 'orange' ? "bg-zinc-800 text-zinc-400" : "bg-red-500/10 text-red-500")
                    )}>
                        {trend.positive ? "↑" : (accentColor === 'orange' ? "•" : "↓")} {trend.value}
                    </span>
                )}
                <span className="text-xs text-zinc-500 font-medium truncate group-hover:text-zinc-400 transition-colors">{subtext}</span>
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={cn(
                "relative overflow-hidden rounded-2xl p-6 border border-zinc-800/50 bg-[#18181b] flex flex-col justify-between h-full min-h-[140px] hover:border-zinc-700 hover:bg-zinc-900/50 transition-all shadow-sm group cursor-pointer"
            )}>
                <Content />
            </Link>
        );
    }

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-6 border border-zinc-800/50 bg-[#18181b] flex flex-col justify-between h-full min-h-[140px] hover:border-zinc-700 transition-all shadow-sm group"
        )}>
            <Content />
        </div>
    );
}

// 3. Tech Performance - Redesigned (Modern Leaderboard)
function TechPerformance({ technicians }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 h-full flex flex-col overflow-hidden text-zinc-100">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Top Técnicos</h3>
                    <p className="text-sm text-zinc-400">Líderes en reparaciones</p>
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

// 4. Stock Alerts Widget (Redesigned - Modern Cards)
function StockAlertsWidget({ alerts, health }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Alertas Criticas</h3>
                    <p className="text-sm text-zinc-500">Stock por agotarse</p>
                </div>
                <div className="bg-red-500/10 p-2 rounded-lg text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar max-h-[350px]">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 py-10">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-sm font-medium">Inventario Saludable</span>
                    </div>
                ) : (
                    alerts.slice(0, 15).map((item: any, i: number) => {
                        // Determine urgency color
                        const isCritical = item.quantity <= 1;
                        const colorClass = isCritical ? "bg-red-500" : "bg-orange-500";
                        const textClass = isCritical ? "text-red-500" : "text-orange-500";
                        const borderClass = isCritical ? "border-red-500/20" : "border-orange-500/20";
                        const bgClass = isCritical ? "bg-red-500/5 hover:bg-red-500/10" : "bg-orange-500/5 hover:bg-orange-500/10";

                        return (
                            <div key={i} className={cn(
                                "relative overflow-hidden rounded-xl p-3 border transition-all duration-300 group",
                                borderClass, bgClass
                            )}>
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[150px] lg:max-w-[180px]">
                                            {item.productName}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                                            {item.branchName}
                                        </span>
                                    </div>
                                    <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-sm", borderClass, "bg-[#18181b]")}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colorClass)}></div>
                                        <span className={textClass}>{item.quantity} un.</span>
                                    </div>
                                </div>

                                {/* Visual Progress Bar hinting at scarcity */}
                                <div className="h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden mt-1">
                                    <div className={cn("h-full rounded-full w-[15%]", colorClass)}></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// 5. Top Parts Widget (Redesigned - Visual Leaderboard)
function PartsTable({ parts }: any) {
    // Determine max usage for relative bars
    const maxUsage = parts.length > 0 ? parts[0].usage : 1;

    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Repuestos Top</h3>
                    <p className="text-sm text-zinc-500">Mayor rotación en taller</p>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <Package size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 max-h-[350px]">
                {parts.slice(0, 10).map((p: any, i: number) => {
                    const percent = (p.usage / maxUsage) * 100;
                    return (
                        <div key={i} className="group">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold border border-zinc-800",
                                        i < 3 ? "bg-zinc-800 text-white" : "bg-transparent text-zinc-500"
                                    )}>
                                        #{i + 1}
                                    </div>
                                    <span className="text-sm text-zinc-300 font-medium truncate group-hover:text-white transition-colors">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-white block">{p.usage}</span>
                                        <span className="text-[9px] text-zinc-500 uppercase">Usados</span>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Bar */}
                            <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                {/* Background Track */}
                                <div className="absolute inset-0 bg-zinc-800/30"></div>
                                {/* Fill */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-1000"
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>

                            {/* Stock Status Mini-Indicator */}
                            <div className="flex justify-end mt-1">
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                    p.stock <= 2 ? "text-red-400 border-red-500/20 bg-red-500/5" : "text-zinc-500 border-zinc-800 bg-zinc-900"
                                )}>
                                    {p.stock <= 2 ? <AlertTriangle size={8} /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                    Stock: {p.stock}
                                </span>
                            </div>
                        </div>
                    );
                })}
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

// Timeline Feed Component
function SalesFeedTimeline({ sales, mounted }: { sales: any[], mounted: boolean }) {
    if (!sales || sales.length === 0) {
        return <div className="text-zinc-500 text-sm text-center py-10 bg-zinc-900/30 rounded-xl">Sin actividad reciente</div>;
    }

    return (
        <div className="relative pl-4 border-l border-zinc-800 space-y-8 py-2">
            {sales.map((sale: any, i: number) => (
                <div key={i} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full bg-zinc-900 border-2 border-zinc-700 group-hover:border-violet-500 group-hover:bg-violet-500 transition-colors shadow-sm"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900 hover:border-violet-500/30 transition-all hover:shadow-lg hover:shadow-violet-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
                                #{sale.saleNumber?.toString().slice(-2) || "??"}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">
                                    Venta #{sale.saleNumber}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover:border-zinc-700">
                                        {sale.branchName}
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                        {mounted ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-base font-bold text-white block">{fmtMoney(sale.total)}</span>
                            <span className="text-[10px] text-zinc-500">{sale.paymentMethod || 'Efectivo'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- Main Layout ---
export function UnifiedDashboard({ stats, branches, currentBranchId, currentUser, branchStats, productStats }: UnifiedDashboardProps) {
    const { financials, repairs, stock, categoryShare } = stats;
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8 xl:p-10 selection:bg-violet-500/30">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-zinc-900/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-sm">
                        <Zap size={24} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Ejecutivo</h1>
                        <p className="text-zinc-500 text-sm">Visión general del negocio</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (!confirm("¿Seguro que quieres limpiar las imágenes corruptas de toda la base de datos?")) return;
                            const res = await cleanupCorruptedImagesAction();
                            if (res.success) toast.success(res.message);
                            else toast.error(res.error);
                        }}
                        className="p-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <Trash2 size={16} />
                        Limpiar Fotos
                    </button>
                </div>
            </header>

            {/* Smart Insights */}
            <div className="mb-8">
                <SmartInsights stats={stats} />
            </div>

            {/* Filters */}
            <div className="mb-8">
                <BranchFilter branches={branches} currentBranchId={currentBranchId} />
            </div>

            {/* SECTION 1: FINANCIAL OVERVIEW */}
            <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-white">Finanzas & Operaciones</h2>
                    <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <MetricCard
                        title="Ingresos Mensuales"
                        value={fmtMoney(financials.revenue)}
                        accentColor="blue"
                        icon={DollarSign}
                        trend={{ value: `${financials.salesGrowth > 0 ? '+' : ''}${financials.salesGrowth.toFixed(1)}%`, positive: financials.salesGrowth >= 0 }}
                        subtext="vs mes anterior"
                        href="/admin/sales"
                    />
                    <MetricCard
                        title="Ganancia Neta"
                        value={fmtMoney(financials.profit)}
                        accentColor="emerald"
                        icon={CheckCircle2}
                        trend={{ value: `+${financials.profitMargin.toFixed(1)}%`, positive: true }}
                        subtext="Margen real"
                        href="/admin/statistics"
                    />
                    <MetricCard
                        title="Reparaciones Activas"
                        value={`${repairs.active}`}
                        accentColor="violet"
                        icon={Wrench}
                        trend={{ value: "En Taller", positive: true }}
                        subtext={`${repairs.highPriority} Urgentes`}
                        href="/admin/repairs"
                    />
                    <MetricCard
                        title="Gasto en Repuestos"
                        value={fmtMoney(stock.health)}
                        accentColor="orange"
                        icon={Package}
                        trend={{ value: "Costo Mes", positive: false }}
                        subtext="Costo de repuestos usados"
                        href="/admin/repuestos"
                    />
                </div>

                {/* Charts Row: Profit Distribution & Tech Leaderboard */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 min-h-[400px]">
                        {/* Using the Donut Chart for profit Segments (Categories) */}
                        <ProfitDonut
                            data={categoryShare.segments}
                            total={categoryShare.total}
                            onCategorySelect={setSelectedCategory}
                            selectedCategory={selectedCategory}
                        />
                    </div>
                    <div className="xl:col-span-1 min-h-[400px]">
                        <TechLeaderboard technicians={repairs.technicians} />
                    </div>
                </div>
            </div>

            {/* SECTION 2: OPERATIONS DETAIL */}
            <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-white">Detalle Operativo</h2>
                    <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Status Distribution Chart */}
                    <div className="h-[450px]">
                        <RepairsByStatusChart data={repairs.monthlyStatusDistribution} />
                    </div>

                    {/* Pending by Branch (If available) */}
                    {branchStats && (
                        <div className="min-h-[450px]">
                            <BranchUndeliveredChart
                                data={branchStats.undeliveredChartData}
                                keys={branchStats.statusKeys}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 3: INVENTORY CONTROL (Split Section) */}
            <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-white">Control de Inventario</h2>
                    <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Stock Alerts */}
                    <div className="col-span-1 h-full min-h-[350px]">
                        <StockAlertsWidget alerts={stock.alerts} health={stock.health} />
                    </div>

                    {/* 2. Top Parts (High Rotation) */}
                    <div className="col-span-1 h-full min-h-[350px]">
                        <PartsTable parts={repairs.frequentParts} />
                    </div>
                </div>
                {/* Low Stock Replenishment Table (If Data Exists) */}
                {productStats && productStats.lowStock.length > 0 && (
                    <div className="mt-8">
                        <ReplenishmentTable data={productStats.lowStock} />
                    </div>
                )}
            </div>

            {/* SECTION 4: RECENT TRANSACTIONS (New Section) */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-white">Últimas Transacciones</h2>
                    <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
                </div>

                <div className="grid grid-cols-1">
                    {/* Recent Transactions Feed - Full Width for clarity */}
                    <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full min-h-[300px]">
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-white mb-1">
                                    {selectedCategory ? `Ventas: ${selectedCategory}` : "Feed de Ventas"}
                                </h3>
                                <p className="text-sm text-zinc-500">Actividad en tiempo real de todas las sucursales</p>
                            </div>
                            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                                <DollarSign size={18} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px] scrollbar-thin scrollbar-thumb-zinc-800">
                            <SalesFeedTimeline sales={filteredRecentSales} mounted={isMounted} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-zinc-600 text-xs py-4 border-t border-zinc-900">
                MacCell CRM v2.5 • Panel Ejecutivo Unificado
            </div>
        </div >
    );
}

// Keep the old inline components (TechPerformance is replaced) but others are needed unless we extract them.
// I'll keep the ones not replaced (StockAlertsWidget, PartsTable) here for now to avoid errors, 
// as I didn't extract them to files yet.

// ... (Keeping existing inline components below, EXCEPT ProfitDonut and TechPerformance which are replaced) ...
// End of file
