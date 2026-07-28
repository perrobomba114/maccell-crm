"use client";

import { ArrowLeft, CheckCheck, ExternalLink, MessageCirclePlus, MessagesSquare, Reply } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import type { RepairChatMessage } from "./repair-chat-types";
import { RepairChatComposer } from "./repair-chat-composer";
import { TIMEZONE } from "@/lib/date-utils";
import { buildRepairDetailsHref } from "@/lib/repair-chat/navigation";

type Reader = { lastReadAt: string; user: { id: string; name: string } };
const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrador", VENDOR: "Vendedor", TECHNICIAN: "Técnico" };

export function RepairChatThread() {
    const chat = useRepairChat();
    const router = useRouter();
    const [reply, setReply] = useState<RepairChatMessage | null>(null);
    const [readers, setReaders] = useState<{ messageId: string; items: Reader[] } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const selectedId = chat.selected?.id;
    const lastMessageId = chat.messages.at(-1)?.id;
    useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [lastMessageId, selectedId]);
    const showReaders = async (messageId: string) => {
        if (!chat.selected) return;
        const response = await fetch(`/api/repair-chats/${chat.selected.id}/messages/${messageId}/readers`, { cache: "no-store" });
        if (response.ok) setReaders({ messageId, items: (await response.json()).readers });
    };
    if (!chat.selected) return null;
    const openRepairDetails = () => {
        const href = buildRepairDetailsHref(chat.currentUserRole, chat.selected!);
        chat.setOpen(false);
        router.push(href);
    };
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-w-0 items-center gap-2 border-b px-3 py-2.5">
                <button type="button" aria-label="Volver a chats" onClick={chat.backToInbox} className="rounded-lg p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
                <button type="button" onClick={openRepairDetails} aria-label={`Abrir detalles de la reparación ${chat.selected.ticketNumber}`} title="Abrir detalle completo" className="group min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><span className="flex min-w-0 items-center gap-1"><strong className="truncate text-sm underline-offset-4 group-hover:underline">#{chat.selected.ticketNumber}</strong><ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-500" /></span><small className="block truncate text-muted-foreground">{chat.selected.deviceBrand} {chat.selected.deviceModel} · {chat.selected.status.name}{chat.selected.assignedTo ? ` · ${chat.selected.assignedTo.name}` : ""}</small></button>
                <button type="button" aria-label="Nuevo chat" title="Nuevo chat" onClick={() => chat.setNewChatOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950"><MessageCirclePlus className="h-4 w-4" /></button>
            </div>
            {readers ? <div role="dialog" aria-label="Quién lo leyó" className="border-b bg-sky-50 px-4 py-3 text-sm text-slate-900 dark:bg-sky-950 dark:text-slate-100"><div className="flex items-center justify-between"><strong>Quién lo leyó</strong><button type="button" onClick={() => setReaders(null)} aria-label="Cerrar lectores"><span aria-hidden>×</span></button></div>{readers.items.length ? <ul className="mt-2 space-y-1">{readers.items.map((reader) => <li key={reader.user.id}>{reader.user.name} · {new Date(reader.lastReadAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}</li>)}</ul> : <p className="mt-2 text-muted-foreground">Todavía nadie más lo leyó.</p>}</div> : null}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-100/50 p-3 dark:bg-slate-950/40">
                {chat.messageCursor ? <button type="button" onClick={() => void chat.loadOlderMessages()} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950">Cargar mensajes anteriores</button> : null}
                {chat.loading ? <p className="text-center text-sm text-muted-foreground">Cargando…</p> : null}
                {!chat.loading && chat.messages.length === 0 ? <div className="grid h-full place-content-center px-8 text-center text-muted-foreground"><MessagesSquare className="mx-auto mb-3 h-9 w-9 text-sky-500/70" /><p className="font-semibold text-foreground">Todavía no hay mensajes</p><p className="mt-1 text-xs">Escribí el primero y presioná Enter para enviarlo.</p></div> : null}
                {chat.messages.map((message) => (
                    <article key={message.id} className={`group max-w-[88%] rounded-2xl border p-3 shadow-sm ${message.senderId === chat.currentUserId ? "ml-auto border-sky-500/30 bg-sky-600 text-white" : "mr-auto bg-background"}`}>
                        <p className={`mb-1 text-xs font-bold ${message.senderId === chat.currentUserId ? "text-sky-100" : "text-sky-600"}`}>{message.sender.name} · {ROLE_LABELS[message.sender.role] ?? message.sender.role}</p>
                        {message.replyTo ? <div className={`mb-2 rounded-lg border-l-4 border-sky-400 px-2 py-1 text-xs ${message.senderId === chat.currentUserId ? "bg-black/15" : "bg-muted"}`}>{message.replyTo.sender.name}: {message.replyTo.content}</div> : null}
                        {message.content ? <p className="whitespace-pre-wrap text-sm">{message.content}</p> : null}
                        {message.imageUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><Image src={url} alt="Imagen del chat" width={480} height={320} unoptimized className="mt-2 max-h-56 w-auto rounded-xl object-cover" /></a>)}
                        <div className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${message.senderId === chat.currentUserId ? "text-sky-100" : "text-muted-foreground"}`}><button type="button" onClick={() => setReply(message)} className="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"><Reply className="h-3 w-3" />Responder</button><span>{new Date(message.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE })}</span><button type="button" disabled={!message.readBySomeone} onClick={() => void showReaders(message.id)} title={message.readBySomeone ? "Leído: ver quién lo leyó" : "Enviado"} aria-label={message.readBySomeone ? "Leído: ver quién lo leyó" : "Enviado"}><CheckCheck className={`h-4 w-4 ${message.readBySomeone ? (message.senderId === chat.currentUserId ? "text-cyan-200" : "text-sky-500") : "opacity-60"}`} /></button></div>
                    </article>
                ))}
                <div ref={endRef} />
            </div>
            {chat.readOnly ? <div className="border-t bg-muted p-3 text-center text-sm text-muted-foreground">Chat archivado en modo solo lectura.</div> : <RepairChatComposer reply={reply} onCancelReply={() => setReply(null)} />}
        </div>
    );
}
