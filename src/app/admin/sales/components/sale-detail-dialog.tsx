import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DollarSign,
    Calendar,
    Building2,
    User,
    AlertCircle,
    ExternalLink,
    CreditCard,
    Smartphone,
    Banknote,
    ArrowRightLeft,
    Printer,
    FileCheck,
    Receipt,
    ShoppingBag,
    Wrench,
    Tag
} from "lucide-react";
import { buildSalePaymentDetails } from "@/lib/sale-payment-details";
import { buildAdminRepairSearchHref } from "./sale-detail-links";
import { cn } from "@/lib/utils";
import type { PaymentMethodLike, SaleWithDetails } from "@/types/sales";

interface SaleDetailDialogProps {
    sale: SaleWithDetails | null;
    onClose: () => void;
    onPrint?: (sale: SaleWithDetails) => void;
}

function getMethodBadgeConfig(methodLabel: string, isMixed: boolean) {
    if (isMixed) {
        return {
            icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
            badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-300",
            label: "Pago Mixto",
        };
    }

    const normalized = methodLabel.toLowerCase();
    if (normalized.includes("mercadopago")) {
        return {
            icon: <Smartphone className="w-3.5 h-3.5" />,
            badgeClass: "bg-sky-500/15 border-sky-500/30 text-sky-300",
            label: "MercadoPago",
        };
    }
    if (normalized.includes("efectivo") || normalized.includes("cash")) {
        return {
            icon: <Banknote className="w-3.5 h-3.5" />,
            badgeClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
            label: "Efectivo",
        };
    }
    if (normalized.includes("tarjeta") || normalized.includes("card")) {
        return {
            icon: <CreditCard className="w-3.5 h-3.5" />,
            badgeClass: "bg-blue-500/15 border-blue-500/30 text-blue-300",
            label: "Tarjeta",
        };
    }
    if (normalized.includes("transfer")) {
        return {
            icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
            badgeClass: "bg-violet-500/15 border-violet-500/30 text-violet-300",
            label: "Transferencia",
        };
    }

    return {
        icon: <DollarSign className="w-3.5 h-3.5" />,
        badgeClass: "bg-slate-500/15 border-slate-500/30 text-slate-300",
        label: methodLabel,
    };
}

