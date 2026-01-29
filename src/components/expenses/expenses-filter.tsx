"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export function ExpensesFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Default to today if no date params
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : undefined;

    const [open, setOpen] = useState(false);

    const handleSelect = (selectedDate: Date | undefined) => {
        const params = new URLSearchParams(searchParams);
        if (selectedDate) {
            params.set("date", selectedDate.toISOString().split('T')[0]); // Use simple date format
            params.delete("view");
            params.set("page", "1");
        } else {
            params.delete("date");
            params.set("view", "all"); // Explicitly view all to avoid default redirect
            params.set("page", "1");
        }
        router.push(`${pathname}?${params.toString()}`);
        setOpen(false);
    };

    const clearFilter = () => {
        handleSelect(undefined);
    };

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Filtrar por fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {date && (
                <Button variant="ghost" size="icon" onClick={clearFilter} title="Limpiar filtro">
                    <FilterX className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
