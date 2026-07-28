"use client";

import { ArrowLeft, CheckCheck, MessageCirclePlus, Reply } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import type { RepairChatMessage } from "./repair-chat-types";
import { RepairChatComposer } from "./repair-chat-composer";
import { TIMEZONE } from "@/lib/date-utils";

type Reader = { lastReadAt: string; user: { id: string; name: string } };

export function RepairChatThread() {
    const chat = useRepairChat();
    const [reply, setReply] = useState<RepairChatMessage | null>(null);
    const [readers, setReaders] = useState<{ messageId: string; items: Reader[] } | null>(null);
    if (!chat.selected) return null;
    const showReaders = async (messageId: string) => {
        const response = await fetch(`/api/repair-chats/${chat.selected?.id}/messages/${messageId}/readers`, { cache: "no-store" });
        if (response.ok) setReaders({ messageId, items: (await response.json()).readers });
    };
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b px-3 py-2">
                <button type="button" aria-label="Volver a chats" onClick={chat.backToInbox} className="rounded-lg p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
                <div className="min-w-0 flex-1"><strong className="block truncate">#{chat.selected.ticketNumber} · {chat.selected.deviceBrand} {chat.selected.deviceModel}</strong><small className="text-muted-foreground">{chat.selected.status.name}{chat.selected.assignedTo ? ` · ${chat.selected.assignedTo.name}` : ""}</small></div>
                <button type="button" onClick={() => chat.setNewChatOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950"><MessageCirclePlus className="h-4 w-4" /><span className="hidden sm:inline">Nuevo chat</span></button>
            </div>
            {readers ? <div role="dialog" aria-label="Quién lo leyó" className="border-b bg-sky-50 px-4 py-3 text-sm text-slate-900 dark:bg-sky-950 dark:text-slate-100"><div className="flex items-center justify-between"><strong>Quién lo leyó</strong><button type="button" onClick={() => setReaders(null)} aria-label="Cerrar lectores"><span aria-hidden>×</span></button></div>{readers.items.length ? <ul className="mt-2 space-y-1">{readers.items.map((reader) => <li key={reader.user.id}>{reader.user.name} · {new Date(reader.lastReadAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}</li>)}</ul> : <p className="mt-2 text-muted-foreground">Todavía nadie más lo leyó.</p>}</div> : null}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-100/50 p-3 dark:bg-slate-950/40">
                {chat.messageCursor ? <button type="button" onClick={() => void chat.loadOlderMessages()} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950">Cargar mensajes anteriores</button> : null}
                {chat.loading ? <p className="text-center text-sm text-muted-foreground">Cargando…</p> : null}
                {chat.messages.map((message) => (
                    <article key={message.id} className="group max-w-[88%] rounded-2xl border bg-background p-3 shadow-sm">
                        <p className="mb-1 text-xs font-bold text-sky-600">{message.sender.name} · {message.sender.role}</p>
                        {message.replyTo ? <div className="mb-2 rounded-lg border-l-4 border-sky-500 bg-muted px-2 py-1 text-xs">{message.replyTo.sender.name}: {message.replyTo.content}</div> : null}
                        {message.content ? <p className="whitespace-pre-wrap text-sm">{message.content}</p> : null}
                        {message.imageUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><Image src={url} alt="Imagen del chat" width={480} height={320} unoptimized className="mt-2 max-h-56 w-auto rounded-xl object-cover" /></a>)}
                        <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-muted-foreground"><button type="button" onClick={() => setReply(message)} className="flex items-center gap-1 opacity-0 group-hover:opacity-100"><Reply className="h-3 w-3" />Responder</button><span>{new Date(message.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}</span><button type="button" disabled={!message.readBySomeone} onClick={() => void showReaders(message.id)} title={message.readBySomeone ? "Leído: ver quién lo leyó" : "Enviado"} aria-label={message.readBySomeone ? "Leído: ver quién lo leyó" : "Enviado"}><CheckCheck className={`h-4 w-4 ${message.readBySomeone ? "text-sky-500" : "text-muted-foreground"}`} /></button></div>
                    </article>
                ))}
            </div>
            {chat.readOnly ? <div className="border-t bg-muted p-3 text-center text-sm text-muted-foreground">Chat archivado en modo solo lectura.</div> : <RepairChatComposer reply={reply} onCancelReply={() => setReply(null)} />}
        </div>
    );
}
