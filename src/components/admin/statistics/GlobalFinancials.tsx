"use client";

import { DollarSign, Wallet, Wrench, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Metric Card Component (Inline for now to avoid cross-module mess, or reuse if exported) ---
// I'll reuse the logic here to keep it self-contained for Statistics page theme

function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon }: any) {
    const colorMap: any = {
        emerald: "from-emerald-600/20 to-emerald-600/5 text-emerald-500 border-emerald-600/20",
        blue: "from-blue-600/20 to-blue-600/5 text-blue-500 border-blue-600/20",
        violet: "from-violet-600/20 to-violet-600/5 text-violet-500 border-violet-600/20",
        orange: "from-orange-600/20 to-orange-600/5 text-orange-500 border-orange-600/20",
        pink: "from-pink-600/20 to-pink-600/5 text-pink-500 border-pink-600/20",
    };

    const styles = colorMap[accentColor] || colorMap.blue;
    const isPositive = trend?.value >= 0;

    return (
        <div className="relative overflow-hidden rounded-2xl p-5 border border-zinc-800/50 bg-[#18181b] flex flex-col h-full hover:border-zinc-700 transition-all shadow-sm group">
            {/* Background Glow */}
            <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 bg-gradient-to-br", styles)}></div>

            <div className="flex justify-between items-start z-10 relative mb-4">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider group-hover:text-zinc-400 transition-colors mt-1">{title}</p>
                <div className={cn("p-2 rounded-lg flex-shrink-0 bg-zinc-900/50 border border-current opacity-80", styles.split(" ")[2], styles.split(" ")[3])}>
                    <Icon size={18} strokeWidth={2} />
                </div>
            </div>

            <div className="z-10 relative mb-4 flex-grow">
                <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight truncate" title={String(value)}>
                    {value}
                </h3>
            </div>

            <div className="flex items-center gap-2 z-10 relative mt-auto">
                {trend && (
                    <div className={cn(
                        "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                        isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
                <span className="text-xs text-zinc-500 font-medium truncate">{subtext}</span>
            </div>
        </div>
    );
}

interface GlobalFinancialsProps {
    globalStats: any;
    repairStats: any; // We need phonesInShop from repairStats
}

export function GlobalFinancials({ globalStats, repairStats }: GlobalFinancialsProps) {
    if (!globalStats) return null;

    // Format money
    const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

    return (
        <div className="space-y-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ROW 1: General Business Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
                    value={repairStats?.phonesInShop || 0}
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

            {/* ROW 2: Specific Operational Stats (Requested) */}
            <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider pl-1">Métricas Operativas (Mensual)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard
                    title="Gasto en Repuestos"
                    value={fmtMoney(globalStats.sparePartsCost || 0)}
                    subtext="Costo de repuestos usados"
                    accentColor="orange"
                    icon={Wrench}
                />
                <MetricCard
                    title="Ganancia Reparaciones"
                    value={fmtMoney(globalStats.repairProfit || 0)}
                    subtext="Cobrado - Costo Repuesto"
                    accentColor="emerald"
                    icon={TrendingUp}
                />
                <MetricCard
                    title="Equipos Entregados"
                    value={globalStats.deliveredCount || 0}
                    subtext="Finalizados y Entregados"
                    accentColor="blue"
                    icon={Wallet}
                />
                <MetricCard
                    title="Premios Pagados"
                    value={fmtMoney(globalStats.bonusesPaid || 0)}
                    subtext="Comisiones a vendedores"
                    accentColor="pink"
                    icon={DollarSign}
                />
            </div>
        </div>
    );
}
