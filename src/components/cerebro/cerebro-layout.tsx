"use client";

import { useEffect, useState, useCallback } from "react";
import { CerebroChat } from "./cerebro-chat";
import { KnowledgePanel } from "./knowledge-panel";
import { getConversationsAction, createConversationAction, getConversationMessagesAction, deleteConversationAction } from "@/actions/cerebro-actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, BrainCircuit, Loader2, Trash2, ChevronRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UIMessage } from "@ai-sdk/react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
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
    const [showKnowledge, setShowKnowledge] = useState(false);
    const [pendingKnowledgeContent, setPendingKnowledgeContent] = useState<string | null>(null);

    useEffect(() => {
        const handleSaveWiki = (e: Event) => {
            const customEvent = e as CustomEvent;
            setPendingKnowledgeContent(customEvent.detail.content);
            setShowKnowledge(true);
        };
        window.addEventListener('cerebro-save-wiki', handleSaveWiki);
        return () => window.removeEventListener('cerebro-save-wiki', handleSaveWiki);
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
                // Eliminamos la auto-creación automática para evitar confusión tras eliminar
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
        setIsLoading(false);
    }, [userId]);

    useEffect(() => {
        loadConversations(true);
    }, [loadConversations]);

    const handleNewConversation = async () => {
        setIsLoadingMessages(true);
        try {
            const res = await createConversationAction(userId);
            if (res.success && res.data) {
                setConversations(prev => [res.data, ...prev]);
                setActiveConversationId(res.data.id);
                setInitialMessages([]);
            } else {
                alert("Error al crear conversación: " + (res.error || "Desconocido"));
            }
        } catch (err) {
            console.error("Exception in handleNewConversation:", err);
        }
        setIsLoadingMessages(false);
    };

    const handleSelectConversation = async (id: string) => {
        if (activeConversationId === id) return;

        setActiveConversationId(id);
        setInitialMessages([]); // Reset messages immediately to avoid showing old ones
        setIsLoadingMessages(true);
        try {
            const res = await getConversationMessagesAction(id, userId);
            if (res.success && res.data) {
                const formatted: UIMessage[] = res.data.map((m: any) => {
                    const parts: any[] = [{ type: 'text', text: m.content || "" }];

                    // Reconstruir partes de imagen si existen
                    if (m.mediaUrls && m.mediaUrls.length > 0) {
                        m.mediaUrls.forEach((url: string) => {
                            parts.push({
                                type: 'file',
                                file: {
                                    url: url,
                                    name: 'Imagen adjunta',
                                    type: 'image/jpeg'
                                }
                            });
                        });
                    }

                    return {
                        id: m.id,
                        role: m.role as any,
                        parts
                    };
                });
                setInitialMessages(formatted);
            } else {
                console.error("Error loading messages:", res.error);
                setInitialMessages([]);
            }
        } catch (err) {
            console.error("Exception loading messages:", err);
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
        } catch (err) {
            console.error("Exception in confirmDelete:", err);
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
            {/* Sidebar Historial */}
            <div className="w-80 border-r border-zinc-800 bg-zinc-900/40 flex flex-col hidden md:flex shrink-0">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                    <div className="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight">
                        <div className="p-1.5 rounded-lg bg-violet-500/10">
                            <BrainCircuit className="w-4 h-4 text-violet-500" />
                        </div>
                        Historial Cerebro
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-violet-500/20 hover:text-violet-400 text-zinc-400 transition-colors"
                        onClick={handleNewConversation}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="p-8 flex flex-col items-center justify-center text-zinc-600 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-xs">Cargando...</span>
                        </div>
                    ) : (
                        <div className="p-2 flex flex-col gap-1.5">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv.id)}
                                    className={`relative group flex items-start flex-col gap-1 p-3 text-left w-full rounded-xl transition-all cursor-pointer border ${activeConversationId === conv.id
                                        ? "bg-violet-500/10 border-violet-500/30 text-violet-100 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                                        : "hover:bg-zinc-800/50 text-zinc-400 border-transparent hover:border-zinc-700/50"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeConversationId === conv.id ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                                        <span className="font-medium truncate text-[13px] flex-1">
                                            {conv.title || "Nueva Conversación"}
                                        </span>
                                        <button
                                            type="button"
                                            className="h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteId(conv.id);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between w-full mt-1 px-5">
                                        <span className="text-[10px] text-zinc-500">
                                            {format(new Date(conv.updatedAt), "d MMM, HH:mm", { locale: es })}
                                        </span>
                                        {activeConversationId === conv.id && (
                                            <ChevronRight className="w-3 h-3 text-violet-500/50" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Area de Chat */}
            <div className="flex-1 flex flex-col relative min-h-0 bg-slate-900/50">
                {/* Botón flotante para abrir Knowledge Panel en móvil o cuando está cerrado */}
                {!showKnowledge && (
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setShowKnowledge(true)}
                        className="absolute top-4 right-4 z-30 h-10 w-10 rounded-full shadow-lg border border-zinc-700 bg-zinc-900/80 backdrop-blur hover:bg-zinc-800 transition-all hover:scale-105"
                    >
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                    </Button>
                )}

                {isLoadingMessages ? (
                    <div className="absolute inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                            <span className="text-xs text-zinc-400 font-medium">Sincronizando mensajes...</span>
                        </div>
                    </div>
                ) : null}

                {(activeConversationId && !isLoadingMessages) ? (
                    <CerebroChat
                        key={activeConversationId}
                        conversationId={activeConversationId}
                        initialMessages={initialMessages}
                    />
                ) : activeConversationId ? (
                    <div className="flex-1 flex items-center justify-center bg-slate-900/50">
                        {/* El loader ya se muestra arriba por el overlay, pero aquí evitamos montar el chat con datos viejos */}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-950/20">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full"></div>
                            <BrainCircuit className="w-16 h-16 text-zinc-800 relative z-10" />
                        </div>
                        <h3 className="text-zinc-200 font-semibold mb-2">Cerebro de MACCELL</h3>
                        <p className="max-w-xs text-sm text-zinc-500 mb-6 leading-relaxed">
                            Seleccioná una conversación del historial o creá una nueva para obtener asistencia técnica avanzada.
                        </p>
                        <Button className="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/20 px-6 py-5 h-auto text-sm font-bold" onClick={handleNewConversation}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Conversación técnica
                        </Button>
                    </div>
                )}
            </div>

            {/* Panel de Conocimiento (Wiki) */}
            {showKnowledge && (
                <div className="fixed inset-0 z-50 md:relative md:inset-auto animate-in slide-in-from-right duration-300 bg-zinc-950/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none flex justify-end">
                    <div className="w-full md:w-auto h-full flex flex-col items-end">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setShowKnowledge(false)}
                            className="absolute top-4 left-4 md:-left-5 z-[60] h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                        >
                            <ChevronRight className="w-5 h-5 md:rotate-0 rotate-180" />
                        </Button>
                        <KnowledgePanel
                            userId={userId}
                            initialContent={pendingKnowledgeContent}
                            onClearInitial={() => setPendingKnowledgeContent(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
