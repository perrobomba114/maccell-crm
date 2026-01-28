"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
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
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por SKU, Nombre, Marca o Categoría..."
                onChange={(e) => {
                    setInputValue(e.target.value);
                    debouncedSearch(e.target.value);
                }}
                value={inputValue} // Controlled input, but decoupled from URL param state
                className="pl-9 h-12 text-lg"
            />
            {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}

// Hook definition inside file for simplicity
import { useEffect, useRef } from "react";

function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return (...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}
