"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { searchSparePartsAction } from "@/lib/actions/repairs";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/ui/barcode-scanner";
import { toast } from "sonner";
import { Barcode } from "lucide-react";

export interface SparePartItem {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
}

interface SparePartSelectorProps {
    selectedParts: SparePartItem[];
    onPartsChange: (parts: SparePartItem[]) => void;
    maxParts?: number;
    hidePrice?: boolean;
}

export function SparePartSelector({ selectedParts, onPartsChange, maxParts = 3, hidePrice = false }: SparePartSelectorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [showScanner, setShowScanner] = useState(false);

    const handleSearch = async (term: string) => {
        if (term.length < 2) return;
        setLoading(true);
        try {
            const data = await searchSparePartsAction(term);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (part: any) => {
        if (selectedParts.length >= maxParts) return;
        if (selectedParts.some(p => p.id === part.id)) return;

        onPartsChange([...selectedParts, {
            id: part.id,
            name: part.name,
            sku: part.sku,
            price: part.price,
            stock: part.stock
        }]);
        setOpen(false);
    };

    const handleRemove = (id: string) => {
        onPartsChange(selectedParts.filter(p => p.id !== id));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Repuestos ({selectedParts.length}/{maxParts})</Label>
                {selectedParts.length > 0 && <span className="text-xs text-muted-foreground">{selectedParts.length} seleccionados</span>}
            </div>

            <div className="flex gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="flex-1 justify-between h-10 border-input bg-background"
                            disabled={selectedParts.length >= maxParts}
                        >
                            {selectedParts.length >= maxParts ? "Máximo alcanzado" : "Buscar repuesto..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[500px] p-0" align="start">
                        <Command shouldFilter={false}>
                            <Label htmlFor="spare-part-search" className="sr-only">Buscar repuesto</Label>
                            <CommandInput
                                id="spare-part-search"
                                name="spare-part-search"
                                aria-label="Buscar por nombre o SKU"
                                placeholder="Buscar por nombre o SKU..."
                                onValueChange={handleSearch}
                            />
                            <CommandList>
                                <CommandGroup>
                                    {loading && <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Buscando...</div>}
                                    {!loading && results.length === 0 && <CommandEmpty>No se encontraron repuestos.</CommandEmpty>}
                                    {results.map((part) => (
                                        <CommandItem
                                            key={part.id}
                                            value={part.id}
                                            onSelect={() => handleSelect(part)}
                                            className={cn(selectedParts.some(p => p.id === part.id) && "opacity-50")}
                                        >
                                            <div className="flex flex-col w-full gap-1">
                                                <div className="flex justify-between font-medium items-center">
                                                    <span>{part.name}</span>
                                                    {!hidePrice && <span className="text-green-600 font-bold">${part.price.toLocaleString()}</span>}
                                                </div>
                                                <div className="flex justify-between text-xs items-center">
                                                    <span className="font-mono text-muted-foreground">{part.sku}</span>
                                                    <span className={cn(
                                                        "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                                                        part.stock > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                    )}>
                                                        {part.stock > 0 ? "Disponible" : "Sin Stock"}
                                                    </span>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowScanner(true)}
                    title="Escanear código de barras"
                >
                    <Barcode className="h-5 w-5" />
                </Button>
            </div>

            <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Escanear repuesto</DialogTitle>
                    <BarcodeScanner
                        onResult={async (code) => {
                            setShowScanner(false);
                            setLoading(true);
                            toast.loading(`Buscando: ${code}`, { id: "scan-search" });

                            try {
                                const data = await searchSparePartsAction(code);
                                setResults(data);
                                toast.dismiss("scan-search");

                                if (data.length === 0) {
                                    toast.error(`No se encontró repuesto con código: ${code}`);
                                    setOpen(true);
                                } else if (data.length === 1) {
                                    handleSelect(data[0]);
                                    toast.success(`Agregado: ${data[0].name}`);
                                } else {
                                    const exactMatch = data.find((p: any) => p.sku === code || p.sku?.endsWith(code));
                                    if (exactMatch) {
                                        handleSelect(exactMatch);
                                        toast.success(`Agregado: ${exactMatch.name}`);
                                    } else {
                                        setOpen(true);
                                        toast.info("Múltiples coincidencias, seleccione una.");
                                    }
                                }
                            } catch (error) {
                                console.error(error);
                                toast.error("Error al buscar el repuesto");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        onClose={() => setShowScanner(false)}
                    />
                </DialogContent>
            </Dialog>

            <div className="space-y-2">
                {selectedParts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-secondary">
                        <div className="flex-1 min-w-0 mr-2">
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{part.name}</p>
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                                    (part.stock && part.stock > 0) ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    {(part.stock && part.stock > 0) ? "Disp." : "Sin Stock"}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {part.sku}
                                {!hidePrice && <> • <span className="text-green-600 font-semibold">${part.price.toLocaleString()}</span></>}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(part.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
