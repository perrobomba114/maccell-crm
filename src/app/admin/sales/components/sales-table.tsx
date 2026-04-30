import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Edit, Printer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalePaymentSummary, SaleWithDetails } from "@/types/sales";

interface SalesTableProps {
    sales: SaleWithDetails[];
    loading: boolean;
    onView: (sale: SaleWithDetails) => void;
    onEdit: (sale: SaleWithDetails) => void;
    onPrint: (sale: SaleWithDetails) => void;
    onDelete: (sale: SaleWithDetails) => void;
}

export function SalesTable({ sales, loading, onView, onEdit, onPrint, onDelete }: SalesTableProps) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-center">Fecha</TableHead>
                        <TableHead className="text-center">Sucursal</TableHead>
                        <TableHead className="text-center">Ticket</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Método</TableHead>
                        <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32 mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24 rounded-full mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : sales.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No se encontraron ventas con los filtros seleccionados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="font-medium text-center">
                                    {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}
                                </TableCell>
                                <TableCell className="text-sm text-center">
                                    <Badge variant="outline">{sale.branch?.name || "N/A"}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono text-xs text-center">
                                    {sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="text-sm flex justify-center" title={sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}>
                                        {sale.items.length === 1
                                            ? <span className="text-muted-foreground">{sale.items[0].quantity}x {sale.items[0].name}</span>
                                            : <span className="font-medium text-muted-foreground">{sale.items.length} items</span>
                                        }
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                    ${sale.total.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    {(() => {
                                        const payments: SalePaymentSummary[] = sale.payments || [];
                                        let method = sale.paymentMethod;
                                        let label = "MercadoPago";
                                        let color = "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400";

                                        if (payments.length > 1) {
                                            method = "MIXTO";
                                            label = "Mixto";
                                            color = "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
                                        } else if (payments.length === 1) {
                                            method = payments[0].method;
                                        }

                                        if (method === "CASH") {
                                            label = "Efectivo";
                                            color = "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                                        } else if (method === "CARD") {
                                            label = "Tarjeta";
                                            color = "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                                        } else if (method === "TRANSFER") {
                                            label = "Transferencia";
                                            color = "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400";
                                        } else if (method === "MERCADOPAGO") {
                                            label = "MercadoPago";
                                            color = "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                                        }

                                        return (
                                            <Badge variant="secondary" className={cn("font-normal mx-auto", color)}>
                                                {label}
                                            </Badge>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onView(sale)} title="Ver Detalle"><Eye className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(sale)} title="Cambiar método de pago"><Edit className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => onPrint(sale)} title="Imprimir Ticket"><Printer className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(sale)} title="Eliminar Venta"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
