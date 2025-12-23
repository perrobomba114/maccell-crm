"use client";

import { SparePartWithCategory } from "@/types/spare-parts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SparePartsReportClientProps {
    spareParts: SparePartWithCategory[];
}

export function SparePartsReportClient({ spareParts }: SparePartsReportClientProps) {
    // 1. Calculate Global Stats
    let totalStockCount = 0;
    let totalStockLocal = 0;
    let totalStockDepot = 0;
    let totalValueUsd = 0;
    let totalValueArg = 0;

    spareParts.forEach((part) => {
        const stock = part.stockLocal + part.stockDepot;
        totalStockCount += stock;
        totalStockLocal += part.stockLocal;
        totalStockDepot += part.stockDepot;

        // Value based on cost? We only have Price USD (Sale Price usually).
        // Assuming Price USD is cost or sale? Usually "Price USD" in previous context seemed like Cost or Base Price.
        // But in Spare Parts, we often deal with simple list prices.
        // Let's assume Price USD is the value we want to track for inventory value.
        // If we want "Rentability", we need Cost vs Sale.
        // Current SparePart model has: priceUsd, priceArg.
        // Let's treat Price USD as the reference value for the report.

        totalValueUsd += stock * part.priceUsd;
        totalValueArg += stock * part.priceArg;
    });

    // We simulate "Branches" as Local and Depot for the breakdown
    const locationStats = [
        {
            name: "Local",
            stockCount: totalStockLocal,
            valueUsd: spareParts.reduce((acc, p) => acc + (p.stockLocal * p.priceUsd), 0),
            valueArg: spareParts.reduce((acc, p) => acc + (p.stockLocal * p.priceArg), 0),
        },
        {
            name: "Depósito",
            stockCount: totalStockDepot,
            valueUsd: spareParts.reduce((acc, p) => acc + (p.stockDepot * p.priceUsd), 0),
            valueArg: spareParts.reduce((acc, p) => acc + (p.stockDepot * p.priceArg), 0),
        }
    ];

    return (
        <div className="space-y-6">

            <div className="flex justify-end print:hidden">
                <Button onClick={() => window.print()}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                </Button>
            </div>

            {/* --- SCREEN ONLY DASHBOARD --- */}
            <div className="print:hidden space-y-6">
                {/* Global KPIS */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalStockCount}</div>
                            <p className="text-xs text-muted-foreground">Unidades (Local + Depósito)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total USD</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Valorización en Dólares</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total ARG</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${totalValueArg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">Valorización en Pesos</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="locations" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="locations">Por Ubicación</TabsTrigger>
                        <TabsTrigger value="details">Detalle por Repuesto</TabsTrigger>
                    </TabsList>

                    <TabsContent value="locations" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Desglose por Ubicación</CardTitle>
                                <CardDescription>
                                    Estado del inventario en Local y Depósito.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead className="text-right">Stock (Unid.)</TableHead>
                                            <TableHead className="text-right">Valor USD</TableHead>
                                            <TableHead className="text-right">Valor ARG</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {locationStats.map((loc) => (
                                            <TableRow key={loc.name}>
                                                <TableCell className="font-medium">{loc.name}</TableCell>
                                                <TableCell className="text-right">{loc.stockCount}</TableCell>
                                                <TableCell className="text-right">${loc.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-right font-bold">${loc.valueArg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalle Global de Repuestos</CardTitle>
                                <CardDescription>
                                    Listado completo del inventario.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border h-[500px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Repuesto</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead className="text-center">Stock Local</TableHead>
                                                <TableHead className="text-center">Stock Dep.</TableHead>
                                                <TableHead className="text-right">Unit. USD</TableHead>
                                                <TableHead className="text-right">Total USD</TableHead>
                                                <TableHead className="text-right">Total ARG</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {spareParts.map((part) => {
                                                const totalStock = part.stockLocal + part.stockDepot;
                                                const totalUsd = totalStock * part.priceUsd;
                                                const totalArg = totalStock * part.priceArg;

                                                return (
                                                    <TableRow key={part.id}>
                                                        <TableCell className="font-mono text-xs">{part.sku}</TableCell>
                                                        <TableCell className="font-medium">{part.name}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{part.category?.name}</TableCell>
                                                        <TableCell className="text-center">{part.stockLocal}</TableCell>
                                                        <TableCell className="text-center">{part.stockDepot}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">${part.priceUsd.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-green-600 font-medium">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                        <TableCell className="text-right font-bold">${totalArg.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* --- PRINT ONLY REPORT --- */}
            <div className="hidden print:block font-sans text-black print:p-10">
                <style type="text/css" media="print">
                    {`
                        @page { 
                            size: auto;
                            margin: 0mm;
                        }
                    `}
                </style>
                {/* 1. Header */}
                <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-tight mb-1">Informe de Repuestos</h1>
                        <p className="text-xl text-gray-600 uppercase tracking-widest">Valorización de Inventario</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-900">MACCELL</h2>
                        <p className="text-sm text-gray-500">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* 2. KPIs */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800 text-white p-4 rounded-sm print:bg-slate-800 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Stock Total</p>
                        <p className="text-3xl font-bold">{totalStockCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-700 text-white p-4 rounded-sm print:bg-emerald-700 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Valor Total USD</p>
                        <p className="text-3xl font-bold">${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-slate-600 text-white p-4 rounded-sm print:bg-slate-600 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Valor Total ARG</p>
                        <p className="text-3xl font-bold">${totalValueArg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* 3. Breakdown */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-l-4 border-black pl-3 mb-4">Desglose por Ubicación</h3>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-900 font-bold uppercase text-xs" style={{ printColorAdjust: "exact" }}>
                                <th className="p-2 border-b-2 border-gray-300 text-left">Ubicación</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Stock</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Valor USD</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Valor ARG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locationStats.map((loc, i) => (
                                <tr key={loc.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{ printColorAdjust: "exact" }}>
                                    <td className="p-2 border-b border-gray-200 font-medium">{loc.name}</td>
                                    <td className="p-2 border-b border-gray-200 text-right">{loc.stockCount}</td>
                                    <td className="p-2 border-b border-gray-200 text-right">${loc.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="p-2 border-b border-gray-200 text-right font-bold">${loc.valueArg.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Details */}
                <div>
                    <h3 className="text-lg font-bold uppercase border-l-4 border-black pl-3 mb-4 mt-8 page-break-before">Detalle de Repuestos</h3>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-black text-white font-bold uppercase" style={{ printColorAdjust: "exact" }}>
                                <th className="p-2 text-left">SKU</th>
                                <th className="p-2 text-left">Repuesto</th>
                                <th className="p-2 text-center">Local</th>
                                <th className="p-2 text-center">Dep.</th>
                                <th className="p-2 text-right">Unit. USD</th>
                                <th className="p-2 text-right">Total USD</th>
                                <th className="p-2 text-right">Total ARG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spareParts.map((part, i) => {
                                const totalStock = part.stockLocal + part.stockDepot;
                                const totalUsd = totalStock * part.priceUsd;
                                const totalArg = totalStock * part.priceArg;
                                return (
                                    <tr key={part.id} className="border-b border-gray-200 break-inside-avoid">
                                        <td className="p-1 font-mono">{part.sku}</td>
                                        <td className="p-1 font-medium">{part.name}</td>
                                        <td className="p-1 text-center bg-gray-50">{part.stockLocal}</td>
                                        <td className="p-1 text-center bg-gray-50">{part.stockDepot}</td>
                                        <td className="p-1 text-right text-gray-600">${part.priceUsd.toFixed(2)}</td>
                                        <td className="p-1 text-right text-green-700 font-bold">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-1 text-right font-bold">${totalArg.toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>Maccell CRM - Informe de Repuestos.</p>
                </div>
            </div>
        </div>
    );
}
