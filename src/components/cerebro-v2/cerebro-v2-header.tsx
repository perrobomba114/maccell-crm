"use client";

import { Activity, History, Plus } from "lucide-react";

type HeaderProps = {
    brand: string;
    model: string;
    health: "loading" | "healthy" | "degraded";
    onDeviceChange: (brand: string, model: string) => void;
    onHistory: () => void;
    onNewChat: () => void;
};

const BRANDS = ["SAMSUNG", "APPLE", "MOTOROLA", "XIAOMI", "HUAWEI"];

export function CerebroV2Header(props: HeaderProps) {
    const healthLabel = props.health === "healthy" ? "RAG operativo" : props.health === "degraded" ? "Servicio degradado" : "Verificando";
    return (
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 bg-[#111820] px-3 py-3 md:px-5">
            <button type="button" onClick={props.onHistory} className="flex h-10 items-center gap-2 rounded-md border border-slate-600/60 bg-slate-900/60 px-3 text-sm text-slate-200 hover:border-cyan-500/50">
                <History size={16} /><span className="hidden sm:inline">Chats</span>
            </button>
            <div className="flex min-w-[260px] flex-1 items-center overflow-hidden rounded-md border border-slate-600/60 bg-[#0b1117] focus-within:border-cyan-500/70">
                <select value={props.brand} onChange={(event) => props.onDeviceChange(event.target.value, props.model)} className="h-10 border-r border-slate-700 bg-transparent px-3 font-mono text-xs font-bold tracking-wide text-cyan-200 outline-none">
                    {BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
                <input value={props.model} onChange={(event) => props.onDeviceChange(props.brand, event.target.value)} placeholder="Modelo exacto: SM-A405FN" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600" />
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${props.health === "healthy" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>
                <Activity size={12} />{healthLabel}
            </div>
            <button type="button" onClick={props.onNewChat} disabled={!props.model.trim()} className="flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-35">
                <Plus size={16} />Nuevo chat
            </button>
        </header>
    );
}
