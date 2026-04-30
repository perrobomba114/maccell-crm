import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CalendarIcon, Building2, User, AlertCircle } from "lucide-react";
import type { SalePaymentSummary, SaleWithDetails } from "@/types/sales";

interface SaleDetailDialogProps {
    sale: SaleWithDetails | null;
    onClose: () => void;
}

export function SaleDetailDialog({ sale, onClose }: SaleDetailDialogProps) {
    if (!sale) return null;

    return (
        <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
                <div className="bg-zinc-950 text-white p-6 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Método de Pago</p>
                                <h2 className="text-4xl font-black tracking-tighter uppercase text-white">
                                    {(() => {
                                        const payments: SalePaymentSummary[] = sale.payments || [];
                                        let label = "MercadoPago";
                                        let method = sale.paymentMethod;
                                        if (payments.length > 1) label = "Mixto";
                                        else if (payments.length === 1) method = payments[0].method;
                                        if (method === "CASH") label = "Efectivo";
                                        else if (method === "CARD") label = "Tarjeta";
                                        else if (method === "TRANSFER") label = "Transferencia";
                                        else if (method === "MERCADOPAGO") label = "MercadoPago";
                                        return label;
                                    })()}
                                </h2>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <DollarSign size={120} className="text-white" />
                    </div>
                </div>

                <div className="p-6 space-y-8 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1 shadow-sm">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                <CalendarIcon size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Fecha</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {format(new Date(sale.createdAt), "dd MMM yyyy", { locale: es })}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                                {format(new Date(sale.createdAt), "HH:mm", { locale: es })} hs
                            </p>
                        </div>
                        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1 shadow-sm">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                <Building2 size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Sucursal</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {sale.branch?.name || "N/A"}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg flex flex-col gap-1 shadow-sm">
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                <User size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Vendedor</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {sale.vendor?.name?.split(' ')[0] || "N/A"}
                            </p>
                        </div>
                    </div>

                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm">
                        <Table>
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                                <TableRow>
                                    <TableHead className="w-[60px] text-center text-xs font-bold uppercase tracking-wider">Cant.</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider">Producto</TableHead>
                                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items.map((item) => (
                                    <TableRow key={item.id} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                                        <TableCell className="font-bold text-center text-zinc-500">{item.quantity}</TableCell>
                                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                <span className="text-[10px] text-zinc-400 font-mono">${item.price.toLocaleString()} un.</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-zinc-700 dark:text-zinc-300">
                                            ${(item.quantity * item.price).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-end justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ticket N°</p>
                            <p className="text-2xl font-mono font-black text-zinc-700 dark:text-zinc-300 tracking-tighter">
                                #{sale.saleNumber.split('SALE-').pop()?.split('-')[0]}
                            </p>
                            {sale.wasPaymentModified && (
                                <span className="text-red-500 text-[10px] font-bold flex items-center gap-1 mt-1">
                                    <AlertCircle size={10} /> Pago modificado
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Final</p>
                            <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(sale.total)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <Button onClick={onClose} className="font-bold">Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
