"use client";

import Link from "next/link";
import { DollarSign, CheckCircle2, Wrench, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper utils
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon, href }: any) {
    const colorMap: any = {
        emerald: "bg-emerald-600 border-emerald-500 text-white",
        blue: "bg-blue-600 border-blue-500 text-white",
        violet: "bg-violet-600 border-violet-500 text-white",
        orange: "bg-orange-600 border-orange-500 text-white",
        pink: "bg-pink-600 border-pink-500 text-white",
    };

    const styles = colorMap[accentColor] || colorMap.blue;

    const Content = () => (
        <>
            {/* Background Glow removed for solid style */}

            <div className="flex justify-between items-start z-10 relative mb-4">
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors mt-1">{title}</p>
                <div className={cn("p-2 rounded-lg flex-shrink-0 flex items-center justify-center backdrop-blur-sm",
                    accentColor === 'emerald' ? "bg-emerald-500" :
                        accentColor === 'blue' ? "bg-blue-500" :
                            accentColor === 'violet' ? "bg-violet-500" :
                                accentColor === 'orange' ? "bg-orange-500" : "bg-zinc-700"
                )}>
                    <Icon size={18} strokeWidth={2} className="text-white" />
                </div>
            </div>

            <div className="z-10 relative mb-4 flex-grow">
                <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight truncate" title={String(value)}>
                    {value}
                </h3>
            </div>

            <div className="flex items-center gap-2 z-10 relative mt-auto">
                {trend && (
                    <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1",
                        trend.positive ? "bg-emerald-500/20 text-white" : (accentColor === 'orange' ? "bg-white/20 text-white" : "bg-red-500/20 text-white")
                    )}>
                        {trend.positive ? "↑" : (accentColor === 'orange' ? "•" : "↓")} {trend.value}
                    </span>
                )}
                <span className="text-xs text-white/70 font-medium truncate group-hover:text-white transition-colors">{subtext}</span>
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={cn(
                "relative overflow-hidden rounded-2xl p-5 border flex flex-col h-full transition-all shadow-sm group cursor-pointer hover:shadow-md hover:brightness-110",
                styles
            )}>
                <Content />
            </Link>
        );
    }

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-5 border flex flex-col h-full transition-all shadow-sm group hover:shadow-md",
            styles
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
                    title="Garantías del Mes"
                    value={stock.criticalCount} // Using recycled field
                    accentColor="orange"
                    icon={Wrench} // Or RotateCcw/ShieldAlert if imported
                    trend={{ value: "Reingresos", positive: false }}
                    subtext="Equipos reingresados por garantía"
                    href="/admin/repairs"
                />
            </div>
        </div>
    );
}
