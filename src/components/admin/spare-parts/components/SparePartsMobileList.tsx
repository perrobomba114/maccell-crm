"use client";

import { ArrowDown, ArrowRightLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SparePartWithCategory } from "@/types/spare-parts";

type SparePartsMobileListProps = {
    paginatedData: SparePartWithCategory[];
    setReplenishData: (data: { part: SparePartWithCategory; quantity: number }) => void;
    setPrintPart: (part: SparePartWithCategory | null) => void;
    setPrintQuantity: (qty: number) => void;
    setPrintPrefix: (prefix: string) => void;
    setDecrementData: (data: { part: SparePartWithCategory }) => void;
    setEditingPart: (part: SparePartWithCategory) => void;
    setDeletingId: (id: string | null) => void;
};

export function SparePartsMobileList({
    paginatedData,
    setReplenishData,
    setPrintPart,
    setPrintQuantity,
    setPrintPrefix,
    setDecrementData,
    setEditingPart,
    setDeletingId,
}: SparePartsMobileListProps) {
    if (paginatedData.length === 0) {
        return (
            <div className="h-24 flex items-center justify-center text-muted-foreground p-4">
                No se encontraron repuestos.
            </div>
        );
    }

    return (
        <>
            {paginatedData.map((item) => {
                const needed = Math.max(0, item.maxStockLocal - item.stockLocal);
                const reponer = Math.min(needed, item.stockDepot);

                return (
                    <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-col gap-1">
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
                            <div className="shrink-0 text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Público</p>
                                <p className="text-xl font-black text-blue-600 tabular-nums tracking-tighter">
                                    ${(item.pricePos || 0).toLocaleString("es-AR")}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-bold">
                                    Costo ${item.priceArg.toLocaleString("es-AR")}
                                </p>
                                <p className="text-[9px] text-muted-foreground/80 font-bold uppercase tracking-widest">
                                    USD ${item.priceUsd.toFixed(2)}
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
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Costo ARS</span>
                                <span className="text-xs font-bold text-green-600">${item.priceArg.toLocaleString("es-AR")}</span>
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
            })}
        </>
    );
}
