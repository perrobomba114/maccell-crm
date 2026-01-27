"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function MonthNavigator() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get current selected date from URL or default to today
    const currentMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth();
    const currentYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    const date = new Date(currentYear, currentMonth, 1);

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set(name, value);
            return params.toString();
        },
        [searchParams]
    );

    const handlePrevMonth = () => {
        const newDate = subMonths(date, 1);
        router.push(`?${createQueryString("month", newDate.getMonth().toString())}&year=${newDate.getFullYear()}`);
    };

    const handleNextMonth = () => {
        const newDate = addMonths(date, 1);
        router.push(`?${createQueryString("month", newDate.getMonth().toString())}&year=${newDate.getFullYear()}`);
    };

    return (
        <div className="flex items-center gap-4 bg-[#18181b] p-1.5 rounded-lg border border-zinc-800">
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm font-semibold capitalize text-zinc-200 min-w-[140px] text-center">
                {format(date, "MMMM yyyy", { locale: es })}
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
