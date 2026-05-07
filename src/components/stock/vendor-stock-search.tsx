"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
// Removed unused import
// import { useDebouncedCallback } from "use-debounce";
// Actually, I'll use a simple useEffect/timeout approach within the component to avoid external dep dependency if not sure.

export function VendorStockSearch() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [isPending, startTransition] = useTransition();

    const initialQuery = searchParams.get("query")?.toString();
    const [inputValue, setInputValue] = useState(initialQuery || "");

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        params.set("page", "1");

        startTransition(() => {
            replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    // Manual debounce to avoid heavy dependencies
    const debouncedSearch = useDebounce((term: string) => {
        handleSearch(term);
    }, 500);

    return (
        <div className="relative group">
            <Label htmlFor="stock-search-input" className="sr-only">Buscar en stock</Label>
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity duration-300 blur opacity-0 group-focus-within:opacity-20" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-blue-500 z-10" />
            <Input
                id="stock-search-input"
                name="stock-search"
                aria-label="Buscar por SKU, Nombre, Marca o Categoría"
                placeholder="Buscar por SKU, Nombre, Marca o Categoría..."
                onChange={(e) => {
                    setInputValue(e.target.value);
                    debouncedSearch(e.target.value);
                }}
                value={inputValue} // Controlled input, but decoupled from URL param state
                className="relative z-0 pl-11 h-14 text-lg bg-card border-2 border-border shadow-sm transition-all focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20 rounded-xl"
            />
            {isPending && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}

// Hook definition inside file for simplicity
import { useEffect, useRef } from "react";

function useDebounce<Args extends unknown[]>(callback: (...args: Args) => void, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return (...args: Args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}
