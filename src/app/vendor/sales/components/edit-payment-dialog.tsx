import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Banknote, CreditCard, Smartphone } from "lucide-react";
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modificar Método de Pago</DialogTitle>
                    <DialogDescription>Esta acción enviará una solicitud al administrador para aprobar el cambio.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-col items-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Venta</span>
                        <span className="text-3xl font-black text-zinc-900">${sale?.total.toLocaleString()}</span>
                        <span className="text-xs text-zinc-500 mt-2 font-mono bg-white px-2 py-1 rounded border">{sale?.saleNumber}</span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="payment-method-trigger" className="text-sm font-medium">Nuevo Método de Pago</Label>
                        <Select value={newPaymentMethod} onValueChange={(value) => setNewPaymentMethod(value as EditablePaymentMethod)}>
                            <SelectTrigger id="payment-method-trigger" className="w-full h-11">
                                <SelectValue placeholder="Seleccionar método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH"><div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Efectivo</div></SelectItem>
                                <SelectItem value="CARD"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Tarjeta</div></SelectItem>
                                <SelectItem value="MERCADOPAGO"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> MercadoPago / Transferencia</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onUpdate} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isUpdating ? "Enviando..." : "Confirmar Solicitud"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
