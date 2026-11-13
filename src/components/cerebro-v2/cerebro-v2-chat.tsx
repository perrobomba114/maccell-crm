"use client";

import { Button } from "@/components/ui/button";

import { Activity, AlertTriangle, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";
import { CerebroV2Observations } from "./cerebro-v2-observations";
import { CerebroV2Composer } from "./cerebro-v2-composer";
import { CerebroV2Message } from "./cerebro-v2-message";
import { type CerebroUiMessage, useCerebroV2Chat } from "./use-cerebro-v2-chat";

type ChatProps = {
    sessionId: string;
    repairId?: string;
    brand: string;
    model: string;
    linkedToRepair: boolean;
    intake?: string;
    latestNote?: string | null;
    assignedParts?: string[];
    initialMessages: CerebroUiMessage[];
    onOpenSource: (source: CerebroPublicSource) => void;
    onConversationUpdated: () => void;
};

export function CerebroV2Chat(props: ChatProps) {
    const latestRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const chat = useCerebroV2Chat(props);
    const streaming = chat.status === "streaming" || chat.status === "submitted";
    useEffect(() => {
        if (!streaming && chat.messages.at(-1)?.role === "assistant") latestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        else bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat.messages, chat.status, streaming]);

    const diagnosticState = chat.messages.findLast(message => message.metadata?.diagnosticState)?.metadata?.diagnosticState;

    const latestDecision = chat.messages.findLastIndex(message => message.role === 'assistant');
    const renderMessage = (message: CerebroUiMessage, index: number) => (
        <div key={message.id} ref={index === chat.messages.length - 1 ? latestRef : undefined}>
            <CerebroV2Message repairId={props.repairId} message={message} disabled={!props.linkedToRepair || streaming || index !== chat.messages.length - 1}
                onOpenSource={props.onOpenSource} onGuidedAnswer={(questionId, option) => void chat.send(option.label, [], { questionId, optionId: option.id })} />
        </div>
    );

    return (
        <div className="bench-lab">
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 md:px-6">
                    {diagnosticState ? <CerebroV2Observations state={diagnosticState} disabled={streaming || !props.linkedToRepair} onCorrect={text => chat.send(text, [])} /> : null}
                    {chat.messages.length === 0 ? (
                        <section className="bench-welcome"><div className="bench-label">Falla informada en recepción</div>
                            <h1 className="bench-main-title bench-problem">{props.intake || 'Consulta de banco'}</h1>
                            {props.latestNote && <div className="bench-record"><div className="bench-label">Última nota del taller</div><p>{props.latestNote}</p></div>}
                            {Boolean(props.assignedParts?.length) && <div className="bench-record"><div className="bench-label">Repuestos asignados</div><p>{props.assignedParts?.join(" · ")}</p></div>}
                            {props.linkedToRepair && props.intake && <Button type="button" disabled={streaming} onClick={() => void chat.send("¿Por dónde empiezo con el síntoma de recepción?", [])}>Evaluar el síntoma del ticket <ArrowRight size={16}/></Button>}
                        </section>
                    ) : <>
                        {latestDecision > 0 && <details className="rounded-lg border border-zinc-700 px-4 py-3">
                            <summary className="cursor-pointer text-sm text-zinc-300">Conversación anterior · {latestDecision} mensajes</summary>
                            <div className="mt-4 space-y-4">{chat.messages.slice(0, latestDecision).map(renderMessage)}</div>
                        </details>}
                        <div className="space-y-4">{chat.messages.slice(Math.max(0, latestDecision)).map((message, i) => renderMessage(message, i + Math.max(0, latestDecision)))}</div>
                    </>}
                    {streaming ? <div className="flex items-center gap-3 rounded-md border border-blue-500/20 bg-blue-500/5 px-4 py-3 font-mono text-xs uppercase tracking-wider text-blue-300"><Activity size={15} className="animate-pulse" />Revisando el caso…</div> : null}
                    {chat.error ? <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">No se pudo completar el diagnóstico</p><p className="mt-1 text-red-300/80">{chat.error}</p><button type="button" onClick={chat.clearError} className="mt-2 font-mono text-[10px] uppercase tracking-wider text-red-200 underline">Cerrar aviso</button></div></div> : null}
                    <div ref={bottomRef} />
                </div>
            </div>
            {!props.linkedToRepair ? <p className="border-t border-zinc-700 px-4 py-2 text-xs text-amber-200">Chat en modo lectura: la reparación está finalizada o ya no figura entre tus reparaciones asignadas.</p> : null}
            {props.linkedToRepair && <div className="px-4 py-1"><Button type="button" variant="outline" size="sm" disabled={streaming} onClick={() => void chat.send("Buscá el esquemático para la falla de este ticket.", [])}>Consultar esquemático</Button></div>}
            <CerebroV2Composer disabled={!props.linkedToRepair} streaming={streaming} onSend={chat.send} onStop={chat.stop} />
        </div>
    );
}
