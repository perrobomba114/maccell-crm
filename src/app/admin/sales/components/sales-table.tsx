import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Eye,
    Edit,
    Printer,
    Trash2,
    CalendarClock,
    Building2,
    Receipt,
    Package,
    ShoppingBag,
} from "lucide-react";
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

type PaymentBadge = {
    label: string;
    color: string;
};

function resolvePaymentBadge(sale: SaleWithDetails): PaymentBadge {
    const payments: SalePaymentSummary[] = sale.payments || [];
    let method = sale.paymentMethod;

    if (payments.length > 1) {
        return {
            label: "Mixto",
            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        };
    }
    if (payments.length === 1) {
        method = payments[0].method;
    }

    switch (method) {
        case "CASH":
            return {
                label: "Efectivo",
                color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            };
        case "CARD":
            return {
                label: "Tarjeta",
                color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            };
        case "TRANSFER":
            return {
                label: "Transferencia",
                color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
            };
        case "MERCADOPAGO":
            return {
                label: "MercadoPago",
                color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
            };
        default:
            return {
                label: "MercadoPago",
                color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            };
    }
}

function shortTicket(saleNumber: string) {
    return saleNumber.split("SALE-").pop()?.split("-")[0] || saleNumber;
}

function formatARS(value: number) {
    return `$${value.toLocaleString("es-AR")}`;
}

export function SalesTable({ sales, loading, onView, onEdit, onPrint, onDelete }: SalesTableProps) {
    return (
        <>
            {/* Desktop: tabla */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Sucursal</TableHead>
                            <TableHead>Ticket</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Método</TableHead>
                            <TableHead className="min-w-[140px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="mx-auto h-6 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="ml-auto h-8 w-32" /></TableCell>
                                </TableRow>
                            ))
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ShoppingBag className="h-8 w-8 opacity-30" />
                                        <p>No se encontraron ventas con los filtros seleccionados.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => {
                                const payment = resolvePaymentBadge(sale);
                                return (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(sale.createdAt), "dd/MM/yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(sale.createdAt), "HH:mm 'hs'")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-md font-semibold">
                                                {sale.branch?.name || "N/A"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                                            #{shortTicket(sale.saleNumber)}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="text-sm text-muted-foreground"
                                                title={sale.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                                            >
                                                {sale.items.length === 1
                                                    ? `${sale.items[0].quantity}x ${sale.items[0].name}`
                                                    : `${sale.items.length} items`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                            {formatARS(sale.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className={cn("rounded-md font-semibold", payment.color)}>
                                                {payment.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                                                    onClick={() => onView(sale)}
                                                    title="Ver detalle"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                                                    onClick={() => onEdit(sale)}
                                                    title="Cambiar método de pago"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                                                    onClick={() => onPrint(sale)}
                                                    title="Imprimir ticket"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                                                    onClick={() => onDelete(sale)}
                                                    title="Eliminar venta"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="mt-2 h-4 w-24" />
                            <Skeleton className="mt-4 h-7 w-28" />
                            <Skeleton className="mt-3 h-9 w-full" />
                        </div>
                    ))
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 opacity-30" />
                        <p>No se encontraron ventas con los filtros seleccionados.</p>
                    </div>
                ) : (
                    sales.map((sale) => {
                        const payment = resolvePaymentBadge(sale);
                        const itemsLabel =
                            sale.items.length === 1
                                ? `${sale.items[0].quantity}x ${sale.items[0].name}`
                                : `${sale.items.length} items`;

                        return (
                            <article
                                key={sale.id}
                                className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                            >
                                {/* Header del card: ticket + monto */}
                                <div className="flex items-start justify-between gap-3 border-b bg-gradient-to-r from-emerald-500/5 to-transparent p-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                            <Receipt className="h-3.5 w-3.5" />
                                            <span className="font-mono">#{shortTicket(sale.saleNumber)}</span>
                                        </div>
                                        <p className="mt-2 text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {formatARS(sale.total)}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={cn("rounded-md font-semibold", payment.color)}>
                                        {payment.label}
                                    </Badge>
                                </div>

                                {/* Body: metadata */}
                                <div className="grid grid-cols-2 gap-3 p-4 text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">
                                                {format(new Date(sale.createdAt), "dd MMM", { locale: es })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(sale.createdAt), "HH:mm 'hs'")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <p className="truncate font-semibold">{sale.branch?.name || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 min-w-0">
                                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <p
                                            className="truncate text-xs text-muted-foreground"
                                            title={sale.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                                        >
                                            {itemsLabel}
                                        </p>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="grid grid-cols-4 gap-1 border-t bg-muted/20 p-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-500/10"
                                        onClick={() => onView(sale)}
                                    >
                                        <Eye className="h-4 w-4" />
                                        Ver
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 gap-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/10"
                                        onClick={() => onEdit(sale)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        Pago
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 gap-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10"
                                        onClick={() => onPrint(sale)}
                                    >
                                        <Printer className="h-4 w-4" />
                                        Imprimir
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 gap-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"
                                        onClick={() => onDelete(sale)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Borrar
                                    </Button>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </>
    );
}
