"use client";

import { ArrowRight, MessageCirclePlus, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useRepairChat } from "./repair-chat-provider";

export function RepairChatNewPanel() {
    const chat = useRepairChat();
    const searchRepairs = chat.search;
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    useEffect(() => {
        void searchRepairs(deferredQuery, "active");
    }, [deferredQuery, searchRepairs]);

    return (
        <aside aria-label="Nuevo chat de reparación" className="flex h-full min-h-0 flex-col bg-background sm:w-[390px]">
            <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-bold"><MessageCirclePlus className="h-4 w-4 text-sky-600" />Nuevo chat</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Elegí una reparación activa</p>
                    </div>
                    <button type="button" aria-label="Cerrar selector de reparaciones" onClick={() => chat.setNewChatOpen(false)} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <label className="mt-3 flex items-center gap-2 rounded-xl border bg-muted/30 px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por número, cliente o equipo" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-sky-600">Reparaciones disponibles</p>
                {chat.searchResults.map((repair) => (
                    <button key={repair.id} type="button" onClick={() => void chat.selectRepair(repair)} className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:border-sky-500/40 hover:bg-muted/50">
                        <span className="min-w-0"><strong className="block">#{repair.ticketNumber}</strong><small className="block truncate text-muted-foreground">{repair.deviceBrand} {repair.deviceModel}</small></span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-sky-600">{repair.chat ? "Continuar" : "Iniciar"}<ArrowRight className="h-4 w-4" /></span>
                    </button>
                ))}
                {chat.searchResults.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No encontramos reparaciones activas con ese criterio.</p> : null}
            </div>
        </aside>
    );
}
