import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileText } from "lucide-react";
import type { InvoiceBranchOption } from "@/types/invoice-form";

interface InvoiceConfigSectionProps {
    billingEntity: "MACCELL" | "8BIT";
    invoiceType: "A" | "B";
    concept: 1 | 2 | 3;
    serviceDateFrom: string;
    serviceDateTo: string;
    paymentDueDate: string;
    branchId: string;
    branches: InvoiceBranchOption[];
    branchesByEntity: Record<"MACCELL" | "8BIT", InvoiceBranchOption[]>;
    setBillingEntity: (val: "MACCELL" | "8BIT") => void;
    setInvoiceType: (val: "A" | "B") => void;
    setConcept: (val: 1 | 2 | 3) => void;
    setServiceDateFrom: (val: string) => void;
    setServiceDateTo: (val: string) => void;
    setPaymentDueDate: (val: string) => void;
    setBranchId: (val: string) => void;
}

export function InvoiceConfigSection({
    billingEntity, invoiceType, concept, serviceDateFrom, serviceDateTo, paymentDueDate,
    branchId, branches, branchesByEntity, setBillingEntity, setInvoiceType, setConcept,
    setServiceDateFrom, setServiceDateTo, setPaymentDueDate, setBranchId
}: InvoiceConfigSectionProps) {
    return (
        <div className="lg:col-span-5 space-y-6 flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                <FileText className="w-4 h-4" /> Configuración
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
                <div className="space-y-3">
                    <Label className="text-zinc-400 font-medium">Local / punto operativo</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700 h-11">
                            <SelectValue placeholder="Seleccionar local" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            {(branchesByEntity[billingEntity].length > 0 ? branchesByEntity[billingEntity] : branches).map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-zinc-400 font-medium">Facturar como</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setBillingEntity("MACCELL")}
                            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${billingEntity === "MACCELL" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                        >
                            <Building2 className="w-5 h-5 mb-1" />
                            <span className="text-sm font-bold">Maccell</span>
                        </button>
                        <button
                            onClick={() => setBillingEntity("8BIT")}
                            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${billingEntity === "8BIT" ? "bg-purple-600/20 border-purple-500 text-purple-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                        >
                            <Building2 className="w-5 h-5 mb-1" />
                            <span className="text-sm font-bold">8 Bit</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-zinc-400 font-medium">Tipo de Comprobante</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setInvoiceType("A")} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${invoiceType === "A" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                            <span className="text-2xl font-bold">A</span>
                            <span className="text-xs font-medium">Resp. Inscripto</span>
                        </button>
                        <button onClick={() => setInvoiceType("B")} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${invoiceType === "B" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                            <span className="text-2xl font-bold">B</span>
                            <span className="text-xs font-medium center text-center">Final / Mono / Exento</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-zinc-400 font-medium">Concepto</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setConcept(1)} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${concept === 1 ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                            <span className="text-lg font-bold">Productos</span>
                        </button>
                        <button onClick={() => setConcept(2)} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${concept === 2 ? "bg-amber-600/20 border-amber-500 text-amber-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                            <span className="text-lg font-bold">Servicios</span>
                        </button>
                    </div>
                </div>

                {concept === 2 && (
                    <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 animate-in slide-in-from-top-2 fade-in">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-zinc-500">Inicio Servicio</Label>
                                <Input type="date" value={serviceDateFrom} onChange={e => setServiceDateFrom(e.target.value)} className="bg-zinc-950 border-zinc-700 h-9" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-zinc-500">Fin Servicio</Label>
                                <Input type="date" value={serviceDateTo} onChange={e => setServiceDateTo(e.target.value)} className="bg-zinc-950 border-zinc-700 h-9" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-zinc-500">Vencim. Pago</Label>
                            <Input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} className="bg-zinc-950 border-zinc-700 h-9" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
