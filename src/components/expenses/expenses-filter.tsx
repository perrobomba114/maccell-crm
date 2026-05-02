"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, FilterX, ListFilter } from "lucide-react";
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
    let date: Date | undefined;

    if (dateParam) {
        // Parse "YYYY-MM-DD" as local time to avoid UTC shifts
        const [year, month, day] = dateParam.split('-').map(Number);
        date = new Date(year, month - 1, day);
    }

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "h-11 w-full justify-start text-left font-semibold sm:w-[250px]",
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
            {!date && (
                <Button variant="secondary" className="h-11 gap-2 font-bold" disabled>
                    <ListFilter className="h-4 w-4" />
                    Vista completa
                </Button>
            )}
            {date && (
                <Button variant="outline" className="h-11 gap-2 font-bold" onClick={clearFilter} title="Ver todos los gastos">
                    <FilterX className="h-4 w-4" />
                    Ver todos
                </Button>
            )}
        </div>
    );
}
