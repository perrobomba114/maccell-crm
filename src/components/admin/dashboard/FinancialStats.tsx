"use client";

import { useSearchParams } from "next/navigation";
import { dashboardOrigin } from "@/lib/dashboard-navigation";
import { reportMonth } from "@/lib/date-utils";
import { DollarSign, CheckCircle2, Wrench, Package, ShieldAlert, XCircle, Zap } from "lucide-react";
import { growthLabel } from "@/lib/monthly-growth";
import { MetricCard } from "@/components/admin/shared/MetricCard";

// Helper utils
const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type SalesAnalytics = Awaited<ReturnType<typeof import("@/actions/dashboard-actions").getSalesAnalytics>>;
type FinancialSummary = Pick<SalesAnalytics, "financials" | "stock"> & { repairs: { active: number } };

export function FinancialStats({ stats }: { stats: FinancialSummary }) {
    // If we want to implement skeleton loading inside, we can accept null stats, but for now we will rely on Suspense in parent
    const params = useSearchParams();
    const month = reportMonth(params.get("month"), params.get("year"));
    const context = new URLSearchParams({ month: String(month.getUTCMonth()), year: String(month.getUTCFullYear()) });
    const branch = params.get("branchId");
    if (branch) context.set("branchId", branch);
    const origin = dashboardOrigin(month, branch);
    if (!stats) return null;

    const { financials, repairs, stock } = stats;

    return (
        <div className="space-y-3 mb-6 ">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Resumen mensual</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            {/* Financial & General Metrics Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
                <MetricCard
                    title="Ingresos Mensuales"
                    value={fmtMoney(financials.revenue)}
                    accentColor="blue"
                    icon={DollarSign}
                    detail={growthLabel(financials.salesGrowth)}
                    subtext="Respecto del mes anterior"
                    href={`/admin/sales?${context}&${origin}`}
                />
                <MetricCard
                    title="Margen bruto estimado"
                    value={fmtMoney(financials.profit)}
                    accentColor="emerald"
                    icon={CheckCircle2}
                    detail={growthLabel(financials.profitGrowth)}
                    subtext="Respecto del mes anterior"
                    href={`/admin/statistics?${context}`}
                />
                <MetricCard
                    title="Reparaciones ingresadas"
                    value={stock.received ?? 0}
                    accentColor="violet"
                    icon={Wrench}
                    detail={`${repairs.active} activas hoy`}
                    subtext="Por fecha de ingreso"
                    href={`/admin/repairs?date=${month.toISOString().slice(0, 7)}&ingresos=1&branch=${encodeURIComponent(branch || "ALL")}&${origin}`}
                />
                <MetricCard
                    title="Equipos resueltos"
                    value={stock.totalFinalized || 0}
                    accentColor="orange"
                    icon={Package}
                    detail={`${stock.deliveredCount} entregados`}
                    subtext="Resueltos este mes"
                    href={`/admin/statistics?${context}`}
                />
            </div>

            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Rendimiento Operativo</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            {/* Operational Metrics Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <MetricCard
                    title="Garantías"
                    value={stock.warrantiesCount || 0}
                    accentColor="orange"
                    icon={ShieldAlert}
                    subtext="Mes seleccionado"
                />
                <MetricCard
                    title="Equipos OK"
                    value={stock.okCount || 0}
                    accentColor="emerald"
                    icon={CheckCircle2}
                    subtext="Estado final exitoso"
                />
                <MetricCard
                    title="Sin reparación"
                    value={stock.noRepairCount || 0}
                    accentColor="pink"
                    icon={XCircle}
                    subtext="Por fecha de resolución"
                />
                <MetricCard
                    title="Eficiencia"
                    value={stock.totalFinalized ? `${stock.efficiency}%` : "—"}
                    accentColor="violet"
                    icon={Zap}
                    subtext="Tasa de éxito"
                />
            </div>
        </div>
    );
}
