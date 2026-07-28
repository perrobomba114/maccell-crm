"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";
import type { RepairChatMessage, RepairChatPreview, RepairChatSummary, RepairSearchResult } from "./repair-chat-types";
import { RepairChatWidget } from "./repair-chat-widget";
import type { RepairChatRole } from "@/lib/repair-chat/navigation";

const CHAT_NOTIFICATION_SOUND = "/chat.mp3";
const CHAT_NOTIFICATION_VOLUME = 0.9;
let waitingForChatSoundInteraction = false;

function playChatNotificationSound(): void {
    const audio = new Audio(CHAT_NOTIFICATION_SOUND);
    audio.volume = CHAT_NOTIFICATION_VOLUME;
    void audio.play().catch(() => {
        if (waitingForChatSoundInteraction) return;
        waitingForChatSoundInteraction = true;
        const retry = () => {
            waitingForChatSoundInteraction = false;
            document.removeEventListener("pointerdown", retry);
            document.removeEventListener("keydown", retry);
            const retryAudio = new Audio(CHAT_NOTIFICATION_SOUND);
            retryAudio.volume = CHAT_NOTIFICATION_VOLUME;
            void retryAudio.play().catch((error: unknown) => {
                console.warn("[REPAIR_CHAT] Notification sound unavailable:", error instanceof Error ? error.message : "unknown error");
            });
        };
        document.addEventListener("pointerdown", retry, { once: true });
        document.addEventListener("keydown", retry, { once: true });
    });
}

type State = {
    open: boolean;
    newChatOpen: boolean;
    scope: "active" | "archived";
    chats: RepairChatSummary[];
    nextCursor: string | null;
    selected: RepairChatSummary["repair"] | null;
    messages: RepairChatMessage[];
    messageCursor: string | null;
    searchResults: RepairSearchResult[];
    readOnly: boolean;
    loading: boolean;
    preview: RepairChatPreview | null;
};

type Action =
    | { type: "open"; value: boolean }
    | { type: "newChat"; value: boolean }
    | { type: "scope"; value: State["scope"] }
    | { type: "chats"; value: RepairChatSummary[]; nextCursor: string | null; append?: boolean }
    | { type: "select"; value: RepairChatSummary["repair"] | null }
    | { type: "thread"; messages: RepairChatMessage[]; readOnly: boolean; nextCursor: string | null; prepend?: boolean }
    | { type: "search"; value: RepairSearchResult[] }
    | { type: "preview"; value: RepairChatPreview | null }
    | { type: "loading"; value: boolean };

const initialState: State = { open: false, newChatOpen: false, scope: "active", chats: [], nextCursor: null, selected: null, messages: [], messageCursor: null, searchResults: [], readOnly: false, loading: false, preview: null };
function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "open": return { ...state, open: action.value };
        case "newChat": return { ...state, newChatOpen: action.value, searchResults: action.value ? [] : state.searchResults };
        case "scope": return { ...state, scope: action.value, chats: [], nextCursor: null, selected: null, messages: [], messageCursor: null };
        case "chats": return {
            ...state,
            chats: action.append ? [...state.chats, ...action.value.filter((item) => !state.chats.some((chat) => chat.repair.id === item.repair.id))] : action.value,
            nextCursor: action.nextCursor,
        };
        case "select": return { ...state, selected: action.value, messageCursor: null };
        case "thread": return { ...state, messages: action.prepend ? [...action.messages, ...state.messages] : action.messages, messageCursor: action.nextCursor, readOnly: action.readOnly };
        case "search": return { ...state, searchResults: action.value };
        case "preview": return { ...state, preview: action.value };
        case "loading": return { ...state, loading: action.value };
    }
}

type ContextValue = State & {
    currentUserId: string;
    currentUserRole: RepairChatRole;
    unreadCount: number;
    setOpen: (value: boolean) => void;
    setNewChatOpen: (value: boolean) => void;
    setScope: (value: State["scope"]) => void;
    backToInbox: () => void;
    dismissPreview: () => void;
    loadMore: () => Promise<void>;
    loadOlderMessages: () => Promise<void>;
    search: (query: string, scope?: State["scope"]) => Promise<void>;
    selectRepair: (repair: RepairChatSummary["repair"]) => Promise<void>;
    send: (content: string, images: File[], replyToId?: string) => Promise<boolean>;
};

const RepairChatContext = createContext<ContextValue | null>(null);

export function useRepairChat(): ContextValue {
    const value = useContext(RepairChatContext);
    if (!value) throw new Error("useRepairChat must be used inside RepairChatProvider");
    return value;
}

