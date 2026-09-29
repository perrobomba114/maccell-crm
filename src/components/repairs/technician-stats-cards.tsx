"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Wrench, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TechnicianPerformance } from "@/actions/repair-actions-extra";
import { TechnicianPerformanceCard } from "./technician-performance-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    MONTH_REPAIR_DATE_FILTER,
    formatAdminRepairCalendarDate,
    getTodayRepairDateFilter,
    parseAdminRepairCalendarDate,
    resolveAdminRepairDateSelection,
    shiftAdminRepairDateFilter,
} from "@/lib/admin-repairs-date-filter";

type TechnicianStatsCardsProps = {
    selectedDate?: string;
    initialData?: TechnicianPerformance[];
    statusName?: string;
};

export function TechnicianStatsCards({ selectedDate, initialData, statusName }: TechnicianStatsCardsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const rawDateFilter = searchParams.get("date") ?? selectedDate ?? null;
    const activeDateFilter = resolveAdminRepairDateSelection(rawDateFilter);
    const isMonthFilter = activeDateFilter === MONTH_REPAIR_DATE_FILTER;
    const selectedCalendarDate = parseAdminRepairCalendarDate(activeDateFilter);
    const stats = useMemo(
        () => [...(initialData ?? [])].sort((a, b) => b.seenCount - a.seenCount),
        [initialData],
    );
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const isInitialLoading = !initialData;

    const replaceParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (!updates.page) params.delete("page");

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    const handleTechClick = (tech: TechnicianPerformance) => {
        const isActive = searchParams.get("techId") === tech.id;
        replaceParams({
            techId: isActive ? null : tech.id,
            tech: isActive ? null : tech.name,
        });
    };

    const handleDateChange = (d: Date | undefined) => {
        setIsCalendarOpen(false);
        replaceParams({
            date: d ? formatAdminRepairCalendarDate(d) : getTodayRepairDateFilter(),
        });
    };

    const handleDateShift = (days: number) => {
        replaceParams({
            date: shiftAdminRepairDateFilter(activeDateFilter, days),
        });
    };

    const displayDateLabel = isMonthFilter
        ? "Este Mes"
        : selectedCalendarDate
            ? format(selectedCalendarDate, "PPP", { locale: es })
            : getTodayRepairDateFilter();

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-lg w-full sm:w-fit">
                <span className="text-sm font-medium text-muted-foreground pl-2">Filtrar rendimiento por fecha:</span>
                {!isMonthFilter && (
                    <>
                        <Button
                            variant={"outline"}
                            size="icon"
                            onClick={() => handleDateShift(-1)}
                            disabled={isPending}
                            className="h-8 w-8"
                            title="Día anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={"outline"}
                            size="icon"
                            onClick={() => handleDateShift(1)}
                            disabled={isPending}
                            className="h-8 w-8"
                            title="Día siguiente"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            size="sm"
                            disabled={isPending}
                            className={cn(
                                "w-full sm:w-[240px] justify-start text-left font-normal bg-background hover:bg-background/90",
                                !selectedCalendarDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {displayDateLabel}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedCalendarDate}
                            onSelect={handleDateChange}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                {isPending && (
                    <span className="text-xs font-semibold text-muted-foreground px-2">
                        Actualizando...
                    </span>
                )}
            </div>

            <div
                className={cn("grid gap-3 md:grid-cols-3 transition-opacity", isPending && "opacity-60")}
                aria-busy={isPending}
            >
                {isInitialLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="bg-muted/50 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    <Skeleton className="h-6 w-32" />
                                </CardTitle>
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold"><Skeleton className="h-10 w-16 mb-2" /></div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : stats.length > 0 ? (
                    stats.map((tech, index) => (
                        <TechnicianPerformanceCard
                            key={tech.id}
                            tech={tech}
                            index={index}
                            active={searchParams.get("techId") === tech.id}
                            disabled={isPending}
                            statusName={statusName}
                            onSelect={() => handleTechClick(tech)}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center text-muted-foreground py-8 text-sm bg-muted/20 rounded-xl border-2 border-dashed flex flex-col items-center gap-2">
                        <Wrench className="h-8 w-8 opacity-20" />
                        <p>No hay registro de reparaciones para esta fecha.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
