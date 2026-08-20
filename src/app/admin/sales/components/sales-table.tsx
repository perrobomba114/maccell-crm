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
    Wrench,
    Smartphone,
    Banknote,
    CreditCard,
    ArrowRightLeft,
    Tag,
    Clock
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
    icon: React.ReactNode;
};

function resolvePaymentBadge(sale: SaleWithDetails): PaymentBadge {
    const payments: SalePaymentSummary[] = sale.payments || [];
    const uniqueMethods = Array.from(new Set(payments.map((p) => p.method).filter(Boolean)));
    let method = sale.paymentMethod;

    if (uniqueMethods.length > 1) {
        return {
            label: "Mixto",
            color: "bg-amber-500/15 border-amber-500/30 text-amber-300",
            icon: <ArrowRightLeft className="w-3 h-3 mr-1" />,
        };
    }
    if (uniqueMethods.length === 1) {
        method = uniqueMethods[0];
    } else if (method === "SPLIT" || method === "MIXTO") {
        return {
            label: "Mixto",
            color: "bg-amber-500/15 border-amber-500/30 text-amber-300",
            icon: <ArrowRightLeft className="w-3 h-3 mr-1" />,
        };
    }

    switch (method) {
        case "CASH":
            return {
                label: "Efectivo",
                color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
                icon: <Banknote className="w-3 h-3 mr-1" />,
            };
        case "CARD":
            return {
                label: "Tarjeta",
                color: "bg-blue-500/15 border-blue-500/30 text-blue-300",
                icon: <CreditCard className="w-3 h-3 mr-1" />,
            };
        case "TRANSFER":
            return {
                label: "Transferencia",
                color: "bg-violet-500/15 border-violet-500/30 text-violet-300",
                icon: <ArrowRightLeft className="w-3 h-3 mr-1" />,
            };
        case "MERCADOPAGO":
            return {
                label: "MercadoPago",
                color: "bg-sky-500/15 border-sky-500/30 text-sky-300",
                icon: <Smartphone className="w-3 h-3 mr-1" />,
            };
        default:
            return {
                label: "MercadoPago",
                color: "bg-sky-500/15 border-sky-500/30 text-sky-300",
                icon: <Smartphone className="w-3 h-3 mr-1" />,
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
        <div className="w-full">
            {/* Desktop: tabla moderna */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl backdrop-blur-md">
                <Table>
                    <TableHeader className="bg-slate-900/90 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent border-slate-800">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-3.5 pl-4">
                                Fecha / Hora
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Sucursal
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Ticket N°
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Ítems
                            </TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Total
                            </TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Método
                            </TableHead>
                            <TableHead className="min-w-[150px] text-right text-[10px] font-black uppercase tracking-wider text-slate-400 pr-4">
                                Acciones
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i} className="border-slate-850">
                                    <TableCell className="pl-4"><Skeleton className="h-4 w-24 bg-slate-900" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-lg bg-slate-900" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 rounded bg-slate-900" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-44 bg-slate-900" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20 bg-slate-900" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="mx-auto h-6 w-24 rounded-full bg-slate-900" /></TableCell>
                                    <TableCell className="text-right pr-4"><Skeleton className="ml-auto h-8 w-32 rounded-lg bg-slate-900" /></TableCell>
                                </TableRow>
                            ))
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-6">
                                        <ShoppingBag className="h-10 w-10 opacity-30 text-slate-400" />
                                        <p className="text-sm font-bold text-slate-400">No se encontraron ventas registradas con los filtros seleccionados.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => {
                                const payment = resolvePaymentBadge(sale);
                                const hasRepair = sale.items.some(i => !!i.repairId || i.name.toLowerCase().includes("ticket #"));

                                return (
                                    <TableRow 
                                        key={sale.id}
                                        className="border-b border-slate-900/80 hover:bg-slate-900/50 transition-colors group"
                                    >
                                        {/* Fecha */}
                                        <TableCell className="pl-4 font-medium py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs">
                                                    {format(new Date(sale.createdAt), "dd/MM/yyyy")}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                                                    {format(new Date(sale.createdAt), "HH:mm 'hs'")}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Sucursal */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge 
                                                    variant="outline" 
                                                    className="bg-slate-900/90 border-slate-800 text-slate-300 font-bold text-[11px] px-2 py-0.5 rounded-lg shadow-sm"
                                                >
                                                    <Building2 className="w-3 h-3 text-blue-400 mr-1" />
                                                    {sale.branch?.name || "N/A"}
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        {/* Ticket */}
                                        <TableCell>
                                            <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg">
                                                <Receipt className="w-3 h-3 text-emerald-400" />
                                                <span>#{shortTicket(sale.saleNumber)}</span>
                                            </div>
                                        </TableCell>

                                        {/* Items */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {hasRepair ? (
                                                    <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-300 font-bold text-[10px] px-2.5 py-0.5 rounded-lg shrink-0 inline-flex items-center">
                                                        <Wrench className="w-3 h-3 mr-1.5" />
                                                        <span>{sale.items.length === 1 ? "1 Reparación" : `${sale.items.length} ítems`}</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-900 border-slate-800 text-slate-300 font-bold text-[11px] px-2.5 py-0.5 rounded-lg shrink-0 inline-flex items-center">
                                                        <ShoppingBag className="w-3 h-3 mr-1.5 text-blue-400" />
                                                        <span>{sale.items.length === 1 ? "1 artículo" : `${sale.items.length} artículos`}</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Total */}
                                        <TableCell className="text-right font-black font-mono text-emerald-400 text-sm">
                                            {formatARS(sale.total)}
                                        </TableCell>

                                        {/* Método de Pago */}
                                        <TableCell className="text-center">
                                            <Badge 
                                                variant="secondary" 
                                                className={cn("font-bold text-[11px] px-2.5 py-0.5 rounded-lg border shadow-sm inline-flex items-center", payment.color)}
                                            >
                                                {payment.icon}
                                                <span>{payment.label}</span>
                                            </Badge>
                                        </TableCell>

                                        {/* Acciones */}
                                        <TableCell className="text-right pr-4">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm transition-all"
                                                    onClick={() => onView(sale)}
                                                    title="Ver detalle del ticket (Ojito)"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm transition-all"
                                                    onClick={() => onEdit(sale)}
                                                    title="Cambiar método de pago"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm transition-all"
                                                    onClick={() => onPrint(sale)}
                                                    title="Reimprimir comprobante"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm transition-all"
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
                        <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm space-y-3">
                            <Skeleton className="h-5 w-32 bg-slate-900" />
                            <Skeleton className="h-4 w-24 bg-slate-900" />
                            <Skeleton className="h-7 w-28 bg-slate-900" />
                            <Skeleton className="h-9 w-full bg-slate-900" />
                        </div>
                    ))
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
                        <ShoppingBag className="h-8 w-8 opacity-30" />
                        <p>No se encontraron ventas registradas con los filtros seleccionados.</p>
                    </div>
                ) : (
                    sales.map((sale) => {
                        const payment = resolvePaymentBadge(sale);
                        const isRepair = sale.items.some(i => !!i.repairId || i.name.toLowerCase().includes("ticket #"));
                        const itemsLabel =
                            sale.items.length === 1
                                ? (isRepair ? "1 Reparación" : "1 artículo")
                                : `${sale.items.length} artículos`;

                        return (
                            <article
                                key={sale.id}
                                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl transition-all"
                            >
                                {/* Header del card: ticket + monto */}
                                <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-900/60 p-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                            <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                                            <span className="font-mono">#{shortTicket(sale.saleNumber)}</span>
                                        </div>
                                        <p className="mt-1 text-2xl font-black font-mono text-emerald-400">
                                            {formatARS(sale.total)}
                                        </p>
                                    </div>
                                    <Badge 
                                        variant="secondary" 
                                        className={cn("font-bold text-[11px] px-2.5 py-0.5 rounded-lg border shadow-sm", payment.color)}
                                    >
                                        {payment.icon}
                                        <span>{payment.label}</span>
                                    </Badge>
                                </div>

                                {/* Body: metadata */}
                                <div className="grid grid-cols-2 gap-3 p-4 text-sm bg-slate-950">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" />
                                        <div className="min-w-0">
                                            <p className="truncate font-bold text-white text-xs">
                                                {format(new Date(sale.createdAt), "dd MMM yyyy", { locale: es })}
                                            </p>
                                            <p className="text-[11px] font-mono text-slate-400">
                                                {format(new Date(sale.createdAt), "HH:mm 'hs'")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="h-4 w-4 shrink-0 text-blue-400" />
                                        <p className="truncate font-bold text-slate-300 text-xs">{sale.branch?.name || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 min-w-0 pt-1 border-t border-slate-900">
                                        <Package className="h-4 w-4 shrink-0 text-amber-400" />
                                        <p
                                            className="truncate text-xs font-medium text-slate-300"
                                            title={sale.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                                        >
                                            {itemsLabel}
                                        </p>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="grid grid-cols-4 gap-1.5 border-t border-slate-800 bg-slate-900/60 p-2.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg"
                                        onClick={() => onView(sale)}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Ver
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg"
                                        onClick={() => onEdit(sale)}
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        Pago
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg"
                                        onClick={() => onPrint(sale)}
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        Ticket
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg"
                                        onClick={() => onDelete(sale)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Borrar
                                    </Button>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}
