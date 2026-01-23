import { Banknote, Users, ShoppingBag, PackageCheck, AlertCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorKPIGridProps {
    stats: {
        salesMonthCount: number;
        salesMonthTotal: number;
        repairsIntakeMonth: number;
        repairRevenueMonth: number;
        readyForPickup: any[];
    }
}

function MetricCard({ title, value, subtext, accentColor, icon: Icon, trend }: any) {
    const colorMap: any = {
        emerald: "from-emerald-600/20 to-emerald-600/5 text-emerald-500 border-emerald-600/20",
        blue: "from-blue-600/20 to-blue-600/5 text-blue-500 border-blue-600/20",
        violet: "from-violet-600/20 to-violet-600/5 text-violet-500 border-violet-600/20",
        orange: "from-orange-600/20 to-orange-600/5 text-orange-500 border-orange-600/20"
    };
    const styles = colorMap[accentColor] || colorMap.blue;

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-6 border border-zinc-800/50 bg-[#18181b] flex flex-col justify-between h-full min-h-[140px] hover:border-zinc-700 transition-all shadow-sm group"
        )}>
            {/* Background Glow */}
            <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 bg-gradient-to-br", styles)}></div>

            <div className="flex justify-between items-start z-10 relative">
                <div className="flex-1 w-full overflow-hidden">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
                    <div className="flex items-baseline gap-1 w-full">
                        <h3 className={cn(
                            "font-bold text-white tracking-tight truncate leading-none",
                            String(value).length > 12 ? "text-2xl" : "text-3xl xl:text-4xl"
                        )} title={String(value)}>
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
                    <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0">
                        {trend}
                    </span>
                )}
                <span className="text-xs text-zinc-500 font-medium truncate">{subtext}</span>
            </div>
        </div>
    );
}

export function VendorKPIGrid({ stats }: VendorKPIGridProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
                title="Ventas Mes"
                value={formatCurrency(stats.salesMonthTotal)}
                subtext="Total facturado"
                trend={`${stats.salesMonthCount} ventas`}
                accentColor="emerald"
                icon={Banknote}
            />
            <MetricCard
                title="Equipos Ingresados"
                value={stats.repairsIntakeMonth}
                subtext="Recibidos para reparación"
                accentColor="blue"
                icon={Wrench}
            />
            <MetricCard
                title="Equipos Entregados"
                value={(stats as any).repairCountMonth || 0}
                subtext="Entregados al cliente"
                accentColor="violet"
                icon={ShoppingBag}
            />
            <MetricCard
                title="Para Retirar"
                value={stats.readyForPickup.length}
                subtext="Notificar a clientes"
                accentColor="orange"
                icon={AlertCircle}
                trend="Acción requerida"
            />
        </div>
    );
}
