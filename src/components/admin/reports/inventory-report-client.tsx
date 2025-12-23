"use client";

import { Branch, Category, Product, ProductStock } from "@prisma/client";
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

interface ProductWithStock extends Product {
    stock: ProductStock[];
    category?: Category | null;
}

interface InventoryReportClientProps {
    products: ProductWithStock[];
    branches: Branch[];
}

export function InventoryReportClient({ products, branches }: InventoryReportClientProps) {
    // 1. Calculate Global Stats
    let totalStockCount = 0;
    let totalCostValue = 0;
    let totalSalesValue = 0;

    products.forEach((product) => {
        const productStock = product.stock.reduce((acc, s) => acc + s.quantity, 0);
        totalStockCount += productStock;
        totalCostValue += productStock * product.costPrice;
        totalSalesValue += productStock * product.price;
    });

    const potentialProfit = totalSalesValue - totalCostValue;
    const profitMargin = totalCostValue > 0 ? (potentialProfit / totalCostValue) * 100 : 0;

    // 2. Calculate Branch Stats
    const branchStats = branches.map((branch) => {
        let branchStock = 0;
        let branchCost = 0;
        let branchSales = 0;

        products.forEach((product) => {
            const stockEntry = product.stock.find((s) => s.branchId === branch.id);
            if (stockEntry) {
                branchStock += stockEntry.quantity;
                branchCost += stockEntry.quantity * product.costPrice;
                branchSales += stockEntry.quantity * product.price;
            }
        });

        return {
            ...branch,
            stockCount: branchStock,
            costValue: branchCost,
            salesValue: branchSales,
            profit: branchSales - branchCost,
        };
    });

    return (
        <div className="space-y-6">

            <div className="flex justify-end print:hidden">
                <Button onClick={() => window.print()}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF (CFO)
                </Button>
            </div>

            {/* --- SCREEN ONLY DASHBOARD --- */}
            <div className="print:hidden space-y-6">
                {/* Global KPIS */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stock Total (Unidades)</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalStockCount}</div>
                            <p className="text-xs text-muted-foreground">Productos físicos en todas las sucursales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Costo Inventario</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${totalCostValue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Capital invertido en mercadería</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Venta Potencial</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${totalSalesValue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Ingresos proyectados al vender todo</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ganancia Proyectada</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">${potentialProfit.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Margen Promedio: {profitMargin.toFixed(1)}%</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="branches" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="branches">Por Sucursal</TabsTrigger>
                        <TabsTrigger value="details">Detalle por Producto</TabsTrigger>
                    </TabsList>

                    <TabsContent value="branches" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Desglose por Sucursal</CardTitle>
                                <CardDescription>
                                    Estado del inventario en cada ubicación.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sucursal</TableHead>
                                            <TableHead className="text-right">Stock (Unid.)</TableHead>
                                            <TableHead className="text-right">Valor Costo</TableHead>
                                            <TableHead className="text-right">Valor Venta</TableHead>
                                            <TableHead className="text-right">Ganancia Potencial</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {branchStats.map((branch) => (
                                            <TableRow key={branch.id}>
                                                <TableCell className="font-medium">{branch.name}</TableCell>
                                                <TableCell className="text-right">{branch.stockCount}</TableCell>
                                                <TableCell className="text-right">${branch.costValue.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">${branch.salesValue.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    ${branch.profit.toLocaleString()}
                                                </TableCell>
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
                                <CardTitle>Detalle Global de Productos</CardTitle>
                                <CardDescription>
                                    Listado completo con valoración individual.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border h-[500px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-right">Costo Unit.</TableHead>
                                                <TableHead className="text-center">Stock Total</TableHead>
                                                <TableHead className="text-right">Total Costo</TableHead>
                                                <TableHead className="text-right">Total Venta</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product) => {
                                                const stock = product.stock.reduce((acc, s) => acc + s.quantity, 0);
                                                const costVal = stock * product.costPrice;
                                                const saleVal = stock * product.price;

                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                                                        <TableCell>{product.name}</TableCell>
                                                        <TableCell className="text-right">${product.costPrice}</TableCell>
                                                        <TableCell className="text-center">{stock}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">${costVal.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-medium">${saleVal.toLocaleString()}</TableCell>
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

            {/* --- PRINT ONLY REPORT (A4 STYLE for CFO) --- */}
            <div className="hidden print:block font-sans text-black print:p-10">
                <style type="text/css" media="print">
                    {`
                        @page { 
                            size: auto;   /* auto is the initial value */
                            margin: 0mm;  /* this affects the margin in the printer settings */
                        }
                    `}
                </style>
                {/* 1. Header Corporativo */}
                <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-tight mb-1">Informe de Inventario</h1>
                        <p className="text-xl text-gray-600 uppercase tracking-widest">Valorización Financiera y Rentabilidad</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-900">MACCELL</h2>
                        <p className="text-sm text-gray-500">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                        <p className="text-sm text-gray-500">Confidencial / Uso Interno</p>
                    </div>
                </div>

                {/* 2. Executive Summary / KPIs */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800 text-white p-4 rounded-sm print:bg-slate-800 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Stock Total (Unid.)</p>
                        <p className="text-3xl font-bold">{totalStockCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-700 text-white p-4 rounded-sm print:bg-slate-700 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Inversión (Costo)</p>
                        <p className="text-3xl font-bold">${totalCostValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-600 text-white p-4 rounded-sm print:bg-slate-600 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Venta Proyectada</p>
                        <p className="text-3xl font-bold">${totalSalesValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-700 text-white p-4 rounded-sm print:bg-emerald-700 print:text-white" style={{ printColorAdjust: "exact" }}>
                        <p className="text-xs uppercase opacity-70 mb-1">Margen Potencial</p>
                        <p className="text-3xl font-bold">{profitMargin.toFixed(1)}%</p>
                    </div>
                </div>

                {/* 3. Section: Branch Analysis */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-l-4 border-black pl-3 mb-4">Desglose por Sucursal</h3>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-900 font-bold uppercase text-xs" style={{ printColorAdjust: "exact" }}>
                                <th className="p-2 border-b-2 border-gray-300 text-left">Sucursal</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Stock</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Valor Costo</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Valor Venta</th>
                                <th className="p-2 border-b-2 border-gray-300 text-right">Ganancia Est.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branchStats.map((branch, i) => (
                                <tr key={branch.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{ printColorAdjust: "exact" }}>
                                    <td className="p-2 border-b border-gray-200 font-medium">{branch.name}</td>
                                    <td className="p-2 border-b border-gray-200 text-right">{branch.stockCount}</td>
                                    <td className="p-2 border-b border-gray-200 text-right">${branch.costValue.toLocaleString()}</td>
                                    <td className="p-2 border-b border-gray-200 text-right">${branch.salesValue.toLocaleString()}</td>
                                    <td className="p-2 border-b border-gray-200 text-right font-bold text-emerald-800">${branch.profit.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Section: Product Details */}
                <div>
                    <h3 className="text-lg font-bold uppercase border-l-4 border-black pl-3 mb-4 mt-8 page-break-before">Detalle de Inventario</h3>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-black text-white font-bold uppercase" style={{ printColorAdjust: "exact" }}>
                                <th className="p-2 text-left">SKU</th>
                                <th className="p-2 text-left">Producto</th>
                                <th className="p-2 text-right">Costo U.</th>
                                <th className="p-2 text-center">Stock</th>
                                <th className="p-2 text-right">Total Costo</th>
                                <th className="p-2 text-right">Total Venta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, i) => {
                                const stock = product.stock.reduce((acc, s) => acc + s.quantity, 0);
                                const costVal = stock * product.costPrice;
                                const saleVal = stock * product.price;
                                return (
                                    <tr key={product.id} className="border-b border-gray-200 break-inside-avoid">
                                        <td className="p-1 font-mono">{product.sku}</td>
                                        <td className="p-1 font-medium">{product.name}</td>
                                        <td className="p-1 text-right text-gray-600">${product.costPrice}</td>
                                        <td className="p-1 text-center font-bold bg-gray-50">{stock}</td>
                                        <td className="p-1 text-right">${costVal.toLocaleString()}</td>
                                        <td className="p-1 text-right font-bold">${saleVal.toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>Maccell CRM - Informe Generado Automáticamente. Este documento es para uso exclusivo del departamento contable.</p>
                </div>
            </div>
        </div>
    );
}
