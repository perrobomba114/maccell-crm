"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, FileText, User, Building2, MapPin, Hash, Search, ArrowRight, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Add if needed or remove if not used

export type InvoiceData = {
    generate: boolean;
    salesPoint: number;
    invoiceType: "A" | "B";
    docType: "CUIT" | "DNI" | "FINAL";
    docNumber: string;
    customerName: string;
    customerAddress?: string;
    // New Fields
    concept: number; // 1: Products, 2: Services
    serviceDateFrom?: string;
    serviceDateTo?: string;
    paymentDueDate?: string;
    ivaCondition?: string;
};

interface InvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (data: InvoiceData) => void;
    totalAmount: number;
    defaultSalesPoint?: string;
}

export function InvoiceModal({ open, onOpenChange, onConfirm, totalAmount, defaultSalesPoint = "10" }: InvoiceModalProps) {
    const [isLoadingCuit, setIsLoadingCuit] = useState(false);

    // Form State
    const [invoiceType, setInvoiceType] = useState<"A" | "B">("B");
    const [docType, setDocType] = useState<"CUIT" | "DNI" | "FINAL">("FINAL"); // Default to Cons Final often
    const [docNumber, setDocNumber] = useState("");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [salesPoint, setSalesPoint] = useState(defaultSalesPoint); // Default POS sales point (Matched with AFIP registration)
    const [ivaCondition, setIvaCondition] = useState("");

    // Concept & Dates
    const [concept, setConcept] = useState<1 | 2>(1);
    const today = new Date().toISOString().split('T')[0];
    const [serviceDateFrom, setServiceDateFrom] = useState(today);
    const [serviceDateTo, setServiceDateTo] = useState(today);
    const [paymentDueDate, setPaymentDueDate] = useState(today);

    // Reset logic
    useEffect(() => {
        if (open) {
            setInvoiceType("B");
            setDocType("FINAL");
            setDocNumber("");
            setName("");
            setAddress("");
            setIvaCondition("");
            setConcept(1);
            setServiceDateFrom(today);
            setServiceDateTo(today);
            setPaymentDueDate(today);
        }
    }, [open]);

    // Search CUIT Logic
    const handleSearchCuit = async () => {
        if (!docNumber) return;

        // If user presses search and it is 11 digits, ensure type is CUIT
        if (docNumber.length === 11 && docType !== "CUIT") {
            setDocType("CUIT");
        }

        setIsLoadingCuit(true);
        try {
            // Dynamic import to avoid server action issues if not set up in client correctly
            const { getAfipPadronData } = await import("@/lib/actions/pos");
            const res = await getAfipPadronData(docNumber);

            if (res.success && (res as any).data) {
                const { name, address, isRespInscripto, isMonotributo, ivaCondition } = (res as any).data;
                setName(name);
                setAddress(address);
                setIvaCondition(ivaCondition || "Desconocido");

                if (ivaCondition === "Responsable Inscripto") {
                    setInvoiceType("A");
                    toast.success("Responsable Inscripto detectado. Factura A seleccionada.");
                } else {
                    setInvoiceType("B");
                    toast.success("Cliente cargado: " + name);
                }
            } else {
                toast.error(res.error || "No se encontraron datos.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al buscar CUIT.");
        } finally {
            setIsLoadingCuit(false);
        }
    };

    const handleConfirm = () => {
        // Validation
        if (docType === "CUIT" || docType === "DNI") {
            if (name.length < 3) {
                toast.error("Ingrese el nombre del cliente");
                return;
            }
            if (invoiceType === "A" && ivaCondition !== "Responsable Inscripto") {
                // Warning? Or let it pass if user forces it.
                // Let's warn but allow overrides if they insist? Or stricter?
                // For POS, let's be flexible but warn.
            }
        }

        if (concept === 2) {
            if (!serviceDateFrom || !serviceDateTo || !paymentDueDate) {
                toast.error("Las fechas son obligatorias para Servicios");
                return;
            }
        }

        onConfirm({
            generate: true,
            salesPoint: parseInt(salesPoint) || 10,
            invoiceType,
            docType: docType === "FINAL" ? "FINAL" : docType as any,
            docNumber: docType === "FINAL" ? "0" : docNumber,
            customerName: docType === "FINAL" ? "Consumidor Final" : name,
            customerAddress: address,
            concept,
            serviceDateFrom: concept === 2 ? serviceDateFrom : undefined,
            serviceDateTo: concept === 2 ? serviceDateTo : undefined,
            paymentDueDate: concept === 2 ? paymentDueDate : undefined,
            ivaCondition: ivaCondition
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-8 py-6 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xl">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        Facturación Vendedor
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Configure los detalles antes de emitir el comprobante.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Customer */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                            <User className="w-4 h-4" /> Datos del Cliente
                        </div>

                        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-5">
                            <div className="space-y-2">
                                {/* Manual Type Selection removed in favor of auto-detection */}
                            </div>


                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Número</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={docNumber}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setDocNumber(val);

                                                // Auto-detect type
                                                if (docType === "FINAL" && val.length > 0 && val !== "0") {
                                                    setDocType("DNI");
                                                }

                                                // Switch back to FINAL if cleared
                                                if (val.length === 0) {
                                                    setDocType("FINAL");
                                                } else if (val.length === 11 && docType !== "CUIT") {
                                                    setDocType("CUIT");
                                                } else if ((val.length === 7 || val.length === 8) && docType !== "DNI" && docType !== "FINAL") {
                                                    setDocType("DNI");
                                                }
                                            }}
                                            placeholder={docType === "CUIT" ? "20..." : "Número DNI"}
                                            className="bg-zinc-950 border-zinc-700 font-mono text-lg"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    // Trigger search if it's CUIT
                                                    // Or just confirm inputs if DNI
                                                    if (docType === "CUIT" || docNumber.length === 11) {
                                                        handleSearchCuit();
                                                    }
                                                }
                                            }}
                                        />
                                        <Button onClick={handleSearchCuit} disabled={isLoadingCuit} variant="secondary" className="bg-zinc-800 border-zinc-700">
                                            {isLoadingCuit ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Nombre / Razón Social</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="bg-zinc-950 border-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Dirección</Label>
                                    <Input
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="bg-zinc-950 border-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Condición AFIP</Label>
                                    <div className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-300">
                                        {ivaCondition || "No verificado"}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right: Config */}
                    <div className="space-y-6 flex flex-col">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                            <CircleDollarSign className="w-4 h-4" /> Configuración Factura
                        </div>

                        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6 flex-1">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setInvoiceType("A")} className={cn("flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1", invoiceType === "A" ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900")}>
                                        <span className="text-3xl font-bold">A</span>
                                        <span className="text-xs font-medium">Resp. Inscripto</span>
                                    </button>
                                    <button onClick={() => setInvoiceType("B")} className={cn("flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-1", invoiceType === "B" ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900")}>
                                        <span className="text-3xl font-bold">B</span>
                                        <span className="text-xs font-medium">Cons. Final</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 font-medium">Punto de Venta (AFIP)</Label>
                                <Input
                                    type="number"
                                    value={salesPoint}
                                    onChange={(e) => setSalesPoint(e.target.value)}
                                    className="bg-zinc-950 border-zinc-700 font-mono"
                                    placeholder="Ej: 10"
                                />
                                <p className="text-[10px] text-zinc-500">Asegúrese que este punto exista en AFIP para la empresa seleccionada.</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 font-medium">Concepto</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setConcept(1)} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1", concept === 1 ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900")}>
                                        <span className="text-lg font-bold">Productos</span>
                                    </button>
                                    <button onClick={() => setConcept(2)} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1", concept === 2 ? "bg-amber-600/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900")}>
                                        <span className="text-lg font-bold">Servicios</span>
                                    </button>
                                </div>
                            </div>

                            {concept === 2 && (
                                <div className="space-y-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-500">Inicio Servicio</Label>
                                            <Input type="date" value={serviceDateFrom} onChange={e => setServiceDateFrom(e.target.value)} className="bg-zinc-900 border-zinc-700 h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-500">Fin Servicio</Label>
                                            <Input type="date" value={serviceDateTo} onChange={e => setServiceDateTo(e.target.value)} className="bg-zinc-900 border-zinc-700 h-9" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-zinc-500">Vencimiento Cobro</Label>
                                        <Input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} className="bg-zinc-900 border-zinc-700 h-9" />
                                    </div>
                                </div>
                            )}

                            {/* Total Banner */}
                            <div className="mt-auto bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                                <span className="text-zinc-400 font-medium">Total a Facturar</span>
                                <span className="text-2xl font-bold text-green-400 font-mono">${totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-between gap-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">Cancelar</Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg shadow-lg shadow-blue-900/20">
                        {docType === "FINAL" && invoiceType === "B" ? "Emitir a Consumidor Final" : "Confirmar Factura"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
