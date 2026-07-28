"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { toast } from "sonner";
import type { RepairChatMessage, RepairChatSummary, RepairSearchResult } from "./repair-chat-types";
import { RepairChatWidget } from "./repair-chat-widget";

type State = {
    open: boolean;
    scope: "active" | "archived";
    chats: RepairChatSummary[];
    selected: RepairChatSummary["repair"] | null;
    messages: RepairChatMessage[];
    searchResults: RepairSearchResult[];
    readOnly: boolean;
    loading: boolean;
};

type Action =
    | { type: "open"; value: boolean }
    | { type: "scope"; value: State["scope"] }
    | { type: "chats"; value: RepairChatSummary[] }
    | { type: "select"; value: RepairChatSummary["repair"] | null }
    | { type: "thread"; messages: RepairChatMessage[]; readOnly: boolean }
    | { type: "search"; value: RepairSearchResult[] }
    | { type: "loading"; value: boolean };

const initialState: State = { open: false, scope: "active", chats: [], selected: null, messages: [], searchResults: [], readOnly: false, loading: false };
function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "open": return { ...state, open: action.value };
        case "scope": return { ...state, scope: action.value, selected: null, messages: [] };
        case "chats": return { ...state, chats: action.value };
        case "select": return { ...state, selected: action.value };
        case "thread": return { ...state, messages: action.messages, readOnly: action.readOnly };
        case "search": return { ...state, searchResults: action.value };
        case "loading": return { ...state, loading: action.value };
    }
}

type ContextValue = State & {
    unreadCount: number;
    setOpen: (value: boolean) => void;
    setScope: (value: State["scope"]) => void;
    backToInbox: () => void;
    search: (query: string) => Promise<void>;
    selectRepair: (repair: RepairChatSummary["repair"]) => Promise<void>;
    send: (content: string, images: File[], replyToId?: string) => Promise<boolean>;
};

const RepairChatContext = createContext<ContextValue | null>(null);

export function useRepairChat(): ContextValue {
    const value = useContext(RepairChatContext);
    if (!value) throw new Error("useRepairChat must be used inside RepairChatProvider");
    return value;
}

export function RepairChatProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const loadChats = useCallback(async (scope: State["scope"]) => {
        if (!userId) return;
        const response = await fetch(`/api/repair-chats?scope=${scope}`, { cache: "no-store" });
        if (response.ok) dispatch({ type: "chats", value: (await response.json()).items });
    }, [userId]);

    const loadThread = useCallback(async (repair: RepairChatSummary["repair"]) => {
        dispatch({ type: "loading", value: true });
        try {
            const response = await fetch(`/api/repair-chats/${repair.id}/messages`, { cache: "no-store" });
            if (response.status === 403) {
                dispatch({ type: "select", value: null });
                toast.error("Ya no tenés acceso a esta reparación");
                return;
            }
            if (!response.ok) throw new Error("No se pudo abrir la conversación");
            const data = await response.json();
            dispatch({ type: "thread", messages: data.items, readOnly: data.readOnly });
            await fetch(`/api/repair-chats/${repair.id}/read`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAt: new Date().toISOString() }) });
        } finally {
            dispatch({ type: "loading", value: false });
        }
    }, []);

    useEffect(() => { void loadChats(state.scope); }, [loadChats, state.scope]);

    useEffect(() => {
        if (!userId) return;
        const source = new EventSource("/api/repair-chats/events");
        const refresh = () => {
            void loadChats(state.scope);
            if (state.selected) void loadThread(state.selected);
            const audio = new Audio("/notificacion.mp3");
            audio.volume = 0.5;
            void audio.play().catch(() => undefined);
        };
        source.addEventListener("message.created", refresh);
        source.addEventListener("chat.read", refresh);
        source.addEventListener("access.changed", refresh);
        source.addEventListener("status.changed", refresh);
        return () => source.close();
    }, [loadChats, loadThread, state.scope, state.selected, userId]);

    const search = useCallback(async (query: string) => {
        if (!query.trim()) return dispatch({ type: "search", value: [] });
        const response = await fetch(`/api/repair-chats/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        if (response.ok) dispatch({ type: "search", value: (await response.json()).items });
    }, []);

    const selectRepair = useCallback(async (repair: RepairChatSummary["repair"]) => {
        dispatch({ type: "select", value: repair });
        await loadThread(repair);
    }, [loadThread]);

    const send = useCallback(async (content: string, images: File[], replyToId?: string) => {
        if (!state.selected) return false;
        try {
            let imageUrls: string[] = [];
            if (images.length > 0) {
                const formData = new FormData();
                images.forEach((image) => formData.append("images", image));
                const upload = await fetch(`/api/repair-chats/${state.selected.id}/images`, { method: "POST", body: formData });
                if (!upload.ok) throw new Error((await upload.json()).error ?? "No se pudieron cargar las imágenes");
                imageUrls = (await upload.json()).imageUrls;
            }
            const response = await fetch(`/api/repair-chats/${state.selected.id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientRequestId: crypto.randomUUID(), content, imageUrls, replyToId }),
            });
            if (!response.ok) throw new Error((await response.json()).error ?? "No se pudo enviar");
            await loadThread(state.selected);
            await loadChats(state.scope);
            return true;
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "No se pudo enviar");
            return false;
        }
    }, [loadChats, loadThread, state.scope, state.selected]);

    const value = useMemo<ContextValue>(() => ({
        ...state,
        unreadCount: state.chats.filter((chat) => chat.unread).length,
        setOpen: (value) => dispatch({ type: "open", value }),
        setScope: (value) => dispatch({ type: "scope", value }),
        backToInbox: () => dispatch({ type: "select", value: null }),
        search, selectRepair, send,
    }), [search, selectRepair, send, state]);

    return <RepairChatContext.Provider value={value}>{children}<RepairChatWidget /></RepairChatContext.Provider>;
}
