import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface InvoiceCustomerSectionProps {
    docNumber: string;
    docType: string;
    customerName: string;
    customerAddress: string;
    ivaCondition: string;
    isSearching: boolean;
    setDocNumber: (val: string) => void;
    setCustomerName: (val: string) => void;
    setCustomerAddress: (val: string) => void;
    handleSearchCuit: () => void;
}

export function InvoiceCustomerSection({
    docNumber, docType, customerName, customerAddress, ivaCondition, isSearching,
    setDocNumber, setCustomerName, setCustomerAddress, handleSearchCuit
}: InvoiceCustomerSectionProps) {
    return (
        <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                <Search className="w-4 h-4" /> Datos del Cliente
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 space-y-2">
                        <Label className="text-zinc-400 font-medium">Número / Identificación</Label>
                        <div className="flex gap-2">
                            <Input
                                value={docNumber}
                                onChange={e => setDocNumber(e.target.value)}
                                placeholder={docType === "CUIT" ? "Ingrese CUIT (11 dígitos)" : "Ingrese DNI, CUIT o 0 para Final"}
                                className="bg-zinc-950 border-zinc-700 h-11 font-mono text-lg tracking-wide"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (docType === "CUIT" || docNumber.length === 11) {
                                            handleSearchCuit();
                                        }
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-11 w-11 shrink-0 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                                onClick={handleSearchCuit}
                                disabled={isSearching || (docNumber.length !== 11 && docType !== 'CUIT')}
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
    );
}
