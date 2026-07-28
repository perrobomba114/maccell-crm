"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import { RepairChatInbox } from "./repair-chat-inbox";

const POSITION_KEY = "maccell:repair-chat-position:v1";

export function RepairChatWidget() {
    const { open, setOpen, unreadCount, preview, dismissPreview, selectRepair } = useRepairChat();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const saved = localStorage.getItem(POSITION_KEY);
        if (saved) {
            try { setPosition(JSON.parse(saved)); } catch { localStorage.removeItem(POSITION_KEY); }
        }
    }, []);
    return (
        <div className="pointer-events-none fixed inset-0 z-[70] print:hidden">
            <AnimatePresence>
                {open ? (
                    <motion.section
                        initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="pointer-events-auto fixed inset-x-2 bottom-20 flex h-[min(76dvh,720px)] flex-col overflow-hidden rounded-3xl border border-sky-500/25 bg-background/98 shadow-2xl shadow-black/35 backdrop-blur-xl sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[430px]"
                    >
                        <div className="flex items-center justify-between border-b bg-slate-950 px-4 py-3 text-white">
                            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Interno</p><h2 className="font-semibold">Chats de reparaciones</h2></div>
                            <button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
                        </div>
                        <RepairChatInbox />
                    </motion.section>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {!open && preview ? (
                    <motion.div key={preview.eventId} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} className="pointer-events-auto fixed bottom-24 right-5 w-[min(340px,calc(100vw-2.5rem))] rounded-2xl border border-sky-500/30 bg-background p-3 shadow-2xl">
                        <button type="button" aria-label="Descartar vista previa" onClick={dismissPreview} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void selectRepair(preview.repair).then(() => setOpen(true))} className="w-full pr-7 text-left">
                            <span className="block text-xs font-bold uppercase tracking-wide text-sky-600">Reparación #{preview.ticketNumber}</span>
                            <strong className="mt-1 block truncate text-sm">{preview.sender}</strong>
                            <span className="block truncate text-sm text-muted-foreground">{preview.snippet}</span>
                        </button>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <motion.button
                type="button" aria-label="Abrir chat interno de reparaciones" drag dragMomentum={false}
                animate={{ x: position.x, y: position.y, scale: preview ? [1, 1.12, 1] : 1 }}
                onDragEnd={(_, info) => {
                    const next = { x: Math.max(-window.innerWidth + 96, Math.min(0, position.x + info.offset.x)), y: Math.max(-window.innerHeight + 160, Math.min(0, position.y + info.offset.y)) };
                    setPosition(next); localStorage.setItem(POSITION_KEY, JSON.stringify(next));
                }}
                onClick={() => setOpen(!open)}
                className="pointer-events-auto fixed bottom-5 right-5 grid h-14 w-14 place-items-center rounded-2xl border border-sky-300/30 bg-sky-600 text-white shadow-xl shadow-sky-950/35 transition-colors hover:bg-sky-500"
            >
                <MessageCircle className="h-6 w-6" />
                {unreadCount > 0 ? <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-black">{unreadCount}</span> : null}
            </motion.button>
        </div>
    );
}
