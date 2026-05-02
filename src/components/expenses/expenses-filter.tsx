"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Calendar as CalendarIcon, FilterX, ListFilter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useTransition } from "react";

type ExpenseBranchOption = {
    id: string;
    name: string;
    code?: string | null;
};

type ExpensesFilterProps = {
    branches?: ExpenseBranchOption[];
    currentBranchId?: string;
};

export function ExpensesFilter({ branches = [], currentBranchId }: ExpensesFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

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
            params.set("date", format(selectedDate, "yyyy-MM-dd"));
            params.delete("view");
            params.set("page", "1");
        } else {
            params.delete("date");
            params.set("view", "all"); // Explicitly view all to avoid default redirect
            params.set("page", "1");
        }
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
        setOpen(false);
    };

    const handleBranchChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === "all") {
            params.delete("branchId");
        } else {
            params.set("branchId", value);
        }
        params.set("page", "1");
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const clearFilter = () => {
        handleSelect(undefined);
    };

    return (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "h-11 w-full justify-start text-left font-semibold sm:w-[250px]",
                            !date && "text-muted-foreground"
                        )}
                        disabled={isPending}
                    >
                        <CalendarIcon data-icon="inline-start" />
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

            {branches.length > 0 && (
                <Select
                    value={currentBranchId || "all"}
                    onValueChange={handleBranchChange}
                    disabled={isPending}
                >
                    <SelectTrigger className="h-11 w-full font-semibold sm:w-[240px]">
                        <Building2 data-icon="inline-start" />
                        <SelectValue placeholder="Todas las sucursales" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectGroup>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            )}

            {!date && (
                <Button variant="secondary" className="h-11 gap-2 font-bold" disabled>
                    <ListFilter data-icon="inline-start" />
                    Vista completa
                </Button>
            )}
            {date && (
                <Button variant="outline" className="h-11 gap-2 font-bold" onClick={clearFilter} title="Ver todos los gastos" disabled={isPending}>
                    <FilterX data-icon="inline-start" />
                    Ver todos
                </Button>
            )}
            {isPending && (
                <div className="flex h-11 items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
                    <Loader2 className="animate-spin" />
                </div>
            )}
        </div>
    );
}
