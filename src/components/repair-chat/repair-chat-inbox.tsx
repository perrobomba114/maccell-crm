"use client";

import { Archive, MessageCirclePlus } from "lucide-react";
import { useRepairChat } from "./repair-chat-provider";
import { RepairChatThread } from "./repair-chat-thread";

export function RepairChatInbox() {
    const chat = useRepairChat();
    if (chat.selected) return <RepairChatThread />;
    const changeScope = (scope: "active" | "archived") => {
        chat.setScope(scope);
    };
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-w-0 border-b p-3">
                <div className="grid min-w-0 grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                    <button type="button" onClick={() => changeScope("active")} className={`min-w-0 truncate rounded-lg px-3 py-2 text-sm font-semibold ${chat.scope === "active" ? "bg-background shadow" : "text-muted-foreground"}`}>Activos</button>
                    <button type="button" onClick={() => changeScope("archived")} className={`flex min-w-0 items-center justify-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold ${chat.scope === "archived" ? "bg-background shadow" : "text-muted-foreground"}`}><Archive className="h-4 w-4 shrink-0" /><span className="truncate">Archivados</span></button>
                </div>
                <button type="button" onClick={() => chat.setNewChatOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-500"><MessageCirclePlus className="h-4 w-4" />Nuevo chat</button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
                {chat.chats.map((item) => (
                    <button key={item.repair.id} type="button" onClick={() => void chat.selectRepair(item.repair)} className="mb-2 flex w-full min-w-0 gap-3 overflow-hidden rounded-xl border p-3 text-left hover:bg-muted/50">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.unread ? "bg-sky-500" : "bg-muted"}`} />
                        <span className="min-w-0 flex-1 overflow-hidden"><span className="flex min-w-0 items-baseline justify-between gap-2"><strong className="min-w-0 truncate">#{item.repair.ticketNumber}</strong><small className="max-w-[45%] shrink-0 truncate text-right">{item.repair.status.name}</small></span><span className="block w-full truncate text-sm text-muted-foreground">{item.messages?.[0]?.content || (item.messages?.[0]?.imageUrls.length ? "Imagen" : "Sin mensajes")}</span></span>
                    </button>
                ))}
                {chat.chats.length === 0 ? <div className="p-8 text-center"><p className="text-sm text-muted-foreground">Todavía no hay conversaciones.</p><button type="button" onClick={() => chat.setNewChatOpen(true)} className="mt-4 rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-bold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950">Iniciar el primer chat</button></div> : null}
                {chat.nextCursor ? <button type="button" onClick={() => void chat.loadMore()} className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted">Cargar más chats</button> : null}
            </div>
        </div>
    );
}
