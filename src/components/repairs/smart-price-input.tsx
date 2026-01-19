"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { searchSparePartsAction } from "@/lib/actions/repairs";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SmartPriceInputProps {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    error?: string;
}

export function SmartPriceInput({ value, onChange, error }: SmartPriceInputProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with props
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        // Handle click outside to close results
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const rawVal = val.replace(/\./g, ""); // Remove dots for analysis

        // Call parent formatter (this keeps the "numbers only" part working locally)
        // But we want to allow text too.
        // If the parent `onChange` expects formatted number, we might conflict if we send text.
        // The parent logic: `const number = value.replace(/\D/g, "");` -> removes non-digits.
        // So if user types "Samsung", parent will make it empty string!

        // Strategy: 
        // We handle the input change entirely. 
        // If it looks like a number (dots allowed), we call parent onChange.
        // If it has letters, we DO NOT call parent onChange yet, we keep local state and search.

        setInputValue(val);

        if (/^[0-9.]+$/.test(val) || val === "") {
            // It's a number (or empty), pass to parent
            onChange(e);
            setOpen(false);
        } else {
            // It has text, search!
            // Don't call parent onChange because it would sanitize the text away.
            setOpen(true);
            if (val.length >= 2) {
                setLoading(true);
                try {
                    // Debounce could be good, but for now direct call
                    const data = await searchSparePartsAction(val);
                    setResults(data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }
    };

    const handleSelectPart = (part: any) => {
        // Use pricePos
        const price = part.pricePos || 0;
        // Format with dots
        const formatted = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        // Update input
        setInputValue(formatted);
        setOpen(false);

        // Notify parent
        onChange({ target: { value: formatted } });
    };

    return (
        <div className="relative" ref={containerRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
            <Input
                id="estimated-price"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="0 o buscar repuesto..."
                className={`pl-8 text-xl font-bold h-12 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                autoComplete="off"
            />

            {open && inputValue.length >= 2 && !/^[0-9.]+$/.test(inputValue) && (
                <div className="absolute z-50 w-full bottom-full mb-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-auto animate-in fade-in-0 zoom-in-95">
                    {loading ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                            Buscando...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                            No se encontraron repuestos.
                        </div>
                    ) : (
                        <div className="py-1">
                            {results.map((part) => (
                                <button
                                    key={part.id}
                                    onClick={() => handleSelectPart(part)}
                                    className="w-full text-left px-3 py-2 hover:bg-accent/50 focus:bg-accent transition-colors flex items-center justify-between group"
                                    type="button"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{part.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground font-mono">{part.sku}</span>
                                            <span className={cn(
                                                "font-bold px-1.5 py-0.5 rounded text-[9px] uppercase shadow-sm",
                                                part.stock > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {part.stock > 0 ? "Disponible" : "Sin Stock"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-green-600 text-sm">
                                            ${(part.pricePos || 0).toLocaleString()}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1 bg-background text-muted-foreground">
                                            POS
                                        </Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
