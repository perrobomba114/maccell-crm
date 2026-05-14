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
        <div className="rounded-md border bg-card overflow-hidden">
            {/* Mobile View */}
            <div className="sm:hidden flex flex-col divide-y divide-border/60">
                {paginatedData.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-muted-foreground p-4">
                        No se encontraron repuestos.
                    </div>
                ) : (
                    paginatedData.map((item) => {
                        const needed = Math.max(0, item.maxStockLocal - item.stockLocal);
                        const reponer = Math.min(needed, item.stockDepot);
                        
                        return (
                            <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                {item.sku}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] px-1 h-4 uppercase tracking-tighter">
                                                {item.category?.name || "Sin Cat."}
                                            </Badge>
                                        </div>
                                        <h3 className="font-bold text-sm leading-tight break-words">{item.name}</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.brand}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-black text-green-600 tabular-nums tracking-tighter">
                                            ${item.priceArg.toLocaleString("es-AR")}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                            USD: ${item.priceUsd.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Local</span>
                                        <span className={`text-sm font-black tabular-nums ${item.stockLocal > 0 ? "text-emerald-600" : "text-destructive"}`}>
                                            {item.stockLocal}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-border/50">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Depósito</span>
                                        <span className={`text-sm font-black tabular-nums ${item.stockDepot > 0 ? "text-emerald-600" : "text-destructive"}`}>
                                            {item.stockDepot}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-border/50">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Reponer</span>
                                        {reponer > 0 ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-amber-600 font-black text-[11px] hover:bg-amber-100"
                                                onClick={() => setReplenishData({ part: item, quantity: reponer })}
                                            >
                                                {reponer}
                                                <ArrowRightLeft className="h-3 w-3 ml-1" />
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground font-bold">-</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Precio POS</span>
                                        <span className="text-xs font-bold text-blue-600">${(item.pricePos || 0).toLocaleString("es-AR")}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                            setPrintPart(item);
                                            setPrintQuantity(1);
                                            setPrintPrefix("");
                                        }}>
                                            <Printer className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-orange-600" disabled={item.stockLocal <= 0} onClick={() => setDecrementData({ part: item })}>
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingPart(item)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(item.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
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
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
