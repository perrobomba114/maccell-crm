"use client";

import { DollarSign, Wallet, Wrench, TrendingUp, TrendingDown, CheckCircle2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Metric Card Component ---
function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon }: any) {
    const strategies: any = {
        violet: { bg: "bg-violet-600", text: "text-white", icon: "bg-violet-500", border: "border-violet-400" },
        blue: { bg: "bg-blue-600", text: "text-white", icon: "bg-blue-500", border: "border-blue-400" },
        emerald: { bg: "bg-emerald-600", text: "text-white", icon: "bg-emerald-500", border: "border-emerald-400" },
        orange: { bg: "bg-orange-600", text: "text-white", icon: "bg-orange-500", border: "border-orange-400" },
        pink: { bg: "bg-pink-600", text: "text-white", icon: "bg-pink-500", border: "border-pink-400" },
        red: { bg: "bg-red-600", text: "text-white", icon: "bg-red-500", border: "border-red-400" },
    };

    const style = strategies[accentColor] || strategies.blue;
    const isPositive = trend?.value >= 0;

    return (
        <div className={cn(
            "group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden border-2 shadow-lg min-h-[140px]",
            style.bg,
            style.border
        )}>
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
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border border-white/20 text-white",
                                "bg-white/20"
                            )}>
                                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                <span>{Math.abs(trend.value)}%</span>
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
        </div>
    );
}

interface GlobalFinancialsProps {
    globalStats: any;
    repairStats: any;
}

export function GlobalFinancials({ globalStats, repairStats }: GlobalFinancialsProps) {
    if (!globalStats) return null;

    const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

    return (
        <div className="space-y-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ROW 1: Negocio */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard
                    title="Facturación Total"
                    value={fmtMoney(globalStats.salesThisMonth)}
                    subtext="Ingresos brutos"
                    trend={{ value: globalStats.growthPercent }}
                    accentColor="blue"
                    icon={DollarSign}
                />
                <MetricCard
                    title="Ganancia Estimada"
                    value={fmtMoney(globalStats.profitThisMonth)}
                    subtext="Margen real proyectado"
                    accentColor="emerald"
                    icon={Wallet}
                />
                <MetricCard
                    title="Equipos en Taller"
                    value={repairStats?.phonesInShop || 0}
                    subtext="En proceso actual"
                    accentColor="violet"
                    icon={Wrench}
                />
                <MetricCard
                    title="Ticket Promedio"
                    value={fmtMoney(globalStats.averageTicket || 0)}
                    subtext="Venta media"
                    accentColor="pink"
                    icon={TrendingUp}
                />
            </div>

            {/* ROW 2: Gastos y Ventas */}
            <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider pl-1 font-mono">Control Administrativo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard
                    title="Costo de Repuestos"
                    value={fmtMoney(globalStats.sparePartsCost || 0)}
                    subtext="Inversión en insumos"
                    accentColor="orange"
                    icon={Wrench}
                />
                <MetricCard
                    title="Ganancia en Taller"
                    value={fmtMoney(globalStats.repairProfit || 0)}
                    subtext="Solo mano de obra"
                    accentColor="emerald"
                    icon={TrendingUp}
                />
                <MetricCard
                    title="Comisiones Pagadas"
                    value={fmtMoney(globalStats.bonusesPaid || 0)}
                    subtext="Bonos a vendedores"
                    accentColor="pink"
                    icon={DollarSign}
                />
                <MetricCard
                    title="Tickets Emitidos"
                    value={globalStats.totalSalesCount || 0}
                    subtext="Volumen de facturas"
                    accentColor="blue"
                    icon={CheckCircle2}
                />
            </div>

            {/* ROW 3: El taller a fondo */}
            <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider pl-1 font-mono text-orange-500/80">Rendimiento Técnico (Mensual)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Equipos Reparados OK"
                    value={globalStats.okCount || 0}
                    subtext="Exitosos y Entregados"
                    accentColor="orange"
                    icon={CheckCircle2}
                />
                <MetricCard
                    title="Equipos Sin Reparación"
                    value={globalStats.noRepairCount || 0}
                    subtext="Devueltos sin solución"
                    accentColor="red"
                    icon={Ban}
                />
                <MetricCard
                    title="Eficiencia de Taller"
                    value={`${globalStats.deliveredCount > 0 ? Math.round((globalStats.okCount / globalStats.deliveredCount) * 100) : 0}%`}
                    subtext={`${globalStats.deliveredCount || 0} Entregas totales`}
                    accentColor="blue"
                    icon={TrendingUp}
                />
            </div>
        </div>
    );
}
