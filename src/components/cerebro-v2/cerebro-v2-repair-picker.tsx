"use client";

import { Camera, Search, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { CerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";

type RepairPickerProps = {
    open: boolean;
    repairs: readonly CerebroRepairSummary[];
    selectedId: string | null;
    onClose: () => void;
    onSelect: (repair: CerebroRepairSummary) => void;
};

export function CerebroV2RepairPicker(props: RepairPickerProps) {
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        const terms = search.trim().toUpperCase().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return props.repairs;
        return props.repairs.filter((repair) => {
            const value = `${repair.ticketNumber} ${repair.deviceBrand} ${repair.deviceModel} ${repair.problemDescription} ${repair.technicianName}`.toUpperCase();
            return terms.every((term) => value.includes(term));
        });
    }, [props.repairs, search]);

    if (!props.open) return null;
    return (
        <div className="absolute inset-0 z-40 flex items-start justify-center bg-zinc-950/85 p-3 pt-8 backdrop-blur-sm md:p-8">
            <section className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-600/70 bg-zinc-900 shadow-2xl">
                <div className="flex items-center gap-3 border-b border-zinc-700 px-5 py-4">
                    <Wrench size={18} className="text-blue-300" />
                    <div className="min-w-0 flex-1"><h2 className="font-semibold text-white">Elegir reparación activa</h2><p className="text-xs text-zinc-500">Cerebro tomará marca, modelo y falla desde esta reparación.</p></div>
                    <button type="button" onClick={props.onClose} aria-label="Cerrar" className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={18} /></button>
                </div>
                <label className="m-4 flex items-center gap-3 rounded-lg border border-zinc-600 bg-zinc-950 px-4 focus-within:border-blue-500/60">
                    <Search size={17} className="text-zinc-500" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} autoFocus placeholder="Ticket, modelo o falla…" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
                </label>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                    {filtered.map((repair) => (
                        <button key={repair.id} type="button" onClick={() => props.onSelect(repair)} className={`w-full rounded-lg border p-4 text-left transition ${repair.id === props.selectedId ? "border-blue-400/70 bg-blue-500/10" : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"}`}>
                            <div className="flex items-start gap-3">
                                <span className="min-w-0 flex-1"><span className="font-mono text-[10px] uppercase tracking-widest text-blue-300">{repair.ticketNumber} · {repair.statusName}</span><strong className="mt-1 block text-sm text-white">{repair.deviceBrand} {repair.deviceModel}</strong><span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-400">{repair.problemDescription}</span></span>
                                {repair.hasImages ? <Camera size={15} className="shrink-0 text-zinc-500" /> : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-zinc-600"><span>{repair.branchName}</span><span>{repair.technicianName}</span></div>
                        </button>
                    ))}
                    {filtered.length === 0 ? <div className="py-12 text-center text-sm text-zinc-500">No hay reparaciones asignadas que coincidan.</div> : null}
                </div>
            </section>
        </div>
    );
}
