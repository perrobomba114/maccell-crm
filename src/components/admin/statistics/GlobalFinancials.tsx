"use client";

import { DollarSign, Wallet, Wrench, TrendingUp, TrendingDown, CheckCircle2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Metric Card Component ---
function MetricCard({ title, value, subtext, trend, accentColor, icon: Icon }: any) {
    const colorMap: any = {
        emerald: "bg-emerald-600 border-emerald-500 text-white",
        blue: "bg-blue-600 border-blue-500 text-white",
        violet: "bg-violet-600 border-violet-500 text-white",
        orange: "bg-orange-600 border-orange-500 text-white",
        pink: "bg-pink-600 border-pink-500 text-white",
        red: "bg-red-600 border-red-500 text-white",
    };

    const containerStyle = colorMap[accentColor] || colorMap.blue;
    const iconStyle = accentColor === "emerald" ? "bg-emerald-500 text-white" :
        accentColor === "blue" ? "bg-blue-500 text-white" :
            accentColor === "violet" ? "bg-violet-500 text-white" :
                accentColor === "orange" ? "bg-orange-500 text-white" :
                    accentColor === "red" ? "bg-red-500 text-white" :
                        "bg-pink-500 text-white";

    const isPositive = trend?.value >= 0;

    return (
        <div className={cn("relative overflow-hidden rounded-2xl p-6 border flex flex-col justify-between h-full min-h-[140px] transition-all shadow-sm hover:shadow-md", containerStyle)}>
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1 group-hover:text-white transition-colors min-h-[2rem] flex items-center">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight leading-none">{value}</h3>
                </div>
                <div className={cn("p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center backdrop-blur-sm", iconStyle)}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 z-10 relative">
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
                        isPositive ? "bg-emerald-500/20 text-white" : "bg-red-500/20 text-white"
                    )}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
                <span className={cn(
                    "font-medium truncate",
                    (title.includes("OK") || title.includes("Reparación") || title.includes("Eficiencia")) ? "text-sm text-white font-bold" : "text-xs text-white/70"
                )}>{subtext}</span>
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
