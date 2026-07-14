"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useReducer, useState } from "react";

import type { ChatMessage, ChatSession } from "@/lib/cerebro-v2/chat-repository";
import type { CerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";
import { cerebroInitialState, cerebroUiReducer } from "@/lib/cerebro-v2/ui-state";
import type { CerebroMessageMetadata } from "@/lib/cerebro-v2/types";
import { CerebroV2Chat } from "./cerebro-v2-chat";
import { CerebroV2Header } from "./cerebro-v2-header";
import { CerebroV2History } from "./cerebro-v2-history";
import { CerebroV2PdfViewer } from "./cerebro-v2-pdf-viewer";
import { CerebroV2RepairPicker } from "./cerebro-v2-repair-picker";
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

export function CerebroV2Shell() {
    const [state, dispatch] = useReducer(cerebroUiReducer, cerebroInitialState);
    const [messages, setMessages] = useState<CerebroUiMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<"loading" | "healthy" | "degraded">("loading");
    const [repairs, setRepairs] = useState<CerebroRepairSummary[]>([]);
    const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
    const [repairPickerOpen, setRepairPickerOpen] = useState(false);

    const loadSessions = useCallback(async () => {
        try {
            const [sessionResult, repairResult] = await Promise.all([
                jsonRequest<{ sessions: ChatSession[] }>("/api/cerebro-v2/sessions"),
                jsonRequest<{ repairs: CerebroRepairSummary[] }>("/api/cerebro-v2/repairs"),
            ]);
            dispatch({ type: "sessions-loaded", sessions: sessionResult.sessions });
            setRepairs(repairResult.repairs);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "No se pudo cargar Cerebro V2");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadSessions(); }, [loadSessions]);
    useEffect(() => { void jsonRequest<{ overall: "healthy" | "degraded" }>("/api/cerebro-v2/health").then((result) => setHealth(result.overall)).catch(() => setHealth("degraded")); }, []);

    const selectSession = async (session: ChatSession) => {
        setLoading(true); setError(null);
        try {
            const detail = await jsonRequest<SessionDetail>(`/api/cerebro-v2/sessions/${session.id}`);
            setMessages(toUiMessages(detail.messages));
            dispatch({ type: "session-selected", session: detail.session });
            setSelectedRepairId(detail.session.repairId);
        } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo abrir el chat"); }
        finally { setLoading(false); }
    };

    const newChat = async () => {
        if (!selectedRepairId) { setError("Seleccioná una reparación asignada antes de crear un chat"); return; }
        setLoading(true); setError(null);
        try {
            const result = await jsonRequest<{ session: ChatSession }>("/api/cerebro-v2/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repairId: selectedRepairId }) });
            setMessages([]); dispatch({ type: "session-created", session: result.session });
        } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo crear el chat"); }
        finally { setLoading(false); }
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
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-700/70 bg-[#0b1117] text-slate-100">
            <CerebroV2Header selectedRepair={selectedRepair} activeSession={activeSession} health={health} onChooseRepair={() => setRepairPickerOpen(true)} onHistory={() => dispatch({ type: "toggle-history" })} onNewChat={() => void newChat()} />
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <CerebroV2RepairPicker open={repairPickerOpen} repairs={repairs} selectedId={selectedRepairId} onClose={() => setRepairPickerOpen(false)} onSelect={(repair) => { setSelectedRepairId(repair.id); setRepairPickerOpen(false); }} />
                <CerebroV2History open={state.historyOpen} sessions={state.sessions} activeSessionId={state.activeSessionId} onClose={() => dispatch({ type: "close-history" })} onSelect={(session) => void selectSession(session)} onDelete={(sessionId) => void deleteChat(sessionId)} />
                {loading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-cyan-300" /></div> : state.activeSessionId && activeSession ? <CerebroV2Chat key={state.activeSessionId} sessionId={state.activeSessionId} brand={activeSession.brand} model={activeSession.model} linkedToRepair={Boolean(activeSession.repairId)} initialMessages={messages} onOpenSource={(source) => dispatch({ type: "open-source", source })} onConversationUpdated={() => void loadSessions()} /> : <div className="flex flex-1 items-center justify-center p-6 text-center"><div><p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Cerebro técnico</p><p className="mt-3 text-lg text-slate-200">Elegí una reparación asignada para comenzar.</p><p className="mt-2 text-sm text-slate-500">La identidad del equipo se toma del ticket y no puede editarse desde el chat.</p><button type="button" onClick={() => setRepairPickerOpen(true)} className="mt-5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">Elegir reparación</button></div></div>}
                {state.activeSource?.sourceType === "PDF" ? <CerebroV2PdfViewer source={state.activeSource} onClose={() => dispatch({ type: "close-source" })} /> : null}
            </div>
            {error ? <div className="flex items-center gap-2 border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"><TriangleAlert size={15} />{error}<button type="button" onClick={() => setError(null)} className="ml-auto text-xs underline">Cerrar</button></div> : null}
        </div>
    );
}
