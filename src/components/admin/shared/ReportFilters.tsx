"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const field = "block h-11 w-full min-w-0 rounded-lg border border-zinc-600 bg-zinc-900 px-2 text-base text-white focus-visible:outline-2 focus-visible:outline-sky-400";
const arrow = "grid size-11 shrink-0 place-items-center rounded-lg border border-zinc-600 text-white hover:bg-zinc-700 disabled:opacity-50";

interface Props {
    month: number;
    year: number;
    branch: string;
    branches: { id: string; name: string }[];
    currentYear: number;
}

export function ReportFilters({ month, year, branch, branches, currentYear }: Props) {
    const [draft, setDraft] = useState({ month, year, branch });
    const [pending, start] = useTransition();
    const pathname = usePathname();
    const query = useSearchParams();
    const router = useRouter();
    const dirty = draft.month !== month || draft.year !== year || draft.branch !== branch;
    const years = Array.from(new Set([year, draft.year, ...Array.from({ length: 21 }, (_, i) => currentYear + 1 - i)])).sort((a, b) => b - a);
    function apply(next: typeof draft) {
        const params = new URLSearchParams(query.toString());
        params.set("month", String(next.month));
        params.set("year", String(next.year));
        if (next.branch) params.set("branchId", next.branch);
        else params.delete("branchId");
        start(() => router.push(`${pathname}?${params}`, { scroll: false }));
    }
    function step(delta: number) {
        const date = new Date(Date.UTC(draft.year, draft.month + delta, 1));
        const next = { ...draft, month: date.getUTCMonth(), year: date.getUTCFullYear() };
        setDraft(next);
        apply(next);
    }
    return <form aria-label="Filtros del informe" onSubmit={event => { event.preventDefault(); if (dirty && !pending) apply(draft); }}>
        <fieldset disabled={pending} aria-busy={pending} className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-end gap-3 rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 lg:grid-cols-[minmax(12rem,1fr)_6rem_minmax(10rem,1fr)_7rem] lg:p-4">
            <div className="col-span-2 min-w-0 lg:col-span-1">
                <label htmlFor="report-month" className="mb-1 block text-sm text-zinc-300">Mes</label>
                <div className="flex gap-1">
                    <button type="button" aria-label="Mes anterior" className={arrow} onClick={() => step(-1)}><ChevronLeft size={18} /></button>
                    <select id="report-month" className={field} value={draft.month} onChange={e => setDraft({ ...draft, month: Number(e.target.value) })}>
                        {months.map((name, i) => <option key={name} value={i}>{name}</option>)}
                    </select>
                    <button type="button" aria-label="Mes siguiente" className={arrow} onClick={() => step(1)}><ChevronRight size={18} /></button>
                </div>
            </div>
            <label className="min-w-0 text-sm text-zinc-300">Año<select className={field + " mt-1"} value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })}>{years.map(y => <option key={y}>{y}</option>)}</select></label>
            <label className="min-w-0 text-sm text-zinc-300">Sucursal<select className={field + " mt-1"} value={draft.branch} onChange={e => setDraft({ ...draft, branch: e.target.value })}>
                <option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></label>
            <button disabled={!dirty || pending} className="col-span-2 h-11 rounded-lg lg:col-span-1 bg-sky-300 px-1 font-semibold text-slate-950 disabled:bg-zinc-700 disabled:text-zinc-300" type="submit">{pending ? "Cargando" : "Aplicar"}</button>
        </fieldset>
    </form>;
}
