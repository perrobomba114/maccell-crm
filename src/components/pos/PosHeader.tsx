"use client";

import { Button } from "@/components/ui/button";
import { Unlock, Lock, ArrowRightLeft, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PosHeaderProps {
    cashShift: any;
    shiftSummary: any;
    pendingTransfers: any[];
    onTransferClick: () => void;
    onExpenseClick: () => void;
    onRegisterClick: () => void;
}

export function PosHeader({
    cashShift,
    shiftSummary,
    pendingTransfers,
    onTransferClick,
    onExpenseClick,
    onRegisterClick
}: PosHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Punto de Venta</h2>
                {cashShift ? (
                    <div className="flex items-center gap-2 text-sm text-green-500 font-medium cursor-pointer hover:underline" onClick={onRegisterClick}>
                        <Unlock className="w-4 h-4" />
                        <span>Caja Abierta ({new Date(cashShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium cursor-pointer hover:underline" onClick={onRegisterClick}>
                        <Lock className="w-4 h-4" />
                        <span>Caja Cerrada (Click para Abrir)</span>
                    </div>
                )}
            </div>

            <div className="flex gap-3 items-center">
                {shiftSummary && (
                    <div className="flex flex-col items-center justify-center px-4 h-10 bg-zinc-900/80 border border-zinc-800 rounded-lg shadow-sm min-w-[100px]">
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider leading-none mb-1">Total Ventas</span>
                        <span className="text-xl font-black text-green-500 font-mono leading-none tracking-tight">
                            ${Math.floor(shiftSummary.totalSales).toLocaleString()}
                        </span>
                    </div>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegisterClick}
                    className={cn(
                        "h-10 px-4 rounded-lg font-bold transition-all border-zinc-800",
                        cashShift
                            ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20"
                    )}
                >
                    {cashShift ? (
                        <>
                            <Lock className="w-4 h-4 mr-2 opacity-70" />
                            Cerrar Caja
                        </>
                    ) : (
                        <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Abrir Caja
                        </>
                    )}
                </Button>

                <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onTransferClick}
                    className={cn(
                        "h-10 relative overflow-hidden transition-all duration-300 shadow-lg group",
                        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
                        "text-white border-0 hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
                    )}
                    disabled={!cashShift}
                >
                    <ArrowRightLeft className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="relative font-bold tracking-wide">Transferencias</span>
                    {pendingTransfers.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-zinc-900">
                            {pendingTransfers.length}
                        </span>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExpenseClick}
                    className={cn(
                        "h-10 relative overflow-hidden transition-all duration-300 shadow-lg group",
                        "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
                        "text-white border-0 hover:shadow-orange-500/25 hover:scale-105 active:scale-95"
                    )}
                    disabled={!cashShift}
                >
                    <TrendingDown className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                    <span className="relative font-bold tracking-wide">Gasto</span>
                </Button>
            </div>
        </div>
    );
}
