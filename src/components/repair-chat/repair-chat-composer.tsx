"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useState } from "react";
import { useRepairChat } from "./repair-chat-provider";
import type { RepairChatMessage } from "./repair-chat-types";

export function RepairChatComposer({ reply, onCancelReply }: { reply: RepairChatMessage | null; onCancelReply: () => void }) {
    const { send } = useRepairChat();
    const [text, setText] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const submit = async () => {
        if (!text.trim() && images.length === 0) return;
        setSending(true);
        const sent = await send(text.trim(), images, reply?.id);
        if (sent) { setText(""); setImages([]); onCancelReply(); }
        setSending(false);
    };
    return (
        <div className="border-t bg-background p-3">
            {reply ? <div className="mb-2 flex items-center justify-between rounded-lg border-l-4 border-sky-500 bg-muted p-2 text-xs"><span>Responder a {reply.sender.name}: {reply.content}</span><button type="button" onClick={onCancelReply}><X className="h-4 w-4" /></button></div> : null}
            <div className="flex items-end gap-2">
                <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border hover:bg-muted" aria-label="Adjuntar imágenes"><ImagePlus className="h-5 w-5" /><input className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, 4))} /></label>
                <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={1} placeholder="Mensaje interno…" className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                <button type="button" disabled={sending} onClick={() => void submit()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
            {images.length > 0 ? <p className="mt-1 text-xs text-muted-foreground">{images.length} imagen{images.length === 1 ? "" : "es"} seleccionada{images.length === 1 ? "" : "s"}</p> : null}
        </div>
    );
}
