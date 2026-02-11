"use client";

import { CheckCircle2, X, Banknote, CreditCard, Smartphone, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { InvoiceModal, type InvoiceData } from "@/components/pos/invoice-modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CheckoutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    subtotal: number;
    editableTotal: string;
    setEditableTotal: (v: string) => void;
    partialPayments: { method: "CASH" | "CARD" | "MERCADOPAGO", amount: number }[];
    paymentAmountInput: string;
    setPaymentAmountInput: (v: string) => void;
    onAddPayment: (method: "CASH" | "CARD" | "MERCADOPAGO") => void;
    onRemovePayment: (index: number) => void;
    isProcessingSale: boolean;
    onConfirm: () => void;
    invoiceData?: InvoiceData;
    setInvoiceData: (v?: InvoiceData) => void;
    isInvoiceModalOpen: boolean;
    setIsInvoiceModalOpen: (v: boolean) => void;
    onInvoiceConfirm: (data: InvoiceData) => void;
    branchData: any;
}

export function CheckoutDialog({
    isOpen,
    onClose,
    total,
    subtotal,
    editableTotal,
    setEditableTotal,
    partialPayments,
    paymentAmountInput,
    setPaymentAmountInput,
    onAddPayment,
    onRemovePayment,
    isProcessingSale,
    onConfirm,
    invoiceData,
    setInvoiceData,
    isInvoiceModalOpen,
    setIsInvoiceModalOpen,
    onInvoiceConfirm,
    branchData
}: CheckoutDialogProps) {
    const paidAmount = partialPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const targetTotal = parseFloat(editableTotal) || total;
    const remaining = Math.max(0, targetTotal - paidAmount);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl border-zinc-800 bg-zinc-950 backdrop-blur-2xl text-white shadow-2xl p-0 gap-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 bg-zinc-900 border-b border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <CreditCard className="w-32 h-32 -mr-10 -mt-10" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <ShoppingCartIcon className="w-6 h-6 text-primary" />
                        Finalizar Cobro
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 font-medium">
                        Revise el total y seleccione los métodos de pago.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* TOTAL ADJUSTMENT */}
                    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                        <div className="relative flex justify-center items-center">
                            <Input
                                name="editable-total"
                                id="editable-total-input"
                                type="text"
                                value={`$${(parseFloat(editableTotal) || 0).toLocaleString()}`}
                                readOnly
                                className="h-24 text-6xl font-black text-[#39FF14] bg-transparent border-none focus-within:ring-0 focus-visible:ring-0 shadow-none cursor-default text-center drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]"
                            />
                        </div>
                    </div>

                    {/* PAYMENT INFO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                            <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Total Pagado</span>
                            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">${paidAmount.toLocaleString()}</div>
                        </div>
                        <div className={cn(
                            "rounded-xl p-4 border transition-colors",
                            remaining > 0 ? "bg-red-500/5 border-red-500/10" : "bg-zinc-900/50 border-zinc-800"
                        )}>
                            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Restante</span>
                            <div className={cn(
                                "text-2xl font-black font-mono mt-1",
                                remaining > 0 ? "text-red-400" : "text-zinc-600"
                            )}>
                                ${remaining.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* ADD PAYMENT SECTION */}
                    {remaining > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="payment-amount-input" className="text-xs uppercase text-zinc-400 font-bold tracking-wider">Agregar Pago</Label>
                                <span className="text-xs text-zinc-600 italic">Monto a imputar:</span>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                    <Input
                                        name="payment-amount"
                                        id="payment-amount-input"
                                        type="number"
                                        value={paymentAmountInput}
                                        onChange={(e) => setPaymentAmountInput(e.target.value)}
                                        className="pl-8 bg-zinc-950 border-zinc-700 text-green-400 font-bold font-mono h-12 text-2xl"
                                        placeholder="Monto..."
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPaymentAmountInput(remaining.toString())}
                                    className="h-12 w-12 border-zinc-700 hover:bg-zinc-800"
                                    title="Usar Restante"
                                >
                                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "CASH", label: "Efectivo", icon: Banknote, color: "emerald" },
                                    { id: "CARD", label: "Tarjeta", icon: CreditCard, color: "blue" },
                                    { id: "MERCADOPAGO", label: "MP / QR", icon: Smartphone, color: "sky" }
                                ].map((m) => (
                                    <Button
                                        key={m.id}
                                        onClick={() => onAddPayment(m.id as any)}
                                        className={`h-12 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center justify-center gap-1 group`}
                                    >
                                        <m.icon className="w-4 h-4 opacity-70 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold">{m.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PAYMENT LIST */}
                    {partialPayments.length > 0 && (
                        <div className="space-y-1 bg-zinc-900/30 rounded-xl p-2 max-h-40 overflow-y-auto border border-white/5">
                            {partialPayments.map((p, i) => (
                                <div key={i} className="flex justify-between items-center p-3 text-sm bg-zinc-950/50 rounded-lg mb-1 last:mb-0 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded bg-zinc-800 text-zinc-300`}>
                                            {p.method === "CASH" && <Banknote className="w-4 h-4" />}
                                            {p.method === "CARD" && <CreditCard className="w-4 h-4" />}
                                            {p.method === "MERCADOPAGO" && <Smartphone className="w-4 h-4" />}
                                        </div>
                                        <span className="font-bold text-zinc-300">
                                            {p.method === "CASH" ? "Efectivo" :
                                                p.method === "CARD" ? "Tarjeta" :
                                                    p.method === "MERCADOPAGO" ? "MercadoPago" : p.method}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-black text-lg text-emerald-400">${p.amount.toLocaleString()}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemovePayment(i)}
                                            className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-zinc-900 border-t border-zinc-800">
                    <div className="grid grid-cols-3 gap-3 w-full">
                        <Button
                            onClick={onClose}
                            className="h-14 w-full rounded-2xl flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all border-0"
                        >
                            <X className="w-5 h-5" />
                            <span className="hidden sm:inline">Cancelar</span>
                        </Button>

                        <div className="relative group">
                            <Button
                                className={cn(
                                    "h-14 w-full rounded-2xl flex items-center justify-center gap-2 font-black text-white shadow-xl transition-all border-0",
                                    invoiceData
                                        ? "bg-blue-600 hover:bg-blue-500 ring-4 ring-blue-500/20"
                                        : "bg-blue-700/50 hover:bg-blue-700 text-blue-100"
                                )}
                                onClick={() => setIsInvoiceModalOpen(true)}
                            >
                                <FileText className="w-5 h-5" />
                                <span className="hidden sm:inline truncate">{invoiceData ? `Factura ${invoiceData.invoiceType}` : "Factura"}</span>
                                <span className="sm:hidden">{invoiceData ? "FE" : "+FE"}</span>
                            </Button>
                            {invoiceData && (
                                <button
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center hover:bg-red-500 transition-colors border-2 border-zinc-900"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInvoiceData(undefined);
                                        toast.info("Factura removida");
                                    }}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <Button
                            className={cn(
                                "h-14 w-full rounded-2xl flex items-center justify-center gap-2 text-white font-black shadow-xl transition-all border-0",
                                invoiceData
                                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500"
                                    : "bg-emerald-600 hover:bg-emerald-500"
                            )}
                            disabled={isProcessingSale || remaining > 1}
                            onClick={onConfirm}
                        >
                            {isProcessingSale ? (
                                <span className="animate-spin h-6 w-6 border-4 border-white/30 border-t-white rounded-full" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>COBRAR</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>

                <InvoiceModal
                    open={isInvoiceModalOpen}
                    onOpenChange={setIsInvoiceModalOpen}
                    onConfirm={onInvoiceConfirm}
                    totalAmount={parseFloat(editableTotal) || total}
                    defaultSalesPoint={branchData.name.toUpperCase().includes("8 BIT") ? "3" : "10"}
                />
            </DialogContent>
        </Dialog>
    );
}

function ShoppingCartIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    );
}
