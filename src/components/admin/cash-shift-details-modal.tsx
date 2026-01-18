"use strict";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CashShiftWithDetails } from "@/actions/cash-shift-actions";
import {
    CreditCard,
    Coins,
    Smartphone,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
    AlertTriangle,
    Store,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// Inline helper if not exists
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper for date formatting
const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("es-AR", {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

interface CashShiftDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: CashShiftWithDetails | null;
}

export function CashShiftDetailsModal({
    isOpen,
    onClose,
    shift,
}: CashShiftDetailsModalProps) {
    if (!shift) return null;

    const totalMethods = shift.totals.totalSales;

    // Calculate percentages for the bar
    const cashPct = totalMethods > 0 ? (shift.totals.cash / totalMethods) * 100 : 0;
    const cardPct = totalMethods > 0 ? (shift.totals.card / totalMethods) * 100 : 0;
    const mpPct = totalMethods > 0 ? (shift.totals.mercadopago / totalMethods) * 100 : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] sm:max-w-[90vw] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl bg-[#F8F9FC] dark:bg-[#09090b]">

                {/* Modern Header - Violet Theme */}
                <div className="bg-white dark:bg-[#121217] border-b p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                    <DialogHeader className="relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Badge variant="outline" className="mb-2 sm:mb-3 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800 rounded-md px-2 py-0 sm:px-2.5 sm:py-0.5 font-semibold text-[10px] sm:text-xs tracking-wider uppercase">
                                        Reporte Financiero
                                    </Badge>
                                    <DialogTitle className="text-xl sm:text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex flex-wrap items-center gap-2 md:gap-4">
                                        Cierre de Caja
                                        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
                                        <span className="text-base sm:text-xl md:text-2xl font-medium text-slate-500 dark:text-slate-400">
                                            #{shift.id.slice(-6).toUpperCase()}
                                        </span>
                                    </DialogTitle>
                                </div>

                                <div className="flex flex-wrap gap-2 md:gap-3 text-[10px] sm:text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-medium">
                                        <Store className="w-3 h-3 sm:w-4 sm:h-4 text-violet-500" />
                                        {shift.branch.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-medium">
                                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                        {shift.user.name.split(' ')[0]}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-medium font-mono">
                                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                                        {formatDate(shift.startTime).split(',')[1]}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-start lg:items-end gap-3 min-w-[200px]">
                                <div className={cn(
                                    "flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 w-full lg:w-auto justify-center lg:justify-start",
                                    shift.status === "OPEN"
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
                                        : "bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400"
                                )}>
                                    <span className={cn("relative flex h-3 w-3", shift.status === "OPEN" ? "" : "hidden")}>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    {shift.status === "CLOSED" && <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />}

                                    <span className="font-bold tracking-wide text-sm">
                                        {shift.status === "OPEN" ? "CAJA EN CURSO" : "CAJA CERRADA"}
                                    </span>
                                </div>
                                {shift.status === "CLOSED" && shift.endTime && (
                                    <span className="text-xs text-slate-400 font-mono text-center lg:text-right w-full">
                                        Finalizado: {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 md:p-10 space-y-10">

                    {/* Big Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Ventas Card - Solid Blue */}
                        <div className="bg-blue-600 dark:bg-blue-700 p-6 rounded-2xl shadow-xl shadow-blue-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 bg-white/20 text-white rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <span className="bg-white/20 text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                    + INGRESOS
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-blue-100 text-[10px] sm:text-sm font-semibold uppercase tracking-wider">Ventas Totales</h3>
                                <p className="text-xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1 tabular-nums tracking-tight">
                                    {formatMoney(shift.totals.totalSales)}
                                </p>
                            </div>
                        </div>

                        {/* Gastos Card - Solid Red */}
                        <div className="bg-red-600 dark:bg-red-700 p-6 rounded-2xl shadow-xl shadow-red-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 bg-white/20 text-white rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                                <span className="bg-white/20 text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                    - EGRESOS
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-red-100 text-[10px] sm:text-sm font-semibold uppercase tracking-wider">Gastos Operativos</h3>
                                <p className="text-xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1 tabular-nums tracking-tight">
                                    {formatMoney(shift.totals.expenses)}
                                </p>
                            </div>
                        </div>

                        {/* Premios Card - Solid Orange */}
                        <div className="bg-orange-500 dark:bg-orange-600 p-6 rounded-2xl shadow-xl shadow-orange-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 bg-white/20 text-white rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-6 h-6" />
                                </div>
                                <span className="bg-white/20 text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                    - EGRESOS
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-orange-100 text-[10px] sm:text-sm font-semibold uppercase tracking-wider">Premios / Comis.</h3>
                                <p className="text-xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1 tabular-nums tracking-tight">
                                    {formatMoney(shift.totals.bonuses)}
                                </p>
                            </div>
                        </div>

                        {/* Neto Card (Highlighted - Dark / Violet) */}
                        <div className="bg-slate-900 dark:bg-violet-900 p-6 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none flex flex-col justify-between relative overflow-hidden group border border-slate-800 dark:border-violet-800">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 bg-white/10 text-white rounded-xl backdrop-blur-sm">
                                    <Store className="w-6 h-6" />
                                </div>
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-emerald-500/20">
                                    RESULTADO
                                </span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-slate-400 dark:text-violet-200 text-[10px] sm:text-sm font-semibold uppercase tracking-wider">Neto en Caja</h3>
                                <p className="text-xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1 tabular-nums tracking-tight">
                                    {formatMoney(shift.totals.netTotal)}
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                        {/* Section: Breakdown by Payment Method */}
                        <div className="xl:col-span-2 flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Métodos de Pago
                                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 ml-4 rounded-full"></div>
                            </h3>

                            <div className="bg-white dark:bg-[#18181b] rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-6">
                                {/* Cash Row */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                <Coins className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Efectivo</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{cashPct.toFixed(1)}% del total</p>
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">{formatMoney(shift.totals.cash)}</p>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${cashPct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"></div>
                                    </div>
                                </div>

                                {/* Card Row */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Tarjetas (Débito/Crédito)</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{cardPct.toFixed(1)}% del total</p>
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">{formatMoney(shift.totals.card)}</p>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${cardPct}%` }} className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"></div>
                                    </div>
                                </div>

                                {/* MP Row */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Mercado Pago / Transferencia</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{mpPct.toFixed(1)}% del total</p>
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-200">{formatMoney(shift.totals.mercadopago)}</p>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${mpPct}%` }} className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Alerts Block inside main column */}
                            {shift.details?.modifiedSales && shift.details.modifiedSales.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                        Auditoría de Pagos
                                        <Badge variant="destructive" className="ml-2 font-mono">{shift.details.modifiedSales.length}</Badge>
                                    </h3>
                                    <div className="bg-orange-50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl overflow-hidden">
                                        <div className="p-4 bg-orange-100/50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-900/30">
                                            <div className="flex items-center gap-3 text-orange-800 dark:text-orange-300">
                                                <AlertTriangle className="w-5 h-5" />
                                                <p className="font-semibold text-sm">Se detectaron correcciones en métodos de pago</p>
                                            </div>
                                        </div>
                                        <div className="p-0">
                                            <Table>
                                                <TableHeader className="invisible h-0">
                                                    <TableRow><TableHead>Ticket</TableHead><TableHead>Cambio</TableHead><TableHead>Monto</TableHead></TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {shift.details.modifiedSales.map((sale: any) => (
                                                        <TableRow key={sale.id} className="border-orange-100 dark:border-orange-900/20 hover:bg-orange-100/40 dark:hover:bg-orange-900/20">
                                                            <TableCell className="font-mono text-xs font-bold text-orange-900 dark:text-orange-200 py-3 pl-6">
                                                                #{sale.saleNumber.split('-').pop()}
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-slate-400 line-through">
                                                                        {sale.originalPaymentMethod === 'CASH' ? 'Efectivo' :
                                                                            sale.originalPaymentMethod === 'CARD' ? 'Tarjeta' : 'MP'}
                                                                    </span>
                                                                    <span className="text-slate-300">→</span>
                                                                    <span className="font-bold text-orange-700 dark:text-orange-300">
                                                                        {sale.paymentMethod === 'CASH' ? 'Efectivo' :
                                                                            sale.paymentMethod === 'CARD' ? 'Tarjeta' : 'MP'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-orange-900 dark:text-orange-200 tabular-nums py-3 pr-6">
                                                                {formatMoney(sale.total)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section: Expenses Feed */}
                        <div className="flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-between">
                                Registro de Gastos
                                <span className="text-xs font-medium bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">
                                    {shift.counts.expenses + (shift.totals.bonuses > 0 ? 1 : 0)} mov.
                                </span>
                            </h3>

                            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
                                <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
                                    {shift.details?.expenses && (shift.details.expenses.length > 0 || shift.totals.bonuses > 0) ? (
                                        <div className="space-y-1">
                                            {shift.totals.bonuses > 0 && (
                                                <div className="p-3 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/10 transition-colors group border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30">
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                                                            Pago de Premios / Comisiones
                                                        </span>
                                                        <span className="text-sm font-bold text-orange-500 dark:text-orange-400 tabular-nums whitespace-nowrap ml-3">
                                                            -{formatMoney(shift.totals.bonuses)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" />
                                                            --:--
                                                        </div>
                                                        <div className="bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 uppercase font-bold tracking-wider">
                                                            SISTEMA
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {shift.details.expenses.map((expense) => (
                                                <div key={expense.id} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-tight">
                                                            {expense.description}
                                                        </span>
                                                        <span className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums whitespace-nowrap ml-3">
                                                            -{formatMoney(expense.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(expense.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                                                            {expense.userName}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                                <Wallet className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">Sin gastos registrados</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Egresos (Gastos + Premios): <span className="text-slate-700 dark:text-slate-300">{formatMoney(shift.totals.expenses + shift.totals.bonuses)}</span></p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
