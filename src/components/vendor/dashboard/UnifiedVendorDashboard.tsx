"use client";

import {
    Store,
    Plus,
    Smartphone,
    Wrench,
    DollarSign,
    ShoppingBag,
    Clock,
    CheckCircle2,
    Phone,
    ArrowUpRight,
    Package
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SalesWeekChart } from "./VendorCharts";
import { BestSellersChart } from "./BestSellersChart";

const fmtMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
};

interface UnifiedVendorDashboardProps {
    stats: any;
    user: any;
}

// --- KPI Card (Standardized & Clickable) ---
function VendorMetric({ title, value, icon: Icon, color, subtext, trend, href }: any) {
    const colors: any = {
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };

    return (
        <Link href={href || "#"} className="group relative p-6 rounded-2xl bg-[#18181b] border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all flex flex-col justify-between overflow-hidden">
            <div className={cn("absolute top-0 right-0 p-3 opacity-20 -mr-2 -mt-2 rounded-bl-3xl transition-transform group-hover:scale-110 duration-500", colors[color])}>
                <Icon size={40} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2 rounded-lg inline-flex", colors[color])}>
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-[10px] font-bold bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800 text-zinc-400">
                            {trend}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-zinc-400 transition-colors">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                </div>
            </div>
            {subtext && <div className="mt-4 pt-3 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">{subtext}</p>
            </div>}
        </Link>
    );
}

// --- Listos para Retirar (Cleaner List) ---
function PickupListWrapper({ items }: { items: any[] }) {
    if (!items?.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-500/50" />
                </div>
                <p>No hay equipos pendientes de retiro.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[300px] max-h-[400px]">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-900 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700 group-hover:border-zinc-600 transition-colors">
                                {item.customer.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-200 text-sm group-hover:text-white">{item.customer}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">#{item.ticket}</span>
                                    <span className="text-xs text-zinc-500 truncate max-w-[150px]">{item.device}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-emerald-500 text-sm">{fmtMoney(item.amount)}</span>
                            <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                                <Phone size={10} />
                                {item.phone || '-'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Activity Timeline (Condensed) ---
function RecentActivityFeed({ activities }: { activities: any[] }) {
    if (!activities?.length) return <div className="text-zinc-500 text-xs text-center py-10">Sin movimiento reciente</div>;

    return (
        <div className="space-y-6 pl-4 border-l border-zinc-800 ml-2 py-2">
            {activities.slice(0, 8).map((act, i) => (
                <div key={i} className="relative">
                    <div className={cn(
                        "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-zinc-950",
                        act.action.includes("Venta") ? "border-emerald-500" : "border-blue-500"
                    )} />
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-300">{act.action}</span>
                            <span className="text-[10px] text-zinc-600 font-mono">{act.time}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-tight">{act.details}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function UnifiedVendorDashboard({ stats, user }: UnifiedVendorDashboardProps) {
    const readyForPickup = stats.readyForPickup || [];
    const activities = stats.recentActivity || [];

    // Prepare Data for Best Sellers (Pie Chart)
    const pieData = stats.topSellingProducts || [];

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8 xl:p-10 selection:bg-orange-500/30">

            {/* 1. Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-zinc-900/50 pb-8">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                        <Store className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Panel Vendedor</h1>
                        <p className="text-zinc-500 text-sm">Bienvenido, {user.name}.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/vendor/pos" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-all shadow-lg shadow-white/5 active:scale-95">
                        <Plus size={16} />
                        Nueva Venta
                    </Link>
                    <Link href="/vendor/repairs/create" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm transition-all border border-zinc-700 hover:border-zinc-600 active:scale-95">
                        <Wrench size={16} />
                        Ingreso Taller
                    </Link>
                </div>
            </div>

            {/* 2. KPI Grid (4 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <VendorMetric
                    title="Ventas Hoy (Est.)"
                    // Usually daily info isn't in stats, assuming stats has updated month totals.
                    // Let's use what we have: Sales Month and Count
                    value={fmtMoney(stats.salesMonthTotal)}
                    subtext={`${stats.salesMonthCount} Operaciones este mes`}
                    icon={DollarSign}
                    color="emerald"
                    trend={`${stats.salesMonthCount} Ops`}
                    href="/vendor/sales"
                />
                <VendorMetric
                    title="En Taller"
                    value={stats.repairsIntakeMonth}
                    subtext="Ingresados este mes"
                    icon={Wrench} // Changed from Smartphone to Wrench as requested/logical
                    color="blue"
                    href="/vendor/repairs/active"
                />
                <VendorMetric
                    title="Para Retirar"
                    value={readyForPickup.length}
                    subtext="Equipos finalizados"
                    icon={Package} // Changed from ShoppingBag to Package
                    color="orange"
                    trend="Prioridad"
                    href="/vendor/repairs/active"
                />
                <VendorMetric
                    title="Entregados"
                    value={(stats as any).repairCountMonth || 0}
                    subtext="Reparaciones completadas"
                    icon={CheckCircle2}
                    color="violet"
                    href="/vendor/repairs/history"
                />
            </div>

            {/* 3. Main Business Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 items-start">
                {/* Column 1 & 2: Sales Chart */}
                <div className="xl:col-span-2 min-h-[400px]">
                    <SalesWeekChart data={stats.salesLast7Days || []} />
                </div>

                {/* Column 3: Best Sellers (Pie) */}
                <div className="xl:col-span-1 min-h-[400px]">
                    <BestSellersChart data={pieData} />
                </div>
            </div>

            {/* 4. Operations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pickup List (2 Cols) */}
                <div className="lg:col-span-2 bg-[#18181b] rounded-2xl border border-zinc-800 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="text-orange-500" size={20} />
                                Equipos Listos para Retirar
                            </h2>
                            <p className="text-zinc-500 text-sm">Contactar clientes para entrega</p>
                        </div>
                        <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/20">
                            {readyForPickup.length} Pendientes
                        </div>
                    </div>
                    <PickupListWrapper items={readyForPickup} />
                </div>

                {/* Recent Activity (1 Col) */}
                <div className="lg:col-span-1 bg-[#18181b] rounded-2xl border border-zinc-800 p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="text-blue-500" size={20} />
                            Actividad Reciente
                        </h2>
                        <p className="text-zinc-500 text-sm">Flujo de trabajo</p>
                    </div>
                    <RecentActivityFeed activities={activities} />
                </div>
            </div>
        </div>
    );
}
