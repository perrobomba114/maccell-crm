import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Users, Wrench, Clock, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

interface KPIGridProps {
    stats: {
        totalUsers: number;
        totalBranches: number;
        totalSalesCount: number;
        revenueCurrentMonth: number;
        revenueLastMonth: number;
        activeRepairsCount: number;
        avgRepairTimeMinutes: number;
    }
}

export function KPIGrid({ stats }: KPIGridProps) {
    const revenueGrowth = stats.revenueLastMonth > 0
        ? ((stats.revenueCurrentMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100
        : 100;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    };

    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* INGRESOS */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm mb-1">Ingresos Mensuales</p>
                            <h3 className="text-3xl font-bold">{formatCurrency(stats.revenueCurrentMonth)}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Banknote className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-bold ${revenueGrowth >= 0 ? "bg-white/20 text-white" : "bg-red-500/20 text-white"}`}>
                            {revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {Math.abs(revenueGrowth).toFixed(1)}%
                        </div>
                        <span className="text-emerald-100 text-xs">vs mes anterior</span>
                    </div>
                </CardContent>
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* REPARACIONES ACTIVAS */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 font-medium text-sm mb-1">En Taller</p>
                            <h3 className="text-3xl font-bold">{stats.activeRepairsCount}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Wrench className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-blue-100 text-sm">Equipos siendo reparados</span>
                        <ArrowUpRight className="h-4 w-4 ml-auto text-blue-200" />
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* TIEMPO PROMEDIO */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-amber-100 font-medium text-sm mb-1">Tiempo Promedio</p>
                            <h3 className="text-3xl font-bold">{formatTime(stats.avgRepairTimeMinutes)}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-amber-100 text-sm">Resolución de tickets</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* USUARIOS */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 font-medium text-sm mb-1">Total Usuarios</p>
                            <h3 className="text-3xl font-bold">{stats.totalUsers}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-white/20 font-semibold">{stats.totalBranches} Sucursales</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

        </div>
    );
}
