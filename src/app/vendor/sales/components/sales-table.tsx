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
        <Table>
            <TableHeader className="bg-blue-600 dark:bg-blue-900 border-none">
                <TableRow className="hover:bg-blue-600">
                    <TableHead className="w-[180px] font-black text-white uppercase text-[11px] tracking-widest text-center pl-6">Fecha & Hora</TableHead>
                    <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Ticket</TableHead>
                    <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Detalle Items</TableHead>
                    <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Método</TableHead>
                    <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-right pr-8">Total</TableHead>
                    <TableHead className="w-[100px] font-black text-white uppercase text-[11px] tracking-widest text-center">Acción</TableHead>
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
                            className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors border-b border-zinc-100 dark:border-zinc-800 cursor-pointer"
                            onClick={() => onView(sale)}
                        >
                            <TableCell className="pl-6 text-center font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
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
    );
}
