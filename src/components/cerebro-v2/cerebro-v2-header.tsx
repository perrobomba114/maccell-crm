"use client";

import { Activity, ChevronDown, History, Plus } from "lucide-react";

import type { ChatSession } from "@/lib/cerebro-v2/chat-repository";
import type { CerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";

type HeaderProps = {
    selectedRepair: CerebroRepairSummary | null;
    activeSession: ChatSession | null;
    health: "loading" | "healthy" | "degraded";
    onChooseRepair: () => void;
    onHistory: () => void;
    onNewChat: () => void;
};

export function CerebroV2Header(props: HeaderProps) {
    const healthLabel = props.health === "healthy"
        ? "RAG operativo"
        : props.health === "degraded" ? "Servicio degradado" : "Verificando";
    const device = props.selectedRepair
        ? `${props.selectedRepair.deviceBrand} ${props.selectedRepair.deviceModel}`
        : props.activeSession ? `${props.activeSession.brand} ${props.activeSession.model}` : "Elegir reparación asignada";
    const ticket = props.selectedRepair?.ticketNumber ?? props.activeSession?.ticketNumber;

    return (
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 bg-[#111820] px-3 py-3 md:px-5">
            <button type="button" onClick={props.onHistory} className="flex h-11 items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-900/60 px-3 text-sm text-slate-200 hover:border-cyan-500/50">
                <History size={16} /><span className="hidden sm:inline">Chats</span>
            </button>
            <button type="button" onClick={props.onChooseRepair} className="flex min-w-[280px] flex-1 items-center gap-3 rounded-lg border border-slate-600/60 bg-[#0b1117] px-4 py-2 text-left hover:border-cyan-500/60">
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-cyan-300">{ticket ?? "Reparación requerida"}</span>
                    <span className="block truncate text-sm font-semibold text-slate-100">{device}</span>
                </span>
                <ChevronDown size={17} className="shrink-0 text-slate-500" />
            </button>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${props.health === "healthy" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>
                <Activity size={12} />{healthLabel}
            </div>
            <button type="button" onClick={props.onNewChat} disabled={!props.selectedRepair} className="flex h-11 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-35">
                <Plus size={16} />Nuevo chat
            </button>
        </header>
    );
}