export function SaleDetailDialog({ sale, onClose, onPrint }: SaleDetailDialogProps) {
    if (!sale) return null;

    const paymentDetails = buildSalePaymentDetails({
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        payments: sale.payments,
    });

    const badgeConfig = getMethodBadgeConfig(paymentDetails.label, paymentDetails.isMixed);
    const shortTicket = sale.saleNumber.split("SALE-").pop()?.split("-")[0] || sale.saleNumber;

    return (
        <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-0 border border-slate-800/90 bg-slate-950 shadow-2xl rounded-2xl sm:max-w-[min(900px,calc(100vw-2rem))] custom-scrollbar">
                
                {/* Header: Dark Glassmorphic with Ticket, Method & Branch */}
                <DialogHeader className="relative shrink-0 overflow-hidden border-b border-slate-800 p-5 sm:p-6 text-left bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full relative z-10">
                        
                        <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <DialogTitle className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-emerald-400" />
                                    <span>Ticket #{shortTicket}</span>
                                </DialogTitle>

                                <Badge className={cn("font-black border rounded-lg px-2.5 py-0.5 text-[10px] uppercase shadow-sm flex items-center gap-1.5", badgeConfig.badgeClass)}>
                                    {badgeConfig.icon}
                                    <span>{badgeConfig.label}</span>
                                </Badge>

                                {sale.wasPaymentModified && (
                                    <Badge className="bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-[9px] uppercase flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Pago Modificado</span>
                                    </Badge>
                                )}

                                {sale.invoice && (
                                    <Badge className="bg-blue-600/20 border border-blue-400/50 text-blue-300 font-black text-[9px] uppercase flex items-center gap-1">
                                        <FileCheck className="w-3 h-3" />
                                        <span>Factura {sale.invoice.invoiceType}</span>
                                    </Badge>
                                )}
                            </div>

                            {sale.branch && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{sale.branch.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Quick Total Tag */}
                        <div className="flex items-center gap-2 sm:justify-end">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-right shadow-inner">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                                    Total Operación
                                </span>
                                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-300">
                                    ${sale.total.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">

                    {/* 1. Top 4 KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* Fecha */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-blue-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Fecha</span>
                            </div>
                            <p className="text-sm sm:text-base font-black text-white">
                                {format(new Date(sale.createdAt), "dd/MM/yy", { locale: es })}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 font-mono">
                                {format(new Date(sale.createdAt), "HH:mm", { locale: es })} hs
                            </p>
                        </div>

                        {/* Sucursal */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-purple-400">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sucursal</span>
                            </div>
                            <p className="text-xs sm:text-sm font-black text-white uppercase italic truncate">
                                {sale.branch?.name || "N/A"}
                            </p>
                            <p className="text-[9px] font-bold text-purple-400/80 uppercase">Punto de Venta</p>
                        </div>

                        {/* Vendedor */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-amber-400">
                                <User className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Vendedor</span>
                            </div>
                            <p className="text-xs sm:text-sm font-black text-white uppercase italic truncate">
                                {sale.vendor?.name || "N/A"}
                            </p>
                            <p className="text-[9px] font-bold text-amber-400/80 uppercase">Operador</p>
                        </div>

                        {/* Método de Pago */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-slate-400">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Método</span>
                            </div>
                            <p className="text-xs sm:text-sm font-black text-white uppercase truncate">
                                {badgeConfig.label}
                            </p>
                            <p className="text-[9px] font-bold text-emerald-400 uppercase">
                                {paymentDetails.isMixed ? `${paymentDetails.rows.length} Pagos` : "Cobro Único"}
                            </p>
                        </div>
                    </div>

                    {/* 2. Mixed Payment Breakdown (if applicable) */}
                    {paymentDetails.isMixed && (
                        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-400">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                                        Desglose de Pago Mixto
                                    </span>
                                </div>
                                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                    Total: {paymentDetails.formattedTotal}
                                </span>
                            </div>

                            {paymentDetails.rows.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {paymentDetails.rows.map((payment) => (
                                        <div
                                            key={payment.method}
                                            className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5"
                                        >
                                            <span className="text-xs font-bold text-slate-300 uppercase">
                                                {payment.label}
                                            </span>
                                            <span className="font-mono text-sm font-black text-white">
                                                {payment.formattedAmount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-amber-400/80 italic">
                                    Esta venta figura como mixta, pero no contiene registros individuales de cobro.
                                </p>
                            )}
                        </div>
                    )}

                    {/* 3. AFIP Invoice Details (if generated) */}
                    {sale.invoice && (
                        <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-4 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-400">
                                    <FileCheck className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                                        Comprobante Electrónico AFIP / ARCA
                                    </span>
                                </div>
                                <Badge className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-black">
                                    Factura {sale.invoice.invoiceType} #{sale.invoice.invoiceNumber}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">CAE</p>
                                    <p className="font-mono font-bold text-white">{sale.invoice.cae}</p>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Vto. CAE</p>
                                    <p className="font-mono font-bold text-slate-300">
                                        {sale.invoice.caeExpiresAt ? format(new Date(sale.invoice.caeExpiresAt), "dd/MM/yyyy") : "N/A"}
                                    </p>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Cliente</p>
                                    <p className="font-bold text-white uppercase truncate">{sale.invoice.customerName || "Consumidor Final"}</p>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">{sale.invoice.customerDocType || "DOC"}</p>
                                    <p className="font-mono font-bold text-slate-300">{sale.invoice.customerDoc || "0"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Products / Services Sold Table */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400">
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Artículos y Servicios ({sale.items.length})
                                </span>
                            </div>
                            <span className="text-[9px] font-bold uppercase text-slate-500">
                                Detalle de Operación
                            </span>
                        </div>

                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                            <Table>
                                <TableHeader className="bg-slate-900/80">
                                    <TableRow className="border-b border-slate-800 hover:bg-transparent">
                                        <TableHead className="w-[60px] text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Cant.
                                        </TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Descripción / Artículo
                                        </TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Unitario
                                        </TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Subtotal
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sale.items.map((item) => {
                                        const repairHref = buildAdminRepairSearchHref(item);
                                        const isRepair = !!item.repairId || item.name.toLowerCase().includes("ticket #");

                                        return (
                                            <TableRow key={item.id} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/30">
                                                <TableCell className="font-bold text-center text-slate-400 text-xs">
                                                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white font-mono">
                                                        {item.quantity}x
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-medium text-white text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {isRepair ? (
                                                            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                        ) : (
                                                            <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                        )}

                                                        {repairHref ? (
                                                            <Link
                                                                href={repairHref}
                                                                onClick={onClose}
                                                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline font-bold transition-colors"
                                                            >
                                                                <span>{item.name}</span>
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        ) : (
                                                            <span className="font-bold text-slate-200">{item.name}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-slate-400">
                                                    ${item.price.toLocaleString("es-AR")}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-black text-xs text-emerald-300">
                                                    ${(item.quantity * item.price).toLocaleString("es-AR")}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* 5. Footer Summary & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {onPrint && (
                                <Button
                                    variant="outline"
                                    onClick={() => onPrint(sale)}
                                    className="gap-1.5 h-9 text-xs font-bold border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl"
                                >
                                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Reimprimir Comprobante</span>
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <Button 
                                onClick={onClose} 
                                className="h-9 px-6 text-xs font-black uppercase tracking-wider rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
