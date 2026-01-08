"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, Loader2, FileText, ShoppingCart, CircleCheck } from "lucide-react";
import { toast } from "sonner"; // Changed from use-toast
import { generateAdminInvoice, searchCuit } from "@/lib/actions/admin-invoice";

export function CreateInvoiceModal({ branches, userId }: { branches: any[], userId: string }) {
    // const { toast } = useToast(); -> Removed
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Form State
    const [branchId, setBranchId] = useState(branches[0]?.id || "");
    const [salesPoint, setSalesPoint] = useState("4"); // Default
    const [invoiceType, setInvoiceType] = useState<"A" | "B">("B");

    // Authorization Concept (1: Products, 2: Services, 3: Mixed)
    const [concept, setConcept] = useState<1 | 2 | 3>(1);

    // Dates for Services
    const today = new Date().toISOString().split('T')[0];
    const [serviceDateFrom, setServiceDateFrom] = useState(today);
    const [serviceDateTo, setServiceDateTo] = useState(today);
    const [paymentDueDate, setPaymentDueDate] = useState(today);

    // Customer
    const [docType, setDocType] = useState<"CUIT" | "DNI" | "FINAL">("FINAL");
    const [docNumber, setDocNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [ivaCondition, setIvaCondition] = useState("");

    // Items
    const [items, setItems] = useState<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        vatCondition: "21" | "10.5";
    }[]>([
        { id: "1", description: "", quantity: 1, unitPrice: 0, vatCondition: "21" }
    ]);

    // Totals
    const [totals, setTotals] = useState({ net: 0, vat: 0, total: 0 });

    // Calculate Totals Effect
    useEffect(() => {
        let net = 0;
        let vat = 0;

        items.forEach(item => {
            const totalItem = item.quantity * item.unitPrice;
            const rate = item.vatCondition === "21" ? 1.21 : 1.105;
            const itemNet = totalItem / rate;
            const itemVat = totalItem - itemNet;

            net += itemNet;
            vat += itemVat;
        });

        setTotals({
            net: Math.round(net * 100) / 100,
            vat: Math.round(vat * 100) / 100,
            total: Math.round((net + vat) * 100) / 100
        });
    }, [items]);

    const handleAddItem = () => {
        setItems([...items, {
            id: Math.random().toString(),
            description: "",
            quantity: 1,
            unitPrice: 0,
            vatCondition: "21"
        }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleUpdateItem = (id: string, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSearchCuit = async () => {
        if (!docNumber) return;
        setIsSearching(true);
        try {
            // Clean CUIT
            const cuitNum = parseInt(docNumber.replace(/\D/g, ''));
            const res = await searchCuit(cuitNum);

            if (res.success && res.data) {
                setCustomerName(res.data.name);
                setCustomerAddress(res.data.address);
                setIvaCondition(res.data.ivaCondition || "Consumidor Final");

                // Auto-select Invoice Type
                if (res.data.ivaCondition === "Responsable Inscripto") {
                    setInvoiceType("A");
                } else {
                    setInvoiceType("B");
                }

                toast.success("Cliente encontrado: " + res.data.name);
            } else {
                toast.error(res.error || "Verifique el CUIT");
            }
        } catch (error) {
            toast.error("Error al buscar CUIT");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const res = await generateAdminInvoice({
                userId,
                branchId,
                salesPoint: parseInt(salesPoint),
                invoiceType,
                concept, // 1, 2 or 3
                serviceDateFrom: concept === 1 ? undefined : serviceDateFrom,
                serviceDateTo: concept === 1 ? undefined : serviceDateTo,
                paymentDueDate: concept === 1 ? undefined : paymentDueDate,
                customer: {
                    docType,
                    docNumber,
                    name: customerName,
                    address: customerAddress,
                    ivaCondition
                },
                items: items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    vatCondition: i.vatCondition
                })),
                paymentMethod: "CASH" // Default
            });

            if (res.success) {
                toast.success("Factura Generada Correctamente");
                setOpen(false);
                // Reset form?
            } else {
                toast.error(res.error || "Error al generar factura");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800 text-white sm:rounded-xl">
                <DialogHeader className="px-8 py-6 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xl">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Plus className="w-6 h-6 text-blue-500" />
                        </div>
                        Generar Factura Electrónica
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">

                    {/* Top Row: Configuration (Hidden Sales Point) */}
                    <div className="hidden">
                        <Input value={salesPoint} onChange={e => setSalesPoint(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Left Column: Customer Data (Span 7) */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                                <Search className="w-4 h-4" /> Datos del Cliente
                            </div>

                            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-4 space-y-2">
                                        <Label className="text-zinc-400 font-medium">Tipo</Label>
                                        <Select value={docType} onValueChange={(v: any) => setDocType(v)}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-700 h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                                <SelectItem value="FINAL">Final</SelectItem>
                                                <SelectItem value="DNI">DNI</SelectItem>
                                                <SelectItem value="CUIT">CUIT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-8 space-y-2">
                                        <Label className="text-zinc-400 font-medium">Número / Identificación</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={docNumber}
                                                onChange={e => setDocNumber(e.target.value)}
                                                placeholder="Ingrese Documento"
                                                className="bg-zinc-950 border-zinc-700 h-11 font-mono text-lg tracking-wide"
                                            />
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-11 w-11 shrink-0 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                                                onClick={handleSearchCuit}
                                                disabled={isSearching || docType === 'FINAL'}
                                            >
                                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : <Search className="w-5 h-5 text-zinc-400" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 font-medium">Nombre / Razón Social</Label>
                                        <Input
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="bg-zinc-950 border-zinc-700 h-11"
                                            placeholder="Nombre del cliente"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 font-medium">Dirección</Label>
                                        <Input
                                            value={customerAddress}
                                            onChange={e => setCustomerAddress(e.target.value)}
                                            className="bg-zinc-950 border-zinc-700 h-11"
                                            placeholder="Domicilio fiscal o real"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 font-medium">Condición IVA</Label>
                                        <div className="flex items-center h-11 px-4 rounded-md border border-zinc-800 bg-zinc-950/50 text-sm text-zinc-300">
                                            {ivaCondition || "No especificado"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Invoice Details (Span 5) */}
                        <div className="lg:col-span-5 space-y-6 flex flex-col">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                                <FileText className="w-4 h-4" /> Configuración
                            </div>

                            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
                                {/* Hidden Config */}
                                <div className="hidden">
                                    <Select value={branchId} onValueChange={setBranchId}>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-700 h-11">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800">
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-zinc-400 font-medium">Tipo de Comprobante</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setInvoiceType("A")}
                                            className={`
                                                flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all
                                                ${invoiceType === "A"
                                                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"}
                                            `}
                                        >
                                            <span className="text-2xl font-bold">A</span>
                                            <span className="text-xs font-medium">Resp. Inscripto</span>
                                        </button>

                                        <button
                                            onClick={() => setInvoiceType("B")}
                                            className={`
                                                flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all
                                                ${invoiceType === "B"
                                                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"}
                                            `}
                                        >
                                            <span className="text-2xl font-bold">B</span>
                                            <span className="text-xs font-medium center text-center">Final / Mono / Exento</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-zinc-400 font-medium">Concepto</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setConcept(1)}
                                            className={`
                                                flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all
                                                ${concept === 1
                                                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"}
                                            `}
                                        >
                                            <span className="text-lg font-bold">Productos</span>
                                        </button>

                                        <button
                                            onClick={() => setConcept(2)}
                                            className={`
                                                flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all
                                                ${concept === 2
                                                    ? "bg-amber-600/20 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"}
                                            `}
                                        >
                                            <span className="text-lg font-bold">Servicios</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Service Dates (Only if Services is selected) */}
                                {concept === 2 && (
                                    <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 animate-in slide-in-from-top-2 fade-in">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-zinc-500">Inicio Servicio</Label>
                                                <Input
                                                    type="date"
                                                    value={serviceDateFrom}
                                                    onChange={e => setServiceDateFrom(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-700 h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-zinc-500">Fin Servicio</Label>
                                                <Input
                                                    type="date"
                                                    value={serviceDateTo}
                                                    onChange={e => setServiceDateTo(e.target.value)}
                                                    className="bg-zinc-950 border-zinc-700 h-9"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">Vencim. Pago</Label>
                                            <Input
                                                type="date"
                                                value={paymentDueDate}
                                                onChange={e => setPaymentDueDate(e.target.value)}
                                                className="bg-zinc-950 border-zinc-700 h-9"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Totals Summary Card */}
                            <div className="mt-auto p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-zinc-800 space-y-4 shadow-xl">
                                <div className="flex justify-between items-center text-sm text-zinc-400">
                                    <span>Subtotal Neto</span>
                                    <span className="font-mono text-zinc-200">${totals.net.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-zinc-400">
                                    <span>IVA</span>
                                    <span className="font-mono text-zinc-200">${totals.vat.toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-zinc-800/50 my-2" />
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-zinc-200 uppercase tracking-widest pb-1">Total Final</span>
                                    <span className="text-3xl font-bold text-green-400 tracking-tight leading-none">
                                        ${totals.total.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-6 pt-4">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                                <ShoppingCart className="w-4 h-4" /> Detalle de Ítems
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddItem}
                                className="h-9 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 text-zinc-300 px-4"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Agregar Nueva Línea
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {/* Header for Items Grid (visible on desktop) */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                <div className="col-span-5">Descripción</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-3">P. Unitario</div>
                                <div className="col-span-1">IVA</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Items List */}
                            {items.map((item, index) => (
                                <div key={item.id} className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all duration-200">
                                    <div className="col-span-1 md:col-span-5">
                                        <Input
                                            placeholder="Descripción del producto o servicio"
                                            value={item.description}
                                            onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                                            className="bg-transparent border-0 border-b border-zinc-800 rounded-none focus-visible:ring-0 focus-visible:border-blue-500 h-9 px-0 transition-colors placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="1"
                                                value={item.quantity}
                                                onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                className="bg-zinc-950 border-zinc-700 h-10 text-center font-mono"
                                            />
                                            <span className="absolute right-8 top-2.5 text-xs text-zinc-600 pointer-events-none md:hidden lg:inline">un</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">$</span>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={item.unitPrice}
                                                onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                                className="bg-zinc-950 border-zinc-700 h-10 pl-7 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-1">
                                        <Select value={item.vatCondition} onValueChange={v => handleUpdateItem(item.id, 'vatCondition', v)}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-700 h-10 px-2 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                                <SelectItem value="21">21%</SelectItem>
                                                <SelectItem value="10.5">10.5%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-full"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 border-t border-zinc-800 bg-zinc-950 gap-4">
                    <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-8 border-zinc-700 hover:bg-zinc-900 text-zinc-300">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || items.length === 0}
                        className="h-11 px-8 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 text-base font-medium"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CircleCheck className="w-5 h-5 mr-2" />}
                        Confirmar y Emitir Factura
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
