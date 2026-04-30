"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ArrowDown, ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { SparePartWithCategory } from "@/types/spare-parts";
import React from "react";

interface SparePartsTableProps {
    paginatedData: SparePartWithCategory[];
    handleSort: (column: string) => void;
    getSortIcon: (column: string) => React.ReactNode;
    setReplenishData: (data: { part: SparePartWithCategory; quantity: number }) => void;
    setPrintPart: (part: SparePartWithCategory | null) => void;
    setPrintQuantity: (qty: number) => void;
    setPrintPrefix: (prefix: string) => void;
    setDecrementData: (data: { part: SparePartWithCategory }) => void;
    setEditingPart: (part: SparePartWithCategory) => void;
    setDeletingId: (id: string | null) => void;
}

export function SparePartsTable({
    paginatedData,
    handleSort,
    getSortIcon,
    setReplenishData,
    setPrintPart,
    setPrintQuantity,
    setPrintPrefix,
    setDecrementData,
    setEditingPart,
    setDeletingId
}: SparePartsTableProps) {
    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead
                            className="w-[100px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("sku")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                SKU
                                {getSortIcon("sku")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="w-[300px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("name")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Nombre
                                {getSortIcon("name")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="w-[150px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("brand")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Marca
                                {getSortIcon("brand")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="w-[150px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("category")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Categoría
                                {getSortIcon("category")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("stockLocal")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Stock Local
                                {getSortIcon("stockLocal")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("stockDepot")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Stock Dep.
                                {getSortIcon("stockDepot")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("reponer")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                Reponer
                                {getSortIcon("reponer")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("priceUsd")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                USD
                                {getSortIcon("priceUsd")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[120px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("priceArg")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                ARG
                                {getSortIcon("priceArg")}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => handleSort("pricePos")}
                        >
                            <div className="flex items-center justify-center gap-2">
                                POS
                                {getSortIcon("pricePos")}
                            </div>
                        </TableHead>
                        <TableHead className="text-center w-[100px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((item) => {
                        const needed = Math.max(0, item.maxStockLocal - item.stockLocal);
                        const reponer = Math.min(needed, item.stockDepot);

                        return (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs text-center">{item.sku}</TableCell>
                                <TableCell className="font-medium text-center">{item.name}</TableCell>
                                <TableCell className="text-center">{item.brand}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline">{item.category?.name || "Sin Cat."}</Badge>
                                </TableCell>
                                <TableCell className={`text-center font-bold ${item.stockLocal > 0 ? "text-green-600" : "text-destructive"}`}>
                                    {item.stockLocal}
                                </TableCell>
                                <TableCell className={`text-center font-bold ${item.stockDepot > 0 ? "text-green-600" : "text-destructive"}`}>
                                    {item.stockDepot}
                                </TableCell>
                                <TableCell className="text-center">
                                    {reponer > 0 ? (
                                        <Button
                                            variant="ghost"
                                            className="text-amber-600 font-bold flex items-center justify-center gap-1 hover:bg-amber-100 hover:text-amber-800"
                                            onClick={() => setReplenishData({ part: item, quantity: reponer })}
                                        >
                                            {reponer}
                                            <ArrowRightLeft className="h-3 w-3" />
                                        </Button>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                    ${item.priceUsd.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-green-600">
                                    ${item.priceArg.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center font-bold text-blue-600">
                                    ${(item.pricePos || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setPrintPart(item);
                                                setPrintQuantity(1);
                                                setPrintPrefix("");
                                            }}
                                            title="Imprimir Etiqueta"
                                        >
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDecrementData({ part: item })}
                                            disabled={item.stockLocal <= 0}
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                            title="Descontar 1 del Local"
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingPart(item)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeletingId(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {paginatedData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                                No se encontraron repuestos.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
