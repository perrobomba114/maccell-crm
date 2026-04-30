import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";
import type { EditablePaymentMethod, SaleWithDetails } from "@/types/sales";

interface EditPaymentDialogProps {
    sale: SaleWithDetails | null;
    newPaymentMethod: EditablePaymentMethod | "";
    setNewPaymentMethod: (m: EditablePaymentMethod) => void;
    onClose: () => void;
    onUpdate: () => void;
    isUpdating: boolean;
}

export function EditPaymentDialog({ sale, newPaymentMethod, setNewPaymentMethod, onClose, onUpdate, isUpdating }: EditPaymentDialogProps) {
    if (!sale) return null;

    return (
        <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
                <div className="bg-zinc-950 text-white p-6 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-1">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Administración</p>
                        <h2 className="text-2xl font-black tracking-tighter uppercase text-white">Modificar Pago</h2>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Edit size={80} className="text-white" />
                    </div>
                </div>

                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-6">
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Ticket Seleccionado</Label>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white font-mono tracking-tight">
                            #{sale?.saleNumber.split('SALE-').pop()?.split('-')[0]}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nuevo Método de Pago</Label>
                        <Select value={newPaymentMethod} onValueChange={(value) => setNewPaymentMethod(value as EditablePaymentMethod)}>
                            <SelectTrigger className="w-full h-11 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-950">
                                <SelectValue placeholder="Seleccionar método..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH" className="font-medium">Efectivo</SelectItem>
                                <SelectItem value="CARD" className="font-medium">Tarjeta (Débito/Crédito)</SelectItem>
                                <SelectItem value="MERCADOPAGO" className="font-medium">MercadoPago / Transferencia</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} className="font-bold border-zinc-300 hover:bg-zinc-200 text-zinc-600">Cancelar</Button>
                    <Button onClick={onUpdate} disabled={isUpdating} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-6">
                        {isUpdating ? "Guardando..." : "Confirmar Cambio"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
