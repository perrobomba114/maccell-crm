"use client";

import { MessageSquareText, Trash2, X } from "lucide-react";

import type { ChatSession } from "@/lib/cerebro-v2/chat-repository";

type HistoryProps = {
    open: boolean;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onClose: () => void;
    onSelect: (session: ChatSession) => void;
    onDelete: (sessionId: string) => void;
};

export function CerebroV2History(props: HistoryProps) {
    return (
        <aside className={`${props.open ? "w-[290px] translate-x-0" : "w-0 -translate-x-full"} absolute inset-y-0 left-0 z-40 flex overflow-hidden border-r border-slate-700 bg-[#111820] shadow-2xl transition-[width,transform] duration-200 md:relative md:z-0 md:shadow-none`}>
            <div className="flex w-[290px] shrink-0 flex-col">
                <div className="flex h-14 items-center justify-between border-b border-slate-700/70 px-4">
                    <div><p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-300">Chats V2</p><p className="text-[11px] text-slate-500">Sin historial heredado</p></div>
                    <button type="button" onClick={props.onClose} className="rounded p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X size={16} /></button>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                    {props.sessions.length === 0 ? (
                        <div className="px-5 py-16 text-center"><MessageSquareText className="mx-auto mb-3 text-slate-700" /><p className="text-sm text-slate-400">Todavía no hay chats nuevos.</p></div>
                    ) : props.sessions.map((session) => (
                        <div key={session.id} className={`group flex items-start gap-2 rounded-md border p-3 ${props.activeSessionId === session.id ? "border-cyan-500/40 bg-cyan-500/10" : "border-transparent hover:border-slate-700 hover:bg-slate-800/50"}`}>
                            <button type="button" onClick={() => props.onSelect(session)} className="min-w-0 flex-1 text-left">
                                <p className="truncate text-sm font-medium text-slate-200">{session.title}</p>
                                <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{session.brand} · {session.model}</p>
                            </button>
                            <button type="button" onClick={() => props.onDelete(session.id)} aria-label="Eliminar chat" className="rounded p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
