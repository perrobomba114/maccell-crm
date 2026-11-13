"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Store } from "lucide-react";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const field = "block h-11 w-full min-w-0 rounded-lg border border-zinc-600 bg-zinc-900 px-2 text-base text-white focus-visible:outline-2 focus-visible:outline-sky-400";
const arrow = "grid size-11 shrink-0 place-items-center text-zinc-200 hover:bg-zinc-700 disabled:opacity-50";

interface Props {
    dashboard?: boolean;
    month: number;
    year: number;
    branch: string;
    branches: { id: string; name: string }[];
    currentYear: number;
}

export function ReportFilters({ dashboard, month, year, branch, branches, currentYear }: Props) {
    const [selection, setSelection] = useState({ month, year, branch });
    const reportQuery = new URLSearchParams({ month: String(selection.month), year: String(selection.year) });
    if (selection.branch) reportQuery.set("branchId", selection.branch);
    const [open, setOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(year);
    const [pending, start] = useTransition();
    const pathname = usePathname();
    const query = useSearchParams();
    const router = useRouter();
    const years = Array.from(new Set([year, ...Array.from({ length: 21 }, (_, i) => currentYear + 1 - i)])).sort((a, b) => b - a);
    function apply(next: { month: number; year: number; branch: string }) {
        setSelection(next);
        const params = new URLSearchParams(query.toString());
        params.set("month", String(next.month));
        params.set("year", String(next.year));
        if (next.branch) params.set("branchId", next.branch);
        else params.delete("branchId");
        start(() => router.push(`${pathname}?${params}`, { scroll: false }));
    }
    function step(delta: number) {
        const date = new Date(Date.UTC(year, month + delta, 1));
        apply({ branch, month: date.getUTCMonth(), year: date.getUTCFullYear() });
    }
    return (
        <header id="filtros" className="scroll-mt-20 mb-4 space-y-2 border-b border-zinc-800 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dashboard ? "Dashboard" : "Estadísticas"}</h1>
                <Link className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-blue-300 underline-offset-4 hover:underline"
                    href={`/admin/${dashboard ? "statistics" : "dashboard"}?${reportQuery}`}>
                    {dashboard ? "Ver estadísticas" : "Ver dashboard"} <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        <fieldset aria-label="Filtros del informe" disabled={pending} aria-busy={pending}
        className="grid min-w-0 gap-2 sm:grid-cols-[15rem_minmax(0,16rem)]">
        <div className="flex h-11 min-w-0 items-center rounded-lg border border-zinc-700 bg-zinc-900">
            <button type="button" aria-label="Mes anterior" className={arrow} onClick={() => step(-1)}><ChevronLeft size={18} /></button>
            <Popover open={open} onOpenChange={value => { setPickerYear(year); setOpen(value); }}>
                <PopoverTrigger asChild><button type="button" aria-label={`Elegir período: ${months[selection.month]} ${selection.year}`}
                    className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold">
                    <CalendarDays size={16} className="text-blue-300" />{months[selection.month]} {selection.year}
                </button></PopoverTrigger>
                <PopoverContent aria-label="Elegir período" className="border-zinc-700 bg-zinc-900 text-white">
                    <label className="flex items-center gap-3 text-sm">Año
                        <select className={field} value={pickerYear} onChange={event => setPickerYear(Number(event.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select>
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-1">{months.map((name, i) =>
                        <button key={name} type="button" aria-label={name} aria-pressed={month === i && year === pickerYear}
                            className="min-h-11 rounded-md text-sm hover:bg-zinc-700 aria-pressed:bg-blue-800"
                            onClick={() => { setOpen(false); apply({ month: i, year: pickerYear, branch }); }}>{name.slice(0, 3)}</button>)}</div>
                </PopoverContent>
            </Popover>
            <button type="button" aria-label="Mes siguiente" className={arrow} onClick={() => step(1)}><ChevronRight size={18} /></button>
        </div>
        <label className="relative min-w-0">
            <Store size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" />
            <select aria-label="Sucursal" className={field + " pl-9 text-sm"} value={selection.branch} onChange={e => apply({ month, year, branch: e.target.value })}>
                <option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
        </label>
        </fieldset>
        </header>
    );
}
