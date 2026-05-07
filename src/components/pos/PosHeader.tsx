"use client";

import { Button } from "@/components/ui/button";
import { Unlock, Lock, ArrowRightLeft, TrendingDown, Activity, MapPin, ReceiptText, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CashShiftResult, type ShiftSummary } from "@/lib/actions/cash-register";

type PendingTransfer = {
    id: string;
};

interface PosHeaderProps {
    cashShift: CashShiftResult | null;
    shiftSummary: ShiftSummary | null;
    pendingTransfers: PendingTransfer[];
    branchName: string;
    onTransferClick: () => void;
    onExpenseClick: () => void;
    onRegisterClick: () => void;
}

export function PosHeader({
    cashShift,
    shiftSummary,
    pendingTransfers,
    branchName,
    onTransferClick,
    onExpenseClick,
    onRegisterClick
}: PosHeaderProps) {
    const openedAt = cashShift
        ? new Date(cashShift.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <section className="relative max-w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
            <div className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-emerald-300" />
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                        <Store className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-black uppercase tracking-normal text-zinc-400">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                                <span className="truncate">{branchName}</span>
                            </span>
                            <button
                                type="button"
                                onClick={onRegisterClick}
                                className={cn(
                                    "inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-normal transition-colors",
                                    cashShift
                                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/15"
                                        : "border-amber-300/40 bg-amber-300/12 text-amber-200 hover:bg-amber-300/20"
                                )}
                            >
                                {cashShift ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                <span className="truncate">{cashShift ? `Caja abierta ${openedAt}` : "Caja cerrada"}</span>
                            </button>
                        </div>
                        <h1 className="whitespace-nowrap text-[2rem] font-black leading-none tracking-normal text-white md:text-[2.45rem]">
                            Punto de venta
                        </h1>
                    </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                    {shiftSummary && (
                        <div className="grid min-w-0 grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-black/25">
                            <div className="min-w-0 px-3 py-1.5">
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-normal text-zinc-500">
                                    <ReceiptText className="h-3 w-3 shrink-0" />
                                    ventas
                                </span>
                                <span className="mt-0.5 block truncate font-mono text-base font-black tabular-nums text-emerald-300">
                                    ${Math.floor(shiftSummary.totalSales).toLocaleString("es-AR")}
                                </span>
                            </div>
                            <div className="min-w-0 border-l border-white/10 px-3 py-1.5">
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-normal text-zinc-500">
                                    <Activity className="h-3 w-3 shrink-0" />
                                    tickets
                                </span>
                                <span className="mt-0.5 block truncate font-mono text-base font-black tabular-nums text-white">
                                    {shiftSummary.salesCount}
                                </span>
                            </div>
                        </div>
                    )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegisterClick}
                    className={cn(
                        "h-10 min-w-[6.5rem] rounded-lg px-3 text-xs font-black shadow-lg transition-all disabled:!opacity-100",
                        cashShift
                            ? "!border-red-300/60 !bg-red-500 !text-white shadow-red-500/30 hover:!border-red-200 hover:!bg-red-400 hover:!text-white"
                            : "!border-emerald-200/70 !bg-emerald-400 !text-emerald-950 shadow-emerald-500/30 hover:!bg-emerald-300"
                    )}
                >
                    {cashShift ? (
                        <>
                            <Lock className="mr-1.5 h-4 w-4 shrink-0 opacity-70" />
                            <span className="truncate">Cerrar</span>
                        </>
                    ) : (
                        <>
                            <Unlock className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="truncate">Abrir</span>
                        </>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onTransferClick}
                    className={cn(
                        "group relative h-10 min-w-[6.5rem] overflow-hidden rounded-lg px-3 text-xs font-black shadow-lg transition-all duration-300 active:scale-95 disabled:!opacity-100",
                        cashShift
                            ? "!border-cyan-200/70 !bg-cyan-400 !text-cyan-950 shadow-cyan-500/30 hover:!bg-cyan-300"
                            : "!border-cyan-700/50 !bg-cyan-900/70 !text-cyan-200 shadow-cyan-950/20"
                    )}
                    disabled={!cashShift}
                >
                    <ArrowRightLeft className="mr-1.5 h-4 w-4 shrink-0 transition-transform duration-500 group-hover:rotate-180" />
                    <span className="relative truncate">Transf.</span>
                    {pendingTransfers.length > 0 && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm ring-2 ring-zinc-950">
                            {pendingTransfers.length}
                        </span>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExpenseClick}
                    className={cn(
                        "group relative h-10 min-w-[6.5rem] overflow-hidden rounded-lg px-3 text-xs font-black shadow-lg transition-all duration-300 active:scale-95 disabled:!opacity-100",
                        cashShift
                            ? "!border-amber-200/80 !bg-amber-300 !text-amber-950 shadow-amber-500/30 hover:!bg-amber-200"
                            : "!border-amber-700/50 !bg-amber-900/70 !text-amber-200 shadow-amber-950/20"
                    )}
                    disabled={!cashShift}
                >
                    <TrendingDown className="mr-1.5 h-4 w-4 shrink-0 transition-transform group-hover:rotate-12" />
                    <span className="relative truncate">Gasto</span>
                </Button>
                </div>
            </div>
        </section>
    );
}
