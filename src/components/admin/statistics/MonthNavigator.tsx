"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const MONTHS = [
    { label: "Enero", short: "Ene", index: 0 },
    { label: "Febrero", short: "Feb", index: 1 },
    { label: "Marzo", short: "Mar", index: 2 },
    { label: "Abril", short: "Abr", index: 3 },
    { label: "Mayo", short: "May", index: 4 },
    { label: "Junio", short: "Jun", index: 5 },
    { label: "Julio", short: "Jul", index: 6 },
    { label: "Agosto", short: "Ago", index: 7 },
    { label: "Septiembre", short: "Sep", index: 8 },
    { label: "Octubre", short: "Oct", index: 9 },
    { label: "Noviembre", short: "Nov", index: 10 },
    { label: "Diciembre", short: "Dic", index: 11 },
];

export function MonthNavigator() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);

    // Get current selected date from URL or default to today
    const currentMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth();
    const currentYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    const [pickerYear, setPickerYear] = useState<number>(currentYear);

    // Sync pickerYear when URL year changes or popover opens
    useEffect(() => {
        if (open) {
            setPickerYear(currentYear);
        }
    }, [open, currentYear]);

    const date = new Date(currentYear, currentMonth, 1);

    const createQueryString = useCallback(
        (newMonth: number, newYear: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("month", newMonth.toString());
            params.set("year", newYear.toString());
            return params.toString();
        },
        [searchParams]
    );

    const handlePrevMonth = () => {
        const newDate = subMonths(date, 1);
        router.push(`?${createQueryString(newDate.getMonth(), newDate.getFullYear())}`);
    };

    const handleNextMonth = () => {
        const newDate = addMonths(date, 1);
        router.push(`?${createQueryString(newDate.getMonth(), newDate.getFullYear())}`);
    };

    const handleSelectMonth = (monthIndex: number) => {
        router.push(`?${createQueryString(monthIndex, pickerYear)}`);
        setOpen(false);
    };

    const handleResetToCurrentMonth = () => {
        const today = new Date();
        router.push(`?${createQueryString(today.getMonth(), today.getFullYear())}`);
        setOpen(false);
    };

    return (
        <div className="inline-flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                title="Mes anterior"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all group"
                        title="Hacer clic para elegir otro mes o año"
                    >
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-bold capitalize text-slate-200 group-hover:text-white transition-colors">
                            {format(date, "MMMM yyyy", { locale: es })}
                        </span>
                    </button>
                </PopoverTrigger>

                <PopoverContent 
                    align="center" 
                    className="w-80 p-4 bg-slate-950 border-slate-800 shadow-2xl rounded-2xl text-slate-200 z-[100]"
                >
                    {/* Year Selector */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
                            onClick={() => setPickerYear((prev) => prev - 1)}
                            title="Año anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="font-mono text-base font-black tracking-wider text-white">
                            {pickerYear}
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
                            onClick={() => setPickerYear((prev) => prev + 1)}
                            title="Año siguiente"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Months Grid (3 columns x 4 rows) */}
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map((m) => {
                            const isSelected = pickerYear === currentYear && m.index === currentMonth;
                            const isCurrentActualMonth = 
                                pickerYear === new Date().getFullYear() && 
                                m.index === new Date().getMonth();

                            return (
                                <button
                                    key={m.index}
                                    type="button"
                                    onClick={() => handleSelectMonth(m.index)}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all",
                                        isSelected
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-black"
                                            : isCurrentActualMonth
                                            ? "bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-850"
                                            : "bg-slate-900/60 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800/60"
                                    )}
                                >
                                    <span>{m.label}</span>
                                    {isCurrentActualMonth && !isSelected && (
                                        <span className="text-[9px] text-emerald-400 font-mono">Actual</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer / Quick Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={handleResetToCurrentMonth}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Ir al mes actual</span>
                        </button>

                        <span className="text-[10px] font-mono text-slate-500">
                            {format(date, "MMM yyyy", { locale: es })}
                        </span>
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                title="Mes siguiente"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}

