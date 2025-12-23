"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DollarSign, Package, Smartphone, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface KPIProps {
    totalSales: number;
    profitThisMonth: number;
    salesGrowth: number;
    phonesInShop: number;
}

export function KPIStats({ totalSales, profitThisMonth, salesGrowth, phonesInShop }: KPIProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Sales Card */}
            <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas (Mes)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalSales.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Ingresos facturados
                    </p>
                </CardContent>
            </Card>

            {/* Profit Card */}
            <Card className="shadow-sm border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia Est.</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${profitThisMonth.toLocaleString()}</div>
                    <div className="flex items-center text-xs mt-1">
                        <span className={cn(
                            "flex items-center",
                            salesGrowth >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            {salesGrowth >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                            {Math.abs(salesGrowth)}%
                        </span>
                        <span className="text-muted-foreground ml-1">vs mes anterior</span>
                    </div>
                </CardContent>
            </Card>

            {/* Phone Shop Card */}
            <Card className="shadow-sm border-l-4 border-l-violet-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Equipos en Taller</CardTitle>
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{phonesInShop}</div>
                    <p className="text-xs text-muted-foreground">
                        Pendientes de entrega
                    </p>
                </CardContent>
            </Card>

            {/* System Status Card */}
            <Card className="shadow-sm border-l-4 border-l-gray-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estado Sistema</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Activo</div>
                    <p className="text-xs text-muted-foreground">
                        Operativo
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}
