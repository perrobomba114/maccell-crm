"use client";

import { CheckCircle2, DollarSign, Plus, Smartphone, Store, Wrench } from "lucide-react";
import Link from "next/link";
import {
    ActivityFeed,
    BestSellers,
    formatMoney,
    formatNumber,
    MetricCard,
    PickupQueue,
    SalesTrend
} from "./vendor-dashboard-widgets";
import { type VendorStats, type VendorUser } from "./vendor-dashboard-types";

export function UnifiedVendorDashboard({ stats, user }: { stats: VendorStats; user: VendorUser }) {
    const readyForPickup = stats.readyForPickup ?? [];
    const salesLast7Days = stats.salesLast7Days ?? [];
    const topSellingProducts = stats.topSellingProducts ?? [];
    const recentActivity = stats.recentActivity ?? [];
    const deliveredCount = stats.deliveredCount ?? 0;
    const okCount = stats.okCount ?? 0;
    const efficiency = deliveredCount > 0 ? Math.round((okCount / deliveredCount) * 100) : 0;
    const growth = stats.salesMonthGrowth ?? 0;

    return (
        <div className="relative -m-6 min-h-[calc(100dvh-4rem)] overflow-hidden bg-black text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[auto,auto,42px_42px,42px_42px]" />
            <main className="relative mx-auto flex max-w-[1800px] flex-col gap-5 p-4 md:p-6">
                <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                            <Store className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-normal text-zinc-500">{user.branch?.name || "Sucursal"}</p>
                            <h1 className="truncate text-2xl font-black tracking-normal text-white md:text-3xl">Dashboard vendedor</h1>
                            <p className="mt-1 truncate text-sm font-medium text-zinc-500">Hola, {user.name}. Foco en ventas, entregas y próximos retiros.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/vendor/pos" className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-300">
                            <Plus className="h-4 w-4" />
                            Nueva venta
                        </Link>
                        <Link href="/vendor/repairs/create" className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100 transition-colors hover:bg-cyan-300/20">
                            <Wrench className="h-4 w-4" />
                            Ingreso taller
                        </Link>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        title="Ventas del mes"
                        value={formatMoney(stats.salesMonthTotal)}
                        detail={`${formatNumber(stats.salesMonthCount)} operaciones · ${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                        href="/vendor/sales"
                        icon={DollarSign}
                        tone="emerald"
                    />
                    <MetricCard
                        title="Ingresos taller"
                        value={formatNumber(stats.repairsIntakeMonth)}
                        detail={`${formatMoney(stats.repairRevenueMonth)} cobrados en reparaciones`}
                        href="/vendor/repairs/active"
                        icon={Wrench}
                        tone="cyan"
                    />
                    <MetricCard
                        title="Para retirar"
                        value={formatNumber(readyForPickup.length)}
                        detail="Equipos finalizados esperando entrega"
                        href="/vendor/repairs/active"
                        icon={Smartphone}
                        tone="amber"
                    />
                    <MetricCard
                        title="Eficiencia OK"
                        value={`${efficiency}%`}
                        detail={`${formatNumber(okCount)} OK · ${formatNumber(stats.noRepairCount)} sin reparación`}
                        href="/vendor/repairs/history"
                        icon={CheckCircle2}
                        tone="rose"
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <SalesTrend data={salesLast7Days} />
                    <BestSellers data={topSellingProducts} />
                    <PickupQueue items={readyForPickup} />
                    <ActivityFeed activities={recentActivity} />
                </section>
            </main>
        </div>
    );
}
