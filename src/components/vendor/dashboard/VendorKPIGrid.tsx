import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Users, ShoppingBag, PackageCheck, AlertCircle, Wrench } from "lucide-react";

interface VendorKPIGridProps {
    stats: {
        salesMonthCount: number;
        salesMonthTotal: number;
        repairsIntakeMonth: number;
        repairRevenueMonth: number;
        readyForPickup: any[];
    }
}

export function VendorKPIGrid({ stats }: VendorKPIGridProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* VENTAS MES */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white transform transition-all hover:scale-105 duration-300">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wide">Ventas Mes</p>
                            <h3 className="text-3xl font-extrabold">{formatCurrency(stats.salesMonthTotal)}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                            <Banknote className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-semibold backdrop-blur-md">
                            {stats.salesMonthCount} ventas
                        </span>
                        <span className="ml-2 text-emerald-100 text-xs">este mes</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* INGRESOS TALLER (EQUIPOS RECIBIDOS) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white transform transition-all hover:scale-105 duration-300">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 font-medium text-sm mb-1 uppercase tracking-wide">Equipos Ingresados</p>
                            <h3 className="text-3xl font-extrabold">{stats.repairsIntakeMonth}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                            <Wrench className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-blue-100 text-xs">Recibidos para reparación este mes</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* EQUIPOS ENTREGADOS (CONTADOR) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white transform transition-all hover:scale-105 duration-300">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 font-medium text-sm mb-1 uppercase tracking-wide">Equipos Entregados</p>
                            <h3 className="text-3xl font-extrabold">{(stats as any).repairCountMonth || 0}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                            <ShoppingBag className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-purple-100 text-xs">Entregados al cliente este mes</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* PARA RETIRAR */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white transform transition-all hover:scale-105 duration-300">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-amber-100 font-medium text-sm mb-1 uppercase tracking-wide">Para Retirar</p>
                            <h3 className="text-3xl font-extrabold">{stats.readyForPickup.length}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                            <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-md animate-pulse">
                            ¡Avisar a clientes!
                        </span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
            </Card>

        </div>
    );
}
