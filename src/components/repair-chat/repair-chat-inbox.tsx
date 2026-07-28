"use client";

import { Archive, ArrowLeft, Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import { RepairChatThread } from "./repair-chat-thread";

export function RepairChatInbox() {
    const chat = useRepairChat();
    const search = chat.search;
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);
    useEffect(() => { void search(deferredQuery); }, [search, deferredQuery]);
    if (chat.selected) return <RepairChatThread />;
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b p-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                    <button type="button" onClick={() => chat.setScope("active")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${chat.scope === "active" ? "bg-background shadow" : "text-muted-foreground"}`}>Activos</button>
                    <button type="button" onClick={() => chat.setScope("archived")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${chat.scope === "archived" ? "bg-background shadow" : "text-muted-foreground"}`}><Archive className="h-4 w-4" />Archivados</button>
                </div>
                <label className="mt-3 flex items-center gap-2 rounded-xl border bg-muted/30 px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar reparación" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {query.trim() ? chat.searchResults.map((repair) => (
                    <button key={repair.id} type="button" onClick={() => void chat.selectRepair(repair)} className="mb-2 flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-muted/50">
                        <span><strong className="block">#{repair.ticketNumber}</strong><small className="text-muted-foreground">{repair.deviceBrand} {repair.deviceModel}</small></span><ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                )) : chat.chats.map((item) => (
                    <button key={item.repair.id} type="button" onClick={() => void chat.selectRepair(item.repair)} className="mb-2 flex w-full gap-3 rounded-xl border p-3 text-left hover:bg-muted/50">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.unread ? "bg-sky-500" : "bg-muted"}`} />
                        <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong>#{item.repair.ticketNumber}</strong><small>{item.repair.status.name}</small></span><span className="block truncate text-sm text-muted-foreground">{item.messages?.[0]?.content || (item.messages?.[0]?.imageUrls.length ? "Imagen" : "Sin mensajes")}</span></span>
                    </button>
                ))}
                {!query.trim() && chat.chats.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay chats en esta bandeja. Buscá una reparación para iniciar uno.</p> : null}
            </div>
        </div>
    );
}
