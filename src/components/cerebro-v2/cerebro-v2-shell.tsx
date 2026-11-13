"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import "./bench.css";
import { ArrowUpRight, FolderOpen, Loader2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { ChatMessage, ChatSession } from "@/lib/cerebro-v2/chat-repository";
import type { CerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";
import { cerebroInitialState, cerebroUiReducer } from "@/lib/cerebro-v2/ui-state";
import type { CerebroMessageMetadata } from "@/lib/cerebro-v2/types";
import { CerebroV2Closure } from "./cerebro-v2-closure";
import { CerebroV2RepairEvidence } from "./cerebro-v2-repair-evidence";
import { CerebroV2Chat } from "./cerebro-v2-chat";
import { CerebroV2Header } from "./cerebro-v2-header";
import { CerebroV2History } from "./cerebro-v2-history";
import { CerebroV2PdfViewer } from "./cerebro-v2-pdf-viewer";
import type { CerebroUiMessage } from "./use-cerebro-v2-chat";

type SessionDetail = { session: ChatSession; messages: ChatMessage[] };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? `Error ${response.status}`);
    return payload;
}

function toUiMessages(messages: ChatMessage[]): CerebroUiMessage[] {
    return messages.map((message) => {
        const metadata: CerebroMessageMetadata | undefined = message.role === "assistant" ? {
            promptVersion: message.promptVersion ?? "cerebro-tech-v2.1",
            provider: message.provider ?? "stored",
            sources: message.sources,
            retrievalWarnings: message.metadata.retrievalWarnings,
            diagnosticState: message.metadata.diagnosticState,
            diagnosticPlan: message.metadata.diagnosticPlan,
            ...(message.metadata.guidedQuestion ? { guidedQuestion: message.metadata.guidedQuestion } : {}),
        } : undefined;
        return {
            id: message.clientMessageId,
            role: message.role,
            metadata,
            parts: [
                { type: "text", text: message.content },
                ...message.attachments.map((url) => ({ type: "file" as const, mediaType: url.slice(5, url.indexOf(";")) || "image/jpeg", url })),
            ],
        };
    });
}

