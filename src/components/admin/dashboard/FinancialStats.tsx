"use client";

import Link from "next/link";
import { DollarSign, CheckCircle2, Wrench, Package, ShieldAlert, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper utils
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon, href }: any) {
    const strategies: any = {
        violet: { bg: "bg-violet-600", text: "text-white", icon: "bg-violet-500", border: "border-violet-400" },
        blue: { bg: "bg-blue-600", text: "text-white", icon: "bg-blue-500", border: "border-blue-400" },
        emerald: { bg: "bg-emerald-600", text: "text-white", icon: "bg-emerald-500", border: "border-emerald-400" },
        orange: { bg: "bg-orange-600", text: "text-white", icon: "bg-orange-500", border: "border-orange-400" },
        pink: { bg: "bg-pink-600", text: "text-white", icon: "bg-pink-500", border: "border-pink-400" },
    };

    const style = strategies[accentColor] || strategies.blue;

    const Content = () => (
        <>
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={120} />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-2 rounded-lg border border-white/20 shadow-inner text-white", style.icon)}>
                            <Icon size={20} />
                        </div>
                        {trend && (
                            <div className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full border border-white/20 text-white">
                                {trend.positive ? "↑" : "↓"} {trend.value}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-white tracking-tighter mb-0.5 tabular-nums leading-none">
                            {value}
                        </h3>
                        <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">{title}</p>
                    </div>
                </div>

                {subtext && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="truncate">{subtext}</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={cn(
                "group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden border-2 shadow-lg h-full",
                style.bg,
                style.border
            )}>
                <Content />
            </Link>
        );
    }

    return (
        <div className={cn(
            "group relative p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden border-2 shadow-lg h-full",
            style.bg,
            style.border
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

            {/* Financial & General Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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
                    title="Total Equipos"
                    value={stock.deliveredCount || 0}
                    accentColor="orange"
                    icon={Package}
                    subtext="Entregados este mes"
                    href="/admin/statistics"
                />
            </div>

            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Rendimiento Operativo</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            {/* Operational Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <MetricCard
                    title="Garantías"
                    value={stock.warrantiesCount || 0}
                    accentColor="orange"
                    icon={ShieldAlert}
                    subtext="Mes actual"
                />
                <MetricCard
                    title="Equipos OK"
                    value={stock.okCount || 0}
                    accentColor="emerald"
                    icon={CheckCircle2}
                    subtext="Estado final exitoso"
                />
                <MetricCard
                    title="Equipos No OK"
                    value={stock.noRepairCount || 0}
                    accentColor="pink"
                    icon={XCircle}
                    subtext="Sin reparación"
                />
                <MetricCard
                    title="Eficiencia"
                    value={`${stock.efficiency}%`}
                    accentColor="violet"
                    icon={Zap}
                    subtext="Tasa de éxito"
                />
            </div>
        </div>
    );
}
