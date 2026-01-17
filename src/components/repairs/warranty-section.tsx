"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchWarrantyRepairs } from "@/lib/actions/repairs";

interface WarrantySectionProps {
    isWarranty: boolean;
    onIsWarrantyChange: (checked: boolean) => void;
    originalRepairId: string | null;
    onOriginalRepairChange: (id: string | null) => void;
    onRepairSelected?: (repair: any) => void;
    branchId: string;
    compact?: boolean;
}

export function WarrantySection({
    isWarranty,
    onIsWarrantyChange,
    originalRepairId,
    onOriginalRepairChange,
    onRepairSelected,
    branchId,
    compact = false
}: WarrantySectionProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("");

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) return;

        setLoading(true);
        try {
            const data = await searchWarrantyRepairs(term, branchId);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="is_warranty_compact"
                        checked={isWarranty}
                        onCheckedChange={(checked) => onIsWarrantyChange(checked === true)}
                        className="h-5 w-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label htmlFor="is_warranty_compact" className="text-sm font-medium cursor-pointer">
                        Garantía
                    </Label>
                </div>

                {isWarranty && (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                size="sm"
                                className="h-8 ml-2 border-dashed border-red-300 text-red-600 hover:bg-red-50"
                            >
                                {selectedLabel ? (
                                    <span className="max-w-[150px] truncate">{selectedLabel}</span>
                                ) : (
                                    <>🔍 Buscar Original</>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Buscar ticket/cliente..."
                                    value={searchTerm}
                                    onValueChange={handleSearch}
                                />
                                <CommandList>
                                    {loading && <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
                                    {!loading && results.length === 0 && <CommandEmpty>Sin resultados recientes.</CommandEmpty>}
                                    <CommandGroup heading="Últimos 30 días">
                                        {results.map((repair) => (
                                            <CommandItem
                                                key={repair.id}
                                                value={repair.id}
                                                onSelect={() => {
                                                    onOriginalRepairChange(repair.id);
                                                    setSelectedLabel(repair.ticketNumber);
                                                    if (onRepairSelected) onRepairSelected(repair);
                                                    setOpen(false);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", originalRepairId === repair.id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${repair.isWet ? "text-blue-500 font-extrabold" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>{repair.ticketNumber}</span>
                                                    <span className="text-xs text-muted-foreground">{repair.customerName}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        );
    }

    return (
        <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            {/* Fallback for non-compact usage if any */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="is_warranty"
                    checked={isWarranty}
                    onCheckedChange={(checked) => onIsWarrantyChange(checked === true)}
                />
                <Label htmlFor="is_warranty">Es Garantía</Label>
            </div>
        </div>
    );
}
