"use client";

import { ArrowUpRight, Clock3, PackageCheck, Phone, ReceiptText, Smartphone } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type BestSeller, type MetricTone, type ReadyForPickup, type RecentActivity, type SalesDay } from "./vendor-dashboard-types";

const toneClasses: Record<MetricTone, { card: string; icon: string; text: string; rail: string }> = {
    emerald: {
        card: "border-emerald-300/20 bg-emerald-300/10",
        icon: "border-emerald-200/30 bg-emerald-300 text-emerald-950",
        text: "text-emerald-200",
        rail: "bg-emerald-300"
    },
    cyan: {
        card: "border-cyan-300/20 bg-cyan-300/10",
        icon: "border-cyan-200/30 bg-cyan-300 text-cyan-950",
        text: "text-cyan-200",
        rail: "bg-cyan-300"
    },
    amber: {
        card: "border-amber-300/20 bg-amber-300/10",
        icon: "border-amber-200/30 bg-amber-300 text-amber-950",
        text: "text-amber-200",
        rail: "bg-amber-300"
    },
    rose: {
        card: "border-rose-300/20 bg-rose-300/10",
        icon: "border-rose-200/30 bg-rose-300 text-rose-950",
        text: "text-rose-200",
        rail: "bg-rose-300"
    }
};

export const moneyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
});

export const numberFormatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0
});

export function formatMoney(value: number | undefined) {
    return moneyFormatter.format(value ?? 0);
}

export function formatNumber(value: number | undefined) {
    return numberFormatter.format(value ?? 0);
}

export function MetricCard({
    title,
    value,
    detail,
    href,
    icon: Icon,
    tone
}: {
    title: string;
    value: string;
    detail: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: MetricTone;
}) {
    const styles = toneClasses[tone];

    return (
        <Link
            href={href}
            className={cn(
                "group relative min-h-[8.5rem] overflow-hidden rounded-xl border p-4 shadow-xl shadow-black/15 transition-all hover:-translate-y-0.5 hover:shadow-black/25",
                styles.card
            )}
        >
            <span className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", styles.rail)} />
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-normal text-zinc-500">{title}</p>
                    <p className="mt-3 truncate font-mono text-3xl font-black leading-none tracking-normal text-white tabular-nums">
                        {value}
                    </p>
                </div>
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-lg", styles.icon)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className={cn("truncate text-xs font-bold", styles.text)}>{detail}</p>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
        </Link>
    );
}

function Panel({
    title,
    subtitle,
    icon: Icon,
    children,
    className
}: {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("rounded-xl border border-white/10 bg-zinc-950/80 p-5 shadow-xl shadow-black/20", className)}>
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-200">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-white">{title}</h2>
                    <p className="truncate text-xs font-medium text-zinc-500">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

export function SalesTrend({ data }: { data: SalesDay[] }) {
    const max = Math.max(...data.map((day) => day.total), 1);

    return (
        <Panel title="Ritmo semanal" subtitle="Ventas de los últimos 7 días" icon={ReceiptText} className="lg:col-span-2">
            <div className="flex h-72 items-end gap-3 rounded-lg border border-white/10 bg-black/25 p-4">
                {data.map((day) => {
                    const height = Math.max(8, Math.round((day.total / max) * 100));
                    return (
                        <div key={day.name} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                            <div className="flex h-52 w-full items-end rounded-md bg-white/[0.03] p-1">
                                <div
                                    className="w-full rounded-md bg-gradient-to-t from-emerald-500 to-cyan-300 shadow-lg shadow-cyan-500/10"
                                    style={{ height: `${height}%` }}
                                    title={formatMoney(day.total)}
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-mono text-xs font-black text-white">{day.name}</p>
                                <p className="mt-1 max-w-[5rem] truncate text-[10px] font-bold text-zinc-500">{formatMoney(day.total)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

export function BestSellers({ data }: { data: BestSeller[] }) {
    const max = Math.max(...data.map((item) => item.value), 1);

    return (
        <Panel title="Top productos" subtitle="Unidades más vendidas este mes" icon={PackageCheck}>
            {data.length === 0 ? (
                <EmptyState title="Sin ventas de productos" />
            ) : (
                <div className="space-y-3">
                    {data.slice(0, 7).map((item, index) => {
                        const width = Math.max(6, Math.round((item.value / max) * 100));
                        return (
                            <div key={`${item.name}-${index}`} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-bold text-zinc-200">{item.name}</p>
                                    <span className="font-mono text-sm font-black text-cyan-200">{item.value}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${width}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
}

export function PickupQueue({ items }: { items: ReadyForPickup[] }) {
    return (
        <Panel title="Listos para retirar" subtitle="Prioridad comercial de la sucursal" icon={Smartphone} className="lg:col-span-2">
            {items.length === 0 ? (
                <EmptyState title="No hay equipos pendientes de retiro" />
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-white">{item.customer}</p>
                                    <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{item.device || "Equipo sin modelo"}</p>
                                </div>
                                <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 font-mono text-[10px] font-black text-amber-200">
                                    #{item.ticket}
                                </span>
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
                                <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-zinc-500">
                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{item.phone || "Sin teléfono"}</span>
                                </div>
                                <span className="font-mono text-sm font-black text-emerald-300">{formatMoney(item.amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
}

export function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
    return (
        <Panel title="Actividad reciente" subtitle="Últimos movimientos registrados" icon={Clock3}>
            {activities.length === 0 ? (
                <EmptyState title="Sin actividad reciente" />
            ) : (
                <div className="space-y-4">
                    {activities.slice(0, 8).map((activity) => {
                        const isSale = activity.action.toLowerCase().includes("venta");
                        return (
                            <div key={activity.id} className="flex gap-3">
                                <div
                                    className={cn(
                                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4",
                                        isSale ? "bg-emerald-300 ring-emerald-300/10" : "bg-cyan-300 ring-cyan-300/10"
                                    )}
                                />
                                <div className="min-w-0 flex-1 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="truncate text-sm font-black text-white">{activity.action}</p>
                                        <span className="font-mono text-[11px] font-bold text-zinc-500">{activity.time}</span>
                                    </div>
                                    <p className="mt-1 truncate text-xs font-medium text-zinc-500">{activity.details}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
}

function EmptyState({ title }: { title: string }) {
    return (
        <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
            <p className="text-sm font-bold text-zinc-500">{title}</p>
        </div>
    );
}
