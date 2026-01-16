"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DashboardTablesProps {
    stats: any;
}

export function DashboardTables({ stats }: DashboardTablesProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const topTechnicians = stats.topTechnicians || [];
    const stockAlerts = stats.stockAlerts || [];
    const recentSales = stats.tables?.recentSales || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Top Technicians */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Top Técnicos</CardTitle>
                    <CardDescription>Rendimiento del mes</CardDescription>
                </CardHeader>
                <CardContent>
                    {topTechnicians.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Sin actividad registrada.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="text-right">Reparaciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topTechnicians.map((tech: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{tech.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary">{tech.repairs}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Stock Alerts */}
            <Card className="col-span-1">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Stock Crítico
                        </CardTitle>
                    </div>
                    <CardDescription>Productos con &lt; 3 unidades</CardDescription>
                </CardHeader>
                <CardContent>
                    {stockAlerts.length === 0 ? (
                        <div className="flex items-center text-sm text-emerald-600">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Stock saludable
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stockAlerts.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="font-medium truncate max-w-[150px]">{item.productName}</span>
                                        <span className="text-muted-foreground text-xs">{item.branchName}</span>
                                    </div>
                                    <Badge variant="destructive" className="ml-2">{item.quantity}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Sales */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Últimas Ventas</CardTitle>
                    <CardDescription>Transacciones recientes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentSales.map((sale: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">#{sale.saleNumber}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isMounted ? new Date(sale.createdAt).toLocaleDateString() : '...'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">${sale.total.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{sale.branchName}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