export function CerebroV2Shell({ initialRepairId }: { initialRepairId?: string } = {}) {
    const [state, dispatch] = useReducer(cerebroUiReducer, cerebroInitialState);
    const [messages, setMessages] = useState<CerebroUiMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<"loading" | "healthy" | "degraded">("loading");
    const [repairs, setRepairs] = useState<CerebroRepairSummary[]>([]);
    const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
    const [repairPickerOpen, setRepairPickerOpen] = useState(false);
    const [closureOpen, setClosureOpen] = useState(false);
    const [healthDetails, setHealthDetails] = useState<string[]>([]);

    const sequence = useRef(0);
    const [query, setQuery] = useState("");
    const [queue, setQueue] = useState<CerebroRepairSummary[]>([]);
    const [searching, setSearching] = useState(false);
    useEffect(() => {
        let current = true;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const result = await jsonRequest<{repairs: CerebroRepairSummary[]}>(`/api/cerebro-v2/repairs?q=${encodeURIComponent(query)}`);
                if (current) setQueue(result.repairs);
            } catch { if (current) setError("No se pudo cargar la bandeja de reparaciones."); }
            finally { if (current) setSearching(false); }
        }, query ? 180 : 0);
        return () => { current = false; clearTimeout(timer); };
    }, [query]);

    const rememberRepair = (repair: CerebroRepairSummary) => setRepairs(items => [...items.filter(r => r.id !== repair.id), repair]);
    const loadSession = useCallback(async (session: ChatSession, token: number) => {
        const [detail, scope] = await Promise.all([
            jsonRequest<SessionDetail>(`/api/cerebro-v2/sessions/${session.id}`),
            session.repairId ? jsonRequest<{repairs:CerebroRepairSummary[]}>(`/api/cerebro-v2/repairs?id=${encodeURIComponent(session.repairId)}`) : Promise.resolve({repairs:[]}),
        ]);
        if (token !== sequence.current) return;
        if (scope.repairs[0]) rememberRepair(scope.repairs[0]);
        else setRepairs(items => items.filter(r => r.id !== session.repairId));
        setMessages(toUiMessages(detail.messages));
        setSelectedRepairId(detail.session.repairId);
        dispatch({type:"session-selected",session:detail.session});
    }, []);
    useEffect(() => {
        const token = ++sequence.current;
        setLoading(true); setSelectedRepairId(null); setMessages([]); dispatch({type:"repair-selected"});
        void (async () => {
            try {
                const [list, target] = await Promise.all([
                    jsonRequest<{sessions:ChatSession[]}>("/api/cerebro-v2/sessions"),
                    initialRepairId ? jsonRequest<{repairs:CerebroRepairSummary[]}>(`/api/cerebro-v2/repairs?id=${encodeURIComponent(initialRepairId)}`) : Promise.resolve({repairs:[]}),
                ]);
                if (token !== sequence.current) return;
                dispatch({type:"sessions-loaded",sessions:list.sessions});
                if (!initialRepairId) return;
                const repair = target.repairs.find(r => r.id === initialRepairId);
                if (!repair) throw new Error("La reparación ya no está disponible para tu usuario.");
                rememberRepair(repair); setSelectedRepairId(repair.id);
                const session = list.sessions.find(s => s.repairId === repair.id);
                if (session) await loadSession(session, token);
            } catch (e) { if (token === sequence.current) setError(e instanceof Error ? e.message : "No se pudo abrir el banco."); }
            finally { if (token === sequence.current) setLoading(false); }
        })();
        return () => { ++sequence.current; };
    }, [initialRepairId, loadSession]);
    useEffect(() => {
        let active = true;
        void fetch("/api/cerebro-v2/health").then(response => response.json()).then((result: { overall?: "healthy" | "degraded"; reasons?: string[] }) => {
            if (!active) return;
            setHealth(result.overall ?? "degraded");
            setHealthDetails(result.reasons?.length ? result.reasons : [result.overall === "healthy" ? "Las rutas de consulta están accesibles. Cada respuesta informa si su búsqueda o proveedor encontró una limitación." : "El detalle de disponibilidad no pudo verificarse."]);
        }).catch(() => { if (active) { setHealth("degraded"); setHealthDetails(["No se pudo consultar el estado del servicio."]); } });
        return () => { active = false; };
    }, []);

    const selectSession = async (session: ChatSession) => {
        const token = ++sequence.current;
        setRepairPickerOpen(false); setLoading(true); setError(null); setClosureOpen(false);
        try { await loadSession(session, token); }
        catch { if (token === sequence.current) setError("No se pudo abrir la conversación."); }
        finally { if (token === sequence.current) setLoading(false); }
    };

    const choose = (repair: CerebroRepairSummary) => {
        ++sequence.current;
        rememberRepair(repair); setSelectedRepairId(repair.id); setMessages([]); setClosureOpen(false);
        setError(null); setLoading(false); setRepairPickerOpen(false); dispatch({type:"repair-selected"});
        const session = state.sessions.find(s => s.repairId === repair.id);
        if (session) void selectSession(session);
    };

    const newChat = async () => {
        if (!selectedRepairId || loading) return;
        const token = ++sequence.current;
        setLoading(true); setError(null);
        try {
            const result = await jsonRequest<{ session: ChatSession }>("/api/cerebro-v2/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repairId: selectedRepairId }) });
            if (token !== sequence.current) return;
            setMessages([]); dispatch({ type: "session-created", session: result.session });
        } catch { if (token === sequence.current) setError("No se pudo crear la consulta."); }
        finally { if (token === sequence.current) setLoading(false); }
    };
    const deleteChat = async (sessionId: string) => {
        try {
            await jsonRequest(`/api/cerebro-v2/sessions/${sessionId}`, { method: "DELETE" });
            dispatch({ type: "session-deleted", sessionId });
            if (state.activeSessionId === sessionId) setMessages([]);
        } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el chat"); }
    };

    const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? null;
    const activeSession = state.sessions.find((session) => session.id === state.activeSessionId) ?? null;

    return (
        <div className="cerebro-bench">
            <CerebroV2Header selectedRepair={selectedRepair} activeSession={activeSession} health={health} healthDetails={healthDetails} onCloseRepair={() => setClosureOpen(true)} onChooseRepair={() => setRepairPickerOpen(true)} onHistory={() => dispatch({ type: "toggle-history" })} onNewChat={() => void newChat()} />
            <div className="bench-floor">
                {(selectedRepair || activeSession) && !repairPickerOpen && <aside className="bench-file" aria-label="Ficha del equipo">
                    <span className="bench-ticket">{selectedRepair?.ticketNumber ?? activeSession?.ticketNumber}</span>
                    <h2>{selectedRepair?.deviceBrand ?? activeSession?.brand} <br/>{selectedRepair?.deviceModel ?? activeSession?.model}</h2>
                    <p>{selectedRepair?.statusName ?? "Historial de reparación"}</p>
                    <section><div className="bench-label">Motivo de ingreso</div><p>{selectedRepair?.problemDescription || "Ficha activa no disponible"}</p></section>
                    {selectedRepair && <details><summary>Datos del ticket</summary>
                        <p>{selectedRepair.branchName} · {selectedRepair.technicianName}</p>
                        {selectedRepair.isWarranty && <p>En garantía</p>}{selectedRepair.isWet && <p>Humedad registrada</p>}
                        {selectedRepair.latestNote && <section><div className="bench-label">Última nota del taller</div><p>{selectedRepair.latestNote}</p></section>}
                        {selectedRepair.assignedParts?.length > 0 && <section><div className="bench-label">Repuestos asignados</div><p>{selectedRepair.assignedParts.join(" · ")}</p></section>}
                    </details>}
                    <Button variant="outline" size="sm" onClick={() => setRepairPickerOpen(true)}><FolderOpen size={15}/> Cambiar equipo</Button>
                </aside>}
                <CerebroV2History open={state.historyOpen} sessions={state.sessions} activeSessionId={state.activeSessionId} onClose={() => dispatch({ type: "close-history" })} onSelect={(session) => void selectSession(session)} onDelete={(sessionId) => void deleteChat(sessionId)} />
                {loading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-blue-300" /></div> : repairPickerOpen || (!selectedRepair && !activeSession) ?
                    <section className="bench-queue"><h1 className="bench-main-title">Reparaciones en banco</h1>
                        <Input className="mb-4 bg-zinc-900" aria-label="Buscar reparaciones" placeholder="Buscar por ticket, modelo o falla" value={query} onChange={event => setQuery(event.target.value)}/>
                        {repairPickerOpen && (selectedRepair || activeSession) && <button className="mb-4 underline" onClick={() => setRepairPickerOpen(false)}>Volver al equipo</button>}
                        <div className="bench-list">{searching ? <p>Buscando reparaciones…</p> : queue.length ? queue.map(r => <button key={r.id} onClick={() => choose(r)}><span><small>{r.ticketNumber} · {r.statusName}</small><strong>{r.deviceBrand} {r.deviceModel}</strong><p>{r.problemDescription}</p></span><ArrowUpRight size={20}/></button>) : <p>No se encontraron reparaciones asignadas.</p>}</div>
                    </section> : state.activeSessionId && activeSession ?
                    <CerebroV2Chat key={activeSession.id} sessionId={activeSession.id} repairId={activeSession.repairId ?? undefined} intake={selectedRepair?.problemDescription} latestNote={selectedRepair?.latestNote} assignedParts={selectedRepair?.assignedParts}
                        brand={selectedRepair?.deviceBrand ?? activeSession.brand} model={selectedRepair?.deviceModel ?? activeSession.model} linkedToRepair={Boolean(selectedRepair && selectedRepair.id === activeSession.repairId)}
                        initialMessages={messages} onOpenSource={source => dispatch({type:"open-source",source})} onConversationUpdated={() => { const token = sequence.current; void jsonRequest<{sessions:ChatSession[]}>("/api/cerebro-v2/sessions").then(list => { if (token === sequence.current) dispatch({type:"sessions-loaded",sessions:list.sessions}); }).catch(() => setError("No se pudo actualizar el historial.")); }}/>
                    : <section className="bench-welcome"><div className="bench-label">Diagnóstico técnico</div><h1 className="bench-main-title">Mesa de trabajo</h1><p className="mb-6 max-w-lg">Abrí una consulta para trabajar con la falla y las notas de este ticket.</p><Button onClick={() => void newChat()}>Abrir consulta <ArrowUpRight size={16}/></Button></section>}

                {closureOpen && (activeSession?.repairId || selectedRepairId) ? <CerebroV2Closure repairId={(activeSession?.repairId || selectedRepairId)!} onClose={() => setClosureOpen(false)} /> : null}
                {state.activeSource?.sourceType === "REPAIR" && state.activeSessionId ? <CerebroV2RepairEvidence source={state.activeSource} sessionId={state.activeSessionId} onClose={() => dispatch({ type: "close-source" })} /> : null}
                {state.activeSource?.sourceType === "PDF" ? <CerebroV2PdfViewer source={state.activeSource} onClose={() => dispatch({ type: "close-source" })} /> : null}
            </div>
            {error ? <div className="flex items-center gap-2 border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"><TriangleAlert size={15} />{error}<button type="button" onClick={() => setError(null)} className="ml-auto text-xs underline">Cerrar</button></div> : null}
        </div>
    );
}
