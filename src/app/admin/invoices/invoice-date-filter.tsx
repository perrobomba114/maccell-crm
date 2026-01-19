"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
    const dateParam = searchParams.get("date");
    const [date, setDate] = React.useState<Date | undefined>(
        dateParam ? new Date(dateParam) : undefined
    );

    const handleSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        const params = new URLSearchParams(searchParams.toString());
        if (newDate) {
            params.set("date", format(newDate, "yyyy-MM-dd"));
        } else {
            params.delete("date");
        }
        params.set("page", "1"); // Reset pagination
        router.push(`?${params.toString()}`);
    };

    const clearDate = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSelect(undefined);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Filtrar por fecha</span>}
                    {date && (
                        <div
                            className="ml-auto hover:bg-zinc-700 rounded-full p-0.5"
                            onClick={clearDate}
                        >
                            <X className="h-4 w-4 text-zinc-400" />
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-zinc-800 bg-zinc-900 text-white" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    initialFocus
                    locale={es}
                    className="bg-zinc-900 text-white"
                />
            </PopoverContent>
        </Popover>
    );
}
