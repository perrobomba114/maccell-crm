"use client";

import { Activity, AlertTriangle, CircuitBoard } from "lucide-react";
import { useEffect, useRef } from "react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";
import { CerebroV2Composer } from "./cerebro-v2-composer";
import { CerebroV2Message } from "./cerebro-v2-message";
import { type CerebroUiMessage, useCerebroV2Chat } from "./use-cerebro-v2-chat";

type ChatProps = {
    sessionId: string;
    brand: string;
    model: string;
    linkedToRepair: boolean;
    initialMessages: CerebroUiMessage[];
    onOpenSource: (source: CerebroPublicSource) => void;
    onConversationUpdated: () => void;
};

export function CerebroV2Chat(props: ChatProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const chat = useCerebroV2Chat(props);
    const streaming = chat.status === "streaming" || chat.status === "submitted";
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.messages, chat.status]);

    return (
        <div className="flex min-w-0 flex-1 flex-col bg-[#0b1117]">
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 md:px-6">
                    {chat.messages.length === 0 ? (
                        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/5 shadow-[0_0_50px_rgba(34,211,238,0.08)]"><CircuitBoard size={30} className="text-cyan-300" /></div>
                            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Banco de diagnóstico</p>
                            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">{props.brand} {props.model}</h1>
                            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Indicá consumo en fuente, síntoma, mediciones y trabajos previos. Cerebro buscará casos del mismo modelo y páginas técnicas.</p>
                            <div className="mt-6 grid gap-2 text-left text-xs text-slate-500 sm:grid-cols-3"><span className="rounded border border-slate-800 px-3 py-2">01 · Síntoma</span><span className="rounded border border-slate-800 px-3 py-2">02 · Consumo/medición</span><span className="rounded border border-slate-800 px-3 py-2">03 · Intervención previa</span></div>
                        </div>
                    ) : chat.messages.map((message, index) => <CerebroV2Message key={message.id} message={message} disabled={streaming || index !== chat.messages.length - 1} onOpenSource={props.onOpenSource} onGuidedAnswer={(questionId, option) => void chat.send(option.label, [], { questionId, optionId: option.id })} />)}
                    {streaming ? <div className="flex items-center gap-3 rounded-md border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 font-mono text-xs uppercase tracking-wider text-cyan-300"><Activity size={15} className="animate-pulse" />Recuperando evidencia y preparando la próxima medición…</div> : null}
                    {chat.error ? <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">No se pudo completar el diagnóstico</p><p className="mt-1 text-red-300/80">{chat.error}</p><button type="button" onClick={chat.clearError} className="mt-2 font-mono text-[10px] uppercase tracking-wider text-red-200 underline">Cerrar aviso</button></div></div> : null}
                    <div ref={bottomRef} />
                </div>
            </div>
            <CerebroV2Composer disabled={!props.linkedToRepair} streaming={streaming} onSend={chat.send} onStop={chat.stop} />
        </div>
    );
}
