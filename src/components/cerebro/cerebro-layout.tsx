"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CerebroChat } from "./cerebro-chat";
import { KnowledgePanel } from "./knowledge-panel";
import { SchematicUploadPanel } from "./schematic-upload-panel";
import {
    getConversationsAction, createConversationAction,
    getConversationMessagesAction, deleteConversationAction
} from "@/actions/cerebro-actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MessageSquare, Plus, BrainCircuit, Loader2, Trash2,
    ChevronDown, X, BookOpen, Clock, Zap, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { UIMessage } from "@ai-sdk/react";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CerebroLayoutProps { userId: string; isAdmin?: boolean; }

type ConversationSummary = {
    id: string;
    title: string | null;
    updatedAt: Date | string;
};

type CerebroDbMessage = {
    id: string;
    role: string;
    content: string | null;
    mediaUrls: string[];
};

type CerebroInitialPart = UIMessage["parts"][number] & {
    type: "text" | "file";
    text?: string;
    file?: {
        url: string;
        name: string;
        type: string;
    };
};

function toUiRole(role: string): UIMessage["role"] {
    return role === "assistant" ? "assistant" : "user";
}

function formatConvDate(dateStr: string | Date) {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ayer";
    return format(d, "d MMM", { locale: es });
}

export function CerebroLayout({ userId, isAdmin = false }: CerebroLayoutProps) {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeConvTitle, setActiveConvTitle] = useState<string>("Nueva Consulta");
    const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Drawers
    const [showHistory, setShowHistory] = useState(false);
    const [showWiki, setShowWiki] = useState(false);
    const [showSchematics, setShowSchematics] = useState(true);
    const [pendingKnowledgeContent, setPendingKnowledgeContent] = useState<string | null>(null);

    const historyRef = useRef<HTMLDivElement>(null);
    const wikiRef = useRef<HTMLDivElement>(null);

    // Close drawers on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (showHistory && historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setShowHistory(false);
            }
            if (showWiki && wikiRef.current && !wikiRef.current.contains(e.target as Node)) {
                setShowWiki(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showHistory, showWiki]);

    useEffect(() => {
        const handleSaveWiki = (e: Event) => {
            const ev = e as CustomEvent;
            setPendingKnowledgeContent(ev.detail.content);
            setShowWiki(true);
        };
        window.addEventListener("cerebro-save-wiki", handleSaveWiki);
        return () => window.removeEventListener("cerebro-save-wiki", handleSaveWiki);
    }, []);

    const loadConversations = useCallback(async (selectFirst = false) => {
        setIsLoading(true);
        try {
            const res = await getConversationsAction(userId);
            if (res.success && res.data) {
                setConversations(res.data);
                if (selectFirst && res.data.length > 0) {
                    await handleSelectConversation(res.data[0].id, res.data[0].title ?? undefined);
                }
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }, [userId]);

    useEffect(() => { loadConversations(true); }, [loadConversations]);

    const handleNewConversation = async () => {
        setShowHistory(false);
        setIsLoadingMessages(true);
        try {
            const res = await createConversationAction(userId);
            if (res.success && res.data) {
                setConversations(prev => [res.data, ...prev]);
                setActiveConversationId(res.data.id);
                setActiveConvTitle("Nueva Consulta");
                setInitialMessages([]);
            } else { toast.error("Error al crear conversación"); }
        } catch (e) { console.error(e); }
        setIsLoadingMessages(false);
    };

    const handleSelectConversation = async (id: string, title?: string) => {
        if (activeConversationId === id) { setShowHistory(false); return; }
        setShowHistory(false);
        setActiveConversationId(id);
        setActiveConvTitle(title || "Consulta técnica");
        setInitialMessages([]);
        setIsLoadingMessages(true);
        try {
            const res = await getConversationMessagesAction(id, userId);
            if (res.success && res.data) {
                const formatted: UIMessage[] = (res.data as CerebroDbMessage[]).map((m) => {
                    const parts: CerebroInitialPart[] = [{ type: "text", text: m.content || "" } as CerebroInitialPart];
                    if (m.mediaUrls?.length > 0)
                        m.mediaUrls.forEach((url: string) =>
                            parts.push({ type: "file", file: { url, name: "Imagen adjunta", type: "image/jpeg" } } as CerebroInitialPart));
                    return { id: m.id, role: toUiRole(m.role), parts };
                });
                setInitialMessages(formatted);
            }
        } catch { setInitialMessages([]); }
        setIsLoadingMessages(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const idToDelete = deleteId; setDeleteId(null);
        try {
            const res = await deleteConversationAction(idToDelete);
            if (res.success) {
                toast.success("Conversación eliminada");
                setConversations(prev => prev.filter(c => c.id !== idToDelete));
                if (activeConversationId === idToDelete) {
                    setActiveConversationId(null);
                    setInitialMessages([]);
                    setActiveConvTitle("Nueva Consulta");
                }
            } else { toast.error("Error al eliminar"); }
        } catch { toast.error("Error inesperado"); }
    };

    // Group conversations by date
    const todayConvs = conversations.filter(c => isToday(new Date(c.updatedAt)));
    const yesterdayConvs = conversations.filter(c => isYesterday(new Date(c.updatedAt)));
    const olderConvs = conversations.filter(c => !isToday(new Date(c.updatedAt)) && !isYesterday(new Date(c.updatedAt)));

    return (
        <div className="flex flex-col h-full overflow-hidden rounded-xl bg-[#0d1117] relative">

            {/* ── Global overlay when drawer is open ─ */}
            {(showHistory || showWiki) && (
                <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
                    onClick={() => { setShowHistory(false); setShowWiki(false); }} />
            )}

            {/* ══════════════════════════════════════════
                TOP NAV BAR
            ══════════════════════════════════════════ */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#161b22]/80 backdrop-blur-md shrink-0 z-20">

                {/* History button */}
                <button
                    onClick={() => { setShowHistory(h => !h); setShowWiki(false); }}
                    className={cn(
                        "flex items-center gap-2 px-3 h-9 rounded-lg border text-[13px] font-medium transition-all",
                        showHistory
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.08]"
                    )}
                >
                    <Clock size={14} />
                    <span className="hidden sm:inline">Historial</span>
                    <ChevronDown size={12} className={cn("transition-transform", showHistory && "rotate-180")} />
                </button>

                {/* Active conversation title */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
                    <span className="text-[13px] text-white/70 truncate font-medium">
                        {activeConversationId ? activeConvTitle : "Seleccioná o iniciá una consulta"}
                    </span>
                </div>

                {/* New conversation */}
                <button
                    onClick={handleNewConversation}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-semibold transition-all shadow-[0_0_16px_rgba(124,58,237,0.35)] active:scale-[0.97] shrink-0"
                >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Nuevo</span>
                </button>

                {/* Wiki button */}
                <button
                    onClick={() => { setShowWiki(w => !w); setShowHistory(false); }}
                    className={cn(
                        "flex items-center gap-2 px-3 h-9 rounded-lg border text-[13px] font-medium transition-all shrink-0",
                        showWiki
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.08]"
                    )}
                >
                    <BookOpen size={14} />
                    <span className="hidden sm:inline">Wiki</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════
                HISTORY DRAWER  (slides from left)
            ══════════════════════════════════════════ */}
            <div
                ref={historyRef}
                className={cn(
                    "absolute top-[53px] left-0 bottom-0 z-40 w-72 flex flex-col",
                    "bg-[#161b22] border-r border-white/[0.08] shadow-2xl",
                    "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    showHistory ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={15} className="text-violet-400" />
                        <span className="text-sm font-bold text-white/90">Conversaciones</span>
                        {conversations.length > 0 && (
                            <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full font-semibold">
                                {conversations.length}
                            </span>
                        )}
                    </div>
                    <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-all">
                        <X size={14} />
                    </button>
                </div>

                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-2 py-12">
                            <Loader2 size={18} className="animate-spin text-violet-400" />
                            <span className="text-xs text-white/40">Cargando...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
                            <MessageSquare size={28} className="text-white/10" />
                            <p className="text-sm text-white/40">Sin conversaciones aún</p>
                            <button onClick={handleNewConversation}
                                className="text-[12px] text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                                Empezar primera consulta
                            </button>
                        </div>
                    ) : (
                        <div className="p-2 space-y-4">
                            {[
                                { label: "Hoy", items: todayConvs },
                                { label: "Ayer", items: yesterdayConvs },
                                { label: "Anteriores", items: olderConvs },
                            ].map(({ label, items }) => items.length > 0 && (
                                <div key={label}>
                                    <div className="px-2 py-1 mb-1">
                                        <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">{label}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {items.map(conv => (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleSelectConversation(conv.id, conv.title ?? undefined)}
                                                className={cn(
                                                    "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                                                    activeConversationId === conv.id
                                                        ? "bg-violet-500/15 text-violet-200"
                                                        : "hover:bg-white/[0.05] text-white/60 hover:text-white/90"
                                                )}
                                            >
                                                {activeConversationId === conv.id && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-violet-400 rounded-r-full" />
                                                )}
                                                <MessageSquare size={12} className="shrink-0 opacity-60" />
                                                <span className="text-[12.5px] font-medium truncate flex-1 leading-tight">
                                                    {conv.title || "Nueva Conversación"}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-[10px] opacity-40">{formatConvDate(conv.updatedAt)}</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setDeleteId(conv.id); }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* ══════════════════════════════════════════
                WIKI DRAWER  (slides from right)
            ══════════════════════════════════════════ */}
            <div
                ref={wikiRef}
                className={cn(
                    "absolute top-[53px] right-0 bottom-0 z-40 w-80 xl:w-96 flex flex-col",
                    "bg-[#161b22] border-l border-white/[0.08] shadow-2xl",
                    "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    showWiki ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2">
                        <BookOpen size={15} className="text-emerald-400" />
                        <span className="text-sm font-bold text-white/90">Wiki Técnica</span>
                    </div>
                    <button onClick={() => setShowWiki(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-all">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    <KnowledgePanel
                        userId={userId}
                        initialContent={pendingKnowledgeContent}
                        onClearInitial={() => setPendingKnowledgeContent(null)}
                    />
                    {/* Schematics section — only for admins/technicians */}
                    {isAdmin && (
                        <div className="border-t border-white/[0.06] shrink-0">
                            <button
                                onClick={() => setShowSchematics(s => !s)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={13} className="text-violet-400" />
                                    <span className="text-[12px] font-semibold text-white/70">Biblioteca de Schematics</span>
                                </div>
                                <ChevronDown size={13} className={cn("text-white/30 transition-transform duration-200", showSchematics ? "rotate-180" : "")} />
                            </button>
                            {showSchematics && (
                                <div className="max-h-96 overflow-y-auto">
                                    <SchematicUploadPanel userId={userId} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════
                MAIN CHAT AREA  (full screen)
            ══════════════════════════════════════════ */}
            <div className="flex-1 min-h-0 relative">
                {/* Loading overlay */}
                {isLoadingMessages && (
                    <div className="absolute inset-0 z-50 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                            <span className="text-xs text-white/40">Cargando conversación...</span>
                        </div>
                    </div>
                )}

                {activeConversationId && !isLoadingMessages ? (
                    <CerebroChat
                        key={activeConversationId}
                        conversationId={activeConversationId}
                        initialMessages={initialMessages}
                    />
                ) : (
                    /* ── Empty state ─ */
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                        {/* Glow orb */}
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-violet-600/20 blur-[60px] rounded-full scale-[2]" />
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/30 to-violet-900/40 border border-violet-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.2)]">
                                <BrainCircuit size={36} className="text-violet-300" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white/90 mb-2 tracking-tight">
                            Cerebro AI
                        </h2>
                        <p className="text-white/40 text-sm max-w-sm mb-10 leading-relaxed">
                            Asistente de diagnóstico técnico con acceso al historial real de MACCELL, schematics y RAG vectorial.
                        </p>

                        {/* Quick start chips */}
                        <div className="w-full max-w-lg">
                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-3">Consultas frecuentes</p>
                            <div className="grid grid-cols-2 gap-2 mb-8">
                                {[
                                    { icon: "⚡", label: "No enciende", q: "El equipo no enciende. Fuente marca 0.00A." },
                                    { icon: "🔋", label: "No carga", q: "No carga, no detecta cable. Conector limpio." },
                                    { icon: "📺", label: "Pantalla negra", q: "Pantalla negra pero el equipo enciende (vibra)." },
                                    { icon: "📶", label: "Sin señal", q: "Sin señal de red, no detecta SIM." },
                                    { icon: "💧", label: "Daño por agua", q: "Equipo con daño por líquido. Síntomas:" },
                                    { icon: "🔄", label: "Bootloop", q: "El equipo reinicia constantemente (bootloop)." },
                                ].map(chip => (
                                    <button
                                        key={chip.label}
                                        onClick={async () => {
                                            const res = await createConversationAction(userId);
                                            if (res.success && res.data) {
                                                setConversations(prev => [res.data, ...prev]);
                                                setActiveConversationId(res.data.id);
                                                setActiveConvTitle(chip.label);
                                                setInitialMessages([]);
                                                // Dispatch custom event so CerebroChat picks up the prompt
                                                setTimeout(() => {
                                                    window.dispatchEvent(new CustomEvent("cerebro-quick-prompt", { detail: { prompt: chip.q } }));
                                                }, 300);
                                            }
                                        }}
                                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-left transition-all active:scale-[0.97] group"
                                    >
                                        <span className="text-lg leading-none">{chip.icon}</span>
                                        <span className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">{chip.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleNewConversation}
                                className="w-full h-11 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-semibold text-sm transition-all shadow-[0_0_24px_rgba(124,58,237,0.4)] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Zap size={16} />
                                Iniciar consulta libre
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[#161b22] border-white/[0.08] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Eliminar conversación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/50">
                            Esta acción no se puede deshacer. Se borrarán todos los mensajes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/[0.06] border-white/[0.08] text-white hover:bg-white/[0.10]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
