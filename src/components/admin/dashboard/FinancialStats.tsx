"use client";

import Link from "next/link";
import { DollarSign, CheckCircle2, Wrench, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper utils
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

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

export function FinancialStats({ stats }: { stats: any }) {
    // If we want to implement skeleton loading inside, we can accept null stats, but for now we will rely on Suspense in parent
    if (!stats) return null;

    const { financials, repairs, stock } = stats;

    return (
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
        </div>
    );
}
