"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle2, User, Building2, MapPin, Hash, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export type InvoiceData = {
    generate: boolean;
    salesPoint: number;
    invoiceType: "A" | "B";
    docType: "CUIT" | "DNI" | "FINAL";
    docNumber: string;
    customerName: string;
    customerAddress?: string;
};

interface InvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (data: InvoiceData) => void;
    totalAmount: number;
}

export function InvoiceModal({ open, onOpenChange, onConfirm, totalAmount }: InvoiceModalProps) {
    // Mode: "simple" (Cons Final) or "advanced" (Fact A / DNI)
    const [mode, setMode] = useState<"final" | "detail">("final");

    // Form State
    const [invoiceType, setInvoiceType] = useState<"A" | "B">("B");
    const [docType, setDocType] = useState<"CUIT" | "DNI">("DNI");
    const [docNumber, setDocNumber] = useState("");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [salesPoint, setSalesPoint] = useState("3");

    // Reset logic when opening
    useEffect(() => {
        if (open) {
            setMode("final");
            setInvoiceType("B");
            setDocType("DNI");
            setDocNumber("");
            setName("");
            setAddress("");
            setIsLoadingCuit(false);
        }
    }, [open]);

    // CUIT Lookup Logic
    const [isLoadingCuit, setIsLoadingCuit] = useState(false);

    const handleCuitKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (docNumber.length < 11) {
                toast.error("El CUIT debe tener 11 dígitos");
                return;
            }

            setIsLoadingCuit(true);
            try {
                // Dynamic import to avoid server action issues if not set up in client correctly, 
                // but standard import should work if 'use server' is at top of file, 
                // here we imported function from client component, so we rely on it being a server action.
                // WE MUST IMPORT IT.
                const { getAfipPadronData } = await import("@/lib/actions/pos");
                const res = await getAfipPadronData(docNumber);

                if (res.success && 'data' in res) {
                    const { name, address, isRespInscripto, isMonotributo } = res.data;
                    setName(name);
                    setAddress(address);

                    // Auto-select Invoice Type
                    if (isRespInscripto) {
                        setInvoiceType("A");
                        toast.success("Contribuyente Responsable Inscripto detectado. Factura A seleccionada.");
                    } else if (isMonotributo) {
                        setInvoiceType("B");
                        toast.success("Monotributista detectado. Factura B seleccionada.");
                    } else {
                        setInvoiceType("B");
                        toast.success(`Datos cargados: ${name}`);
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
        }
    };

    const handleConfirm = () => {
        // Logic for "Consumidor Final" mode
        if (mode === "final") {
            onConfirm({
                generate: true,
                salesPoint: parseInt(salesPoint) || 3,
                invoiceType: "B",
                docType: "FINAL",
                docNumber: "0",
                customerName: "Consumidor Final",
                customerAddress: ""
            });
            return;
        }

        // Logic for "Con Datos" mode
        if (docType === "CUIT") {
            if (docNumber.length !== 11) {
                toast.error("El CUIT debe tener 11 dígitos");
                return;
            }
            if (invoiceType === "A" && docType !== "CUIT") {
                toast.error("Factura A requiere CUIT");
                return;
            }
        }

        if (name.trim().length < 3) {
            toast.error("Ingrese el nombre o razón social");
            return;
        }

        onConfirm({
            generate: true,
            salesPoint: parseInt(salesPoint) || 3,
            invoiceType: invoiceType,
            docType: docType,
            docNumber: docNumber,
            customerName: name,
            customerAddress: address
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden shadow-2xl">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-blue-900/20 to-zinc-900/50 p-6 border-b border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-medium tracking-tight">
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            Datos de Facturación
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Configure los detalles para el comprobante electrónico.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Banner */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                        <span className="text-sm font-medium text-zinc-400">Monto Total a Facturar</span>
                        <span className="text-2xl font-bold font-mono text-green-400">
                            ${totalAmount.toLocaleString()}
                        </span>
                    </div>

                    <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-zinc-900 p-1">
                            <TabsTrigger value="final" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">
                                Consumidor Final
                            </TabsTrigger>
                            <TabsTrigger value="detail" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400">
                                Con Datos / Factura A
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6 space-y-5">
                            {/* SHARED: Sales Point (HIDDEN FROM USER, but keeping in state) */}
                            {/* User requested not to see Sales Point. We hardcode or respect default without showing input. */}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 opacity-50 pointer-events-none hidden">
                                    {/* HIDDEN, default 3 */}
                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Punto de Venta</Label>
                                    <Input value={salesPoint} readOnly />
                                </div>
                                {mode === "detail" && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 col-span-2">

                                        {/* Type Selection - Manual Override */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => { setInvoiceType("B"); /* Keep current docType or let user decide */ }}
                                                className={cn(
                                                    "cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all",
                                                    invoiceType === "B"
                                                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:border-zinc-700"
                                                )}
                                            >
                                                <User className="w-5 h-5" />
                                                <span className="font-medium text-sm">Factura B</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setInvoiceType("A"); setDocType("CUIT"); }}
                                                className={cn(
                                                    "cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all",
                                                    invoiceType === "A"
                                                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:border-zinc-700"
                                                )}
                                            >
                                                <Building2 className="w-5 h-5" />
                                                <span className="font-medium text-sm">Factura A</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {mode === "detail" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    {/* Type Selection - Use buttons for manual override, but auto-select works too */}
                                    {/* Document */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                                                {docType} / CUIT
                                            </Label>
                                            {docType === "CUIT" && (
                                                <span className="text-[10px] text-blue-400 flex items-center">
                                                    <Loader2 className={cn("w-3 h-3 mr-1", isLoadingCuit ? "animate-spin" : "hidden")} />
                                                    Presione ENTER para buscar
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    value={docNumber}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDocNumber(val);
                                                        // Auto-switch to CUIT if typing long number (greater than 8 digits usually implies CUIT)
                                                        if (val.length > 8) {
                                                            if (docType !== "CUIT") setDocType("CUIT");
                                                        } else {
                                                            // Optional: If short, maybe DNI? But user might be typing slowly. 
                                                            // Let's stick to auto-switching TO Cuit, but not away from it so easily unless explicit.
                                                        }
                                                    }}
                                                    onKeyDown={handleCuitKeyDown}
                                                    className="pl-9 bg-zinc-900 border-zinc-700 focus-visible:ring-blue-500/50 font-mono tracking-wide"
                                                    placeholder={invoiceType === "A" ? "Ingrese CUIT" : "DNI o CUIT"}
                                                    disabled={isLoadingCuit}
                                                />
                                            </div>
                                            {docType === "CUIT" && (
                                                <Button
                                                    type="button"
                                                    onClick={(e) => {
                                                        // Manually trigger Enter logic
                                                        const event = { key: "Enter", preventDefault: () => { } } as any;
                                                        handleCuitKeyDown(event);
                                                    }}
                                                    disabled={isLoadingCuit || docNumber.length !== 11}
                                                    className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                                                >
                                                    {isLoadingCuit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Nombre / Razón Social</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-9 bg-zinc-900 border-zinc-700 focus-visible:ring-blue-500/50"
                                                placeholder={isLoadingCuit ? "Buscando..." : "Nombre o Razón Social"}
                                                readOnly={isLoadingCuit}
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Dirección (Opcional)</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                            <Input
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="pl-9 bg-zinc-900 border-zinc-700 focus-visible:ring-blue-500/50"
                                                placeholder="Dirección fiscal"
                                                readOnly={isLoadingCuit}
                                            />
                                        </div>
                                    </div>

                                    {/* Manual Type Override (Small UI) */}
                                    <div className="pt-2 flex gap-2">
                                        <span className="text-xs text-zinc-600 self-center">Forzar Tipo:</span>
                                        <Button
                                            size="sm"
                                            variant={invoiceType === "A" ? "secondary" : "ghost"}
                                            className="h-6 text-xs"
                                            onClick={() => setInvoiceType("A")}
                                        >A</Button>
                                        <Button
                                            size="sm"
                                            variant={invoiceType === "B" ? "secondary" : "ghost"}
                                            className="h-6 text-xs"
                                            onClick={() => setInvoiceType("B")}
                                        >B</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-zinc-800 text-zinc-400 hover:text-white">Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={isLoadingCuit} className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 shadow-lg shadow-blue-900/20">
                        {isLoadingCuit ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "final" ? "Facturar a Cons. Final" : "Confirmar Factura")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