export function RepairChatProvider({ userId, role, children }: { userId: string; role: RepairChatRole; children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const scopeRef = useRef(state.scope);
    const selectedRef = useRef(state.selected);
    const openRef = useRef(state.open);
    const nextCursorRef = useRef(state.nextCursor);
    const messageCursorRef = useRef(state.messageCursor);
    scopeRef.current = state.scope;
    selectedRef.current = state.selected;
    openRef.current = state.open;
    nextCursorRef.current = state.nextCursor;
    messageCursorRef.current = state.messageCursor;

    const fetchChats = useCallback(async (scope: State["scope"], cursor?: string): Promise<{ items: RepairChatSummary[]; nextCursor: string | null }> => {
        if (!userId) return { items: [], nextCursor: null };
        const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
        const response = await fetch(`/api/repair-chats?scope=${scope}${cursorQuery}`, { cache: "no-store" });
        return response.ok ? await response.json() : { items: [], nextCursor: null };
    }, [userId]);

    const loadChats = useCallback(async (scope: State["scope"], append = false) => {
        const page = await fetchChats(scope, append ? nextCursorRef.current ?? undefined : undefined);
        dispatch({ type: "chats", value: page.items, nextCursor: page.nextCursor, append });
    }, [fetchChats]);

    const loadThread = useCallback(async (repair: RepairChatSummary["repair"], markAsRead = true) => {
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
            dispatch({ type: "thread", messages: data.items, readOnly: data.readOnly, nextCursor: data.nextCursor });
            if (markAsRead) {
                await fetch(`/api/repair-chats/${repair.id}/read`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAt: new Date().toISOString() }) });
            }
        } finally {
            dispatch({ type: "loading", value: false });
        }
    }, []);

    useEffect(() => { void loadChats(state.scope); }, [loadChats, state.scope]);

    useEffect(() => {
        if (!userId) return;
        const source = new EventSource("/api/repair-chats/events");
        const refresh = async (event: Event) => {
            let payload: { eventId: string; repairId: string } | null = null;
            try {
                payload = event instanceof MessageEvent ? JSON.parse(event.data) as { eventId: string; repairId: string } : null;
            } catch {
                return;
            }
            if (!payload) return;
            if (event.type === "message.created") {
                const activePage = await fetchChats("active");
                if (scopeRef.current === "active") dispatch({ type: "chats", value: activePage.items, nextCursor: activePage.nextCursor });
                else await loadChats(scopeRef.current);
                const chat = activePage.items.find((item) => item.repair.id === payload.repairId);
                const latest = chat?.messages?.[0];
                if (chat && latest && latest.sender.id !== userId) {
                    dispatch({ type: "preview", value: {
                        eventId: payload.eventId,
                        repair: chat.repair,
                        ticketNumber: chat.repair.ticketNumber,
                        sender: latest.sender.name,
                        snippet: latest.content || (latest.imageUrls.length ? "Imagen" : "Nuevo mensaje"),
                    } });
                    playChatNotificationSound();
                }
            } else {
                await loadChats(scopeRef.current);
            }
            const selected = selectedRef.current;
            if (selected?.id === payload.repairId) {
                await loadThread(selected, event.type === "message.created" && openRef.current);
            }
        };
        const handleEvent = (event: Event) => { void refresh(event); };
        source.addEventListener("message.created", handleEvent);
        source.addEventListener("chat.read", handleEvent);
        source.addEventListener("access.changed", handleEvent);
        source.addEventListener("status.changed", handleEvent);
        return () => source.close();
    }, [fetchChats, loadChats, loadThread, userId]);

    const search = useCallback(async (query: string, scope?: State["scope"]) => {
        const response = await fetch(`/api/repair-chats/search?q=${encodeURIComponent(query)}&scope=${scope ?? scopeRef.current}`, { cache: "no-store" });
        if (response.ok) dispatch({ type: "search", value: (await response.json()).items });
    }, []);

    const selectRepair = useCallback(async (repair: RepairChatSummary["repair"]) => {
        dispatch({ type: "preview", value: null });
        dispatch({ type: "newChat", value: false });
        dispatch({ type: "select", value: repair });
        await loadThread(repair);
    }, [loadThread]);

    const loadOlderMessages = useCallback(async () => {
        const repair = selectedRef.current;
        const cursor = messageCursorRef.current;
        if (!repair || !cursor) return;
        const response = await fetch(`/api/repair-chats/${repair.id}/messages?before=${encodeURIComponent(cursor)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        dispatch({ type: "thread", messages: data.items, readOnly: data.readOnly, nextCursor: data.nextCursor, prepend: true });
    }, []);

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
        currentUserId: userId,
        currentUserRole: role,
        unreadCount: state.chats.filter((chat) => chat.unread).length,
        setOpen: (value) => {
            if (value) dispatch({ type: "preview", value: null });
            if (!value) {
                selectedRef.current = null;
                dispatch({ type: "newChat", value: false });
                dispatch({ type: "select", value: null });
            }
            dispatch({ type: "open", value });
        },
        setNewChatOpen: (value) => dispatch({ type: "newChat", value }),
        setScope: (value) => dispatch({ type: "scope", value }),
        backToInbox: () => dispatch({ type: "select", value: null }),
        dismissPreview: () => dispatch({ type: "preview", value: null }),
        loadMore: () => loadChats(scopeRef.current, true),
        loadOlderMessages,
        search, selectRepair, send,
    }), [loadChats, loadOlderMessages, loadThread, role, search, selectRepair, send, state, userId]);

    return <RepairChatContext.Provider value={value}>{children}<RepairChatWidget /></RepairChatContext.Provider>;
}
