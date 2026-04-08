"use client";

import { useEffect, useState, useCallback } from "react";
import { CerebroChat } from "./cerebro-chat";
import { KnowledgePanel } from "./knowledge-panel";
import {
    getConversationsAction, createConversationAction,
    getConversationMessagesAction, deleteConversationAction
} from "@/actions/cerebro-actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MessageSquare, Plus, BrainCircuit, Loader2, Trash2,
    ChevronRight, BookOpen, X, PanelLeftClose, PanelLeftOpen,
    PanelRightClose, PanelRightOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UIMessage } from "@ai-sdk/react";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CerebroLayoutProps {
    userId: string;
}

export function CerebroLayout({ userId }: CerebroLayoutProps) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showKnowledge, setShowKnowledge] = useState(true);
    const [showHistory, setShowHistory] = useState(true);
    const [pendingKnowledgeContent, setPendingKnowledgeContent] = useState<string | null>(null);

    useEffect(() => {
        const handleSaveWiki = (e: Event) => {
            const customEvent = e as CustomEvent;
            setPendingKnowledgeContent(customEvent.detail.content);
            setShowKnowledge(true);
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
                    handleSelectConversation(res.data[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
        setIsLoading(false);
    }, [userId]);

    useEffect(() => { loadConversations(true); }, [loadConversations]);

    const handleNewConversation = async () => {
        setIsLoadingMessages(true);
        try {
            const res = await createConversationAction(userId);
            if (res.success && res.data) {
                setConversations(prev => [res.data, ...prev]);
                setActiveConversationId(res.data.id);
                setInitialMessages([]);
            } else {
                toast.error("Error al crear conversación: " + (res.error || "Desconocido"));
            }
        } catch (err) {
            console.error("Exception in handleNewConversation:", err);
        }
        setIsLoadingMessages(false);
    };

    const handleSelectConversation = async (id: string) => {
        if (activeConversationId === id) return;
        setActiveConversationId(id);
        setInitialMessages([]);
        setIsLoadingMessages(true);
        try {
            const res = await getConversationMessagesAction(id, userId);
            if (res.success && res.data) {
                const formatted: UIMessage[] = res.data.map((m: any) => {
                    const parts: any[] = [{ type: "text", text: m.content || "" }];
                    if (m.mediaUrls?.length > 0) {
                        m.mediaUrls.forEach((url: string) => {
                            parts.push({ type: "file", file: { url, name: "Imagen adjunta", type: "image/jpeg" } });
                        });
                    }
                    return { id: m.id, role: m.role as any, parts };
                });
                setInitialMessages(formatted);
            } else {
                setInitialMessages([]);
            }
        } catch {
            setInitialMessages([]);
        }
        setIsLoadingMessages(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const idToDelete = deleteId;
        setDeleteId(null);
        try {
            const res = await deleteConversationAction(idToDelete);
            if (res.success) {
                toast.success("Conversación eliminada");
                setConversations(prev => prev.filter(c => c.id !== idToDelete));
                if (activeConversationId === idToDelete) {
                    setActiveConversationId(null);
                    setInitialMessages([]);
                }
            } else {
                toast.error("Error al eliminar: " + res.error);
            }
        } catch {
            toast.error("Error inesperado al eliminar");
        }
    };

    return (
        <div className="flex h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/20 backdrop-blur-xl">
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            Esta acción no se puede deshacer. Se borrarán todos los mensajes de esta sesión de diagnóstico.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Sidebar Historial ──────────────────────────────────────── */}
            <div className={cn(
                "flex flex-col border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 shrink-0",
                showHistory ? "w-64 xl:w-72" : "w-0 overflow-hidden"
            )}>
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Header sidebar */}
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30 shrink-0">
                        <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm tracking-tight">
                            <div className="p-1 rounded-md bg-violet-500/10">
                                <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
                            </div>
                            Historial
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-violet-500/15 hover:text-violet-400 text-zinc-500 transition-all"
                                onClick={() => handleNewConversation()}
                                title="Nueva conversación"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 md:hidden transition-all"
                                onClick={() => setShowHistory(false)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        {isLoading ? (
                            <div className="p-8 flex flex-col items-center justify-center text-zinc-600 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">Cargando...</span>
                            </div>
                        ) : (
                            <div className="p-2 flex flex-col gap-1">
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 text-center">
                                        <MessageSquare className="w-6 h-6 opacity-30" />
                                        <span className="text-xs">Sin conversaciones</span>
                                        <button
                                            onClick={handleNewConversation}
                                            className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors underline underline-offset-2"
                                        >
                                            Crear primera consulta
                                        </button>
                                    </div>
                                ) : conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => { handleSelectConversation(conv.id); if (window.innerWidth < 768) setShowHistory(false); }}
                                        className={cn(
                                            "relative group flex flex-col gap-0.5 p-2.5 text-left w-full rounded-xl transition-all cursor-pointer border",
                                            activeConversationId === conv.id
                                                ? "bg-violet-500/10 border-violet-500/30 text-violet-100 shadow-[0_0_15px_-6px_rgba(139,92,246,0.4)]"
                                                : "hover:bg-zinc-800/50 text-zinc-400 border-transparent hover:border-zinc-700/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 w-full">
                                            <button
                                                type="button"
                                                className="h-5 w-5 flex items-center justify-center rounded shrink-0 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(conv.id); }}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                            <MessageSquare className={cn(
                                                "w-3 h-3 shrink-0 transition-colors",
                                                activeConversationId === conv.id ? "text-violet-400" : "text-zinc-700 group-hover:text-zinc-500"
                                            )} />
                                            <span className="font-semibold truncate text-[12px] flex-1 leading-tight">
                                                {conv.title || "Nueva Conversación"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pl-5">
                                            <span className="text-[10px] text-zinc-600">
                                                {format(new Date(conv.updatedAt), "d MMM, HH:mm", { locale: es })}
                                            </span>
                                            {activeConversationId === conv.id && (
                                                <ChevronRight className="w-3 h-3 text-violet-500/60" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* ── Chat Area ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col relative min-h-0">
                {/* Toolbar strip: toggle buttons */}
                <div className="absolute top-2 left-2 z-20 flex gap-1.5">
                    <button
                        onClick={() => setShowHistory(h => !h)}
                        title={showHistory ? "Cerrar historial" : "Abrir historial"}
                        className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all backdrop-blur-sm"
                    >
                        {showHistory ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                    </button>
                </div>
                <div className="absolute top-2 right-2 z-20 flex gap-1.5">
                    <button
                        onClick={() => setShowKnowledge(k => !k)}
                        title={showKnowledge ? "Cerrar Wiki" : "Abrir Wiki técnica"}
                        className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 hover:border-emerald-500/30 transition-all backdrop-blur-sm"
                    >
                        {showKnowledge ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    </button>
                </div>

                {/* Loading overlay */}
                {isLoadingMessages && (
                    <div className="absolute inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                            <span className="text-xs text-zinc-400 font-medium">Cargando conversación...</span>
                        </div>
                    </div>
                )}

                {activeConversationId && !isLoadingMessages ? (
                    <CerebroChat
                        key={activeConversationId}
                        conversationId={activeConversationId}
                        initialMessages={initialMessages}
                    />
                ) : !activeConversationId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-950/20 h-full">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-violet-500/15 blur-3xl rounded-full scale-150" />
                            <div className="relative p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                                <BrainCircuit className="w-10 h-10 text-violet-500/60" />
                            </div>
                        </div>
                        <h3 className="text-zinc-200 font-bold mb-2 text-lg">Cerebro de MACCELL</h3>
                        <p className="max-w-xs text-sm text-zinc-500 mb-6 leading-relaxed">
                            Seleccioná una conversación del historial o iniciá una nueva consulta técnica.
                        </p>
                        <Button
                            className="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/30 px-6 h-10 text-sm font-bold transition-all active:scale-95"
                            onClick={handleNewConversation}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Consulta Técnica
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* ── Panel Wiki (siempre visible en desktop, colapsable) ────── */}
            <div className={cn(
                "flex flex-col border-l border-zinc-800 bg-zinc-900/40 transition-all duration-300 shrink-0 overflow-hidden",
                showKnowledge ? "w-72 xl:w-80" : "w-0"
            )}>
                <KnowledgePanel
                    userId={userId}
                    initialContent={pendingKnowledgeContent}
                    onClearInitial={() => setPendingKnowledgeContent(null)}
                />
            </div>
        </div>
    );
}
