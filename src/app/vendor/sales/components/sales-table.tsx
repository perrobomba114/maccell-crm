import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Printer, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPaymentBadge } from "./payment-badge";
import type { SaleWithDetails } from "@/types/sales";

interface SalesTableProps {
    sales: SaleWithDetails[];
    loading: boolean;
    onView: (sale: SaleWithDetails) => void;
    onPrint: (sale: SaleWithDetails) => void;
    onEdit: (sale: SaleWithDetails) => void;
    clearFilters: () => void;
}

export function SalesTable({ sales, loading, onView, onPrint, onEdit, clearFilters }: SalesTableProps) {
    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Mobile View */}
            <div className="sm:hidden flex flex-col divide-y divide-border/60">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400 p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="font-medium animate-pulse">Cargando ventas...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-300 p-8 text-center">
                        <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900">
                            <FileText className="h-8 w-8" />
                        </div>
                        <p className="font-medium">No se encontraron ventas.</p>
                        <Button variant="link" onClick={clearFilters} className="text-blue-500">Limpiar búsqueda</Button>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div
                            key={sale.id}
                            className="p-4 flex flex-col gap-3 hover:bg-muted/40 transition-colors cursor-pointer active:bg-muted"
                            onClick={() => onView(sale)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-[10px] font-black font-mono text-violet-700 dark:text-violet-300 tracking-wider">
                                    #{sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                </span>
                                <div className="text-right">
                                    <p className="text-xs font-bold">{format(new Date(sale.createdAt), "dd MMM yyyy", { locale: es })}</p>
                                    <p className="text-[10px] text-zinc-400 font-medium">{format(new Date(sale.createdAt), "HH:mm")} hs</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                {sale.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <span className="font-black text-blue-600 dark:text-blue-400 min-w-[1.5rem]">{item.quantity}x</span>
                                        <span className="text-zinc-700 dark:text-zinc-300 truncate font-medium">{item.name}</span>
                                    </div>
                                ))}
                                {sale.items.length > 2 && (
                                    <p className="text-[10px] text-zinc-400 italic font-medium pl-8">+ {sale.items.length - 2} items más...</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
                                <div className="flex items-center gap-2">
                                    {getPaymentBadge(sale.paymentMethod, sale.payments || [], sale.total)}
                                </div>
                                <span className="text-xl font-black text-foreground tabular-nums tracking-tighter">
                                    ${sale.total.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-9 rounded-lg font-bold text-xs"
                                    onClick={(e) => { e.stopPropagation(); onPrint(sale); }}
                                >
                                    <Printer className="mr-2 h-3.5 w-3.5" />
                                    TICKET
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-9 rounded-lg font-bold text-xs"
                                    onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
                                >
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    PAGO
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
                <Table>
                    <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[180px] font-extrabold uppercase text-[11px] tracking-widest text-center pl-6 text-foreground">Fecha & Hora</TableHead>
                            <TableHead className="font-extrabold uppercase text-[11px] tracking-widest text-center text-foreground">Ticket</TableHead>
                            <TableHead className="font-extrabold uppercase text-[11px] tracking-widest text-center text-foreground">Detalle Items</TableHead>
                            <TableHead className="font-extrabold uppercase text-[11px] tracking-widest text-center text-foreground">Método</TableHead>
                            <TableHead className="font-extrabold uppercase text-[11px] tracking-widest text-right pr-8 text-foreground">Total</TableHead>
                            <TableHead className="w-[100px] font-extrabold uppercase text-[11px] tracking-widest text-center text-foreground">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                        <p className="font-medium animate-pulse">Cargando ventas...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-zinc-300">
                                        <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <p className="font-medium">No se encontraron ventas con estos filtros.</p>
                                        <Button variant="link" onClick={clearFilters} className="text-blue-500">Limpiar búsqueda</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => (
                                <TableRow
                                    key={sale.id}
                                    className="group hover:bg-muted/40 transition-colors border-b border-border/60 cursor-pointer"
                                    onClick={() => onView(sale)}
                                >
                                    <TableCell className="pl-6 text-center font-medium tabular-nums">
                                        <div className="flex flex-col items-center">
                                            <span>{format(new Date(sale.createdAt), "dd MMM yyyy", { locale: es })}</span>
                                            <span className="text-xs text-zinc-400">{format(new Date(sale.createdAt), "HH:mm")} hs</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-xs font-black font-mono text-violet-700 dark:text-violet-300 tracking-wide shadow-sm">
                                            {sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 max-w-[300px] mx-auto">
                                            {sale.items.map((item, idx) => (
                                                <div key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 truncate text-center">
                                                    <span className="font-bold text-zinc-900 dark:text-white mr-1.5">{item.quantity}x</span>
                                                    {item.name}
                                                </div>
                                            ))}
                                            {sale.items.length > 2 && <span className="text-[10px] text-zinc-400 italic font-medium text-center">+ {sale.items.length - 2} items más...</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            {getPaymentBadge(sale.paymentMethod, sale.payments || [], sale.total)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <span className="text-lg font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">
                                            ${sale.total.toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onPrint(sale); }} className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Imprimir Ticket"><Printer className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(sale); }} className="h-8 w-8 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Modificar Pago"><Edit className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
