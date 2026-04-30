import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText, Printer } from "lucide-react";
import { getPaymentBadge } from "./payment-badge";
import type { SaleWithDetails } from "@/types/sales";

interface SaleDetailsDialogProps {
    sale: SaleWithDetails | null;
    onClose: () => void;
    onPrint: (sale: SaleWithDetails) => void;
}

export function SaleDetailsDialog({ sale, onClose, onPrint }: SaleDetailsDialogProps) {
    if (!sale) return null;

    return (
        <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] h-[85vh] bg-zinc-950 border-zinc-800 text-zinc-50 p-0 overflow-hidden gap-0 flex flex-col">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-3 text-xl font-medium tracking-tight">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span>Ticket #{sale?.saleNumber.split('SALE-').pop()?.split('-')[0]}</span>
                            <span className="text-sm font-normal text-zinc-400">
                                {format(new Date(sale.createdAt), "PPP", { locale: es })}
                            </span>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="sr-only">Detalles de la venta</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="flex-1 px-6">
                        <div className="py-4 space-y-4">
                            {sale.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start py-3 border-b border-zinc-900 last:border-0 group/item hover:bg-zinc-900/50 -mx-4 px-4 rounded-lg transition-colors">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 rounded-md bg-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-500">
                                            {item.quantity}x
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-zinc-200">{item.name}</span>
                                            <span className="text-xs text-zinc-500">Código: {item.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-zinc-200 tabular-nums">${(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-xs text-zinc-500 tabular-nums">${item.price.toLocaleString()} un.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="bg-zinc-900/50 p-6 border-t border-zinc-900 space-y-6 shrink-0 z-10">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="text-sm text-zinc-500 font-medium">Método de Pago</p>
                                <div>{getPaymentBadge(sale.paymentMethod, sale.payments || [], sale.total)}</div>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-sm text-zinc-500 font-medium">Total de Venta</p>
                                <p className="text-3xl font-bold tracking-tighter text-white tabular-nums">${sale.total.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 [&>button]:flex-1">
                            <Button variant="outline" onClick={onClose} className="bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800">Cerrar</Button>
                            <Button onClick={() => onPrint(sale)} className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-900/20">
                                <Printer className="w-4 h-4 mr-2" /> Reimprimir Comprobante
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
