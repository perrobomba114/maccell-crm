import { DollarSign, Wallet, Wrench } from "lucide-react";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface FinancialBreakdown {
    sparePartsCost: number;
    repairProfit: number;
    bonusesPaid: number;
}

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function GlobalFinancials({ globalStats }: { globalStats: FinancialBreakdown }) {
    return <div className="mt-3 grid gap-3 md:grid-cols-3">
        <MetricCard title="Repuestos asignados" value={currency.format(globalStats.sparePartsCost)}
            subtext="Costo estimado de insumos asignados en el mes" accentColor="orange" icon={Wrench} />
        <MetricCard title="Margen del taller" value={currency.format(globalStats.repairProfit)}
            subtext="Ingresos de reparaciones vendidas menos repuestos" accentColor="emerald" icon={Wallet} />
        <MetricCard title="Bonos de vendedores" value={currency.format(globalStats.bonusesPaid)}
            subtext="Turnos iniciados en el mes" accentColor="pink" icon={DollarSign} />
    </div>;
}
