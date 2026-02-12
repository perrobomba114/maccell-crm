"use client";

import * as React from "react";
import { format, addYears, subYears, setMonth, setYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter, useSearchParams } from "next/navigation";
import { es } from "date-fns/locale";

export function InvoiceDateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse 'date' param. 
    // If it's YYYY-MM (7 chars), it's a month filter.
    // If it's YYYY-MM-DD (10 chars), it's a day filter.
    // User requested "Month", so let's default to Month logic.
    const dateParam = searchParams.get("date");

    // Initial view year
    const [viewDate, setViewDate] = React.useState<Date>(
        dateParam ? new Date(dateParam + (dateParam.length === 7 ? "-01" : "")) : new Date()
    );

    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelectMonth = (monthIndex: number) => {
        const newDate = setMonth(viewDate, monthIndex);
        const dateStr = format(newDate, "yyyy-MM");

        const params = new URLSearchParams(searchParams.toString());
        params.set("date", dateStr);
        params.delete("view");
        params.set("page", "1");

        router.push(`?${params.toString()}`);
        setIsOpen(false);
    };

    const clearDate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const params = new URLSearchParams(searchParams.toString());
        params.delete("date");
        params.set("view", "all");
        router.push(`?${params.toString()}`);
    };

    const nextYear = () => setViewDate(addYears(viewDate, 1));
    const prevYear = () => setViewDate(subYears(viewDate, 1));

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const currentYear = viewDate.getFullYear();
    const isFiltered = !!dateParam;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white",
                        !isFiltered && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isFiltered ? (
                        <span className="capitalize">
                            {format(new Date(dateParam + (dateParam?.length === 7 ? "-02" : "T00:00:00")), "MMMM yyyy", { locale: es })}
                        </span>
                    ) : (
                        <span>Filtrar por Mes</span>
                    )}
                    {isFiltered && (
                        <div
                            className="ml-auto hover:bg-zinc-700 rounded-full p-0.5"
                            onClick={clearDate}
                        >
                            <X className="h-4 w-4 text-zinc-400" />
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 border-zinc-800 bg-zinc-950 text-white" align="start">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={prevYear} className="h-7 w-7">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-lg">{currentYear}</span>
                    <Button variant="ghost" size="icon" onClick={nextYear} className="h-7 w-7">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                        <Button
                            key={month}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectMonth(index)}
                            className={cn(
                                "text-xs h-9 w-full",
                                (dateParam?.includes(format(setMonth(setYear(new Date(), currentYear), index), "yyyy-MM")) || false)
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "hover:bg-zinc-800 text-zinc-300"
                            )}
                        >
                            {month.substring(0, 3)}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
