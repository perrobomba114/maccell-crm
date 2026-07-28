"use client";

import { ArrowLeft, CheckCheck, Reply } from "lucide-react";
import { useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import type { RepairChatMessage } from "./repair-chat-types";
import { RepairChatComposer } from "./repair-chat-composer";

export function RepairChatThread() {
    const chat = useRepairChat();
    const [reply, setReply] = useState<RepairChatMessage | null>(null);
    if (!chat.selected) return null;
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b px-3 py-2">
                <button type="button" aria-label="Volver a chats" onClick={chat.backToInbox} className="rounded-lg p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
                <div className="min-w-0"><strong className="block truncate">#{chat.selected.ticketNumber} · {chat.selected.deviceBrand} {chat.selected.deviceModel}</strong><small className="text-muted-foreground">{chat.selected.status.name}{chat.selected.assignedTo ? ` · ${chat.selected.assignedTo.name}` : ""}</small></div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-100/50 p-3 dark:bg-slate-950/40">
                {chat.loading ? <p className="text-center text-sm text-muted-foreground">Cargando…</p> : null}
                {chat.messages.map((message) => (
                    <article key={message.id} className="group max-w-[88%] rounded-2xl border bg-background p-3 shadow-sm">
                        <p className="mb-1 text-xs font-bold text-sky-600">{message.sender.name} · {message.sender.role}</p>
                        {message.replyTo ? <div className="mb-2 rounded-lg border-l-4 border-sky-500 bg-muted px-2 py-1 text-xs">{message.replyTo.sender.name}: {message.replyTo.content}</div> : null}
                        {message.content ? <p className="whitespace-pre-wrap text-sm">{message.content}</p> : null}
                        {message.imageUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Imagen del chat" className="mt-2 max-h-56 rounded-xl object-cover" /></a>)}
                        <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-muted-foreground"><button type="button" onClick={() => setReply(message)} className="flex items-center gap-1 opacity-0 group-hover:opacity-100"><Reply className="h-3 w-3" />Responder</button><span>{new Date(message.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span><span title="Leído"><CheckCheck className="h-4 w-4 text-sky-500" /></span></div>
                    </article>
                ))}
            </div>
            {chat.readOnly ? <div className="border-t bg-muted p-3 text-center text-sm text-muted-foreground">Chat archivado en modo solo lectura.</div> : <RepairChatComposer reply={reply} onCancelReply={() => setReply(null)} />}
        </div>
    );
}
