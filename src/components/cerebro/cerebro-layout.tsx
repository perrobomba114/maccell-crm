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
    ChevronRight, X, PanelLeftClose, PanelLeftOpen,
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

interface CerebroLayoutProps { userId: string; }

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
            const ev = e as CustomEvent;
            setPendingKnowledgeContent(ev.detail.content);
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
                if (selectFirst && res.data.length > 0) handleSelectConversation(res.data[0].id);
            }
        } catch (e) { console.error(e); }
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
            } else { toast.error("Error al crear conversación: " + (res.error || "Desconocido")); }
        } catch (e) { console.error(e); }
        setIsLoadingMessages(false);
    };

    const handleSelectConversation = async (id: string) => {
        if (activeConversationId === id) return;
        setActiveConversationId(id); setInitialMessages([]); setIsLoadingMessages(true);
        try {
            const res = await getConversationMessagesAction(id, userId);
            if (res.success && res.data) {
                const formatted: UIMessage[] = res.data.map((m: any) => {
                    const parts: any[] = [{ type: "text", text: m.content || "" }];
                    if (m.mediaUrls?.length > 0) m.mediaUrls.forEach((url: string) => parts.push({ type: "file", file: { url, name: "Imagen adjunta", type: "image/jpeg" } }));
                    return { id: m.id, role: m.role as any, parts };
                });
                setInitialMessages(formatted);
            } else { setInitialMessages([]); }
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
                if (activeConversationId === idToDelete) { setActiveConversationId(null); setInitialMessages([]); }
            } else { toast.error("Error al eliminar: " + res.error); }
        } catch { toast.error("Error inesperado al eliminar"); }
    };

    return (
        <div className="flex h-full rounded-2xl overflow-hidden border border-[#4a4455]/30 bg-[#0b1326]">
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[#171f33] border-[#4a4455]/40 text-[#dae2fd]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-[family-name:var(--font-space-grotesk)]">¿Eliminar conversación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#958da1] font-[family-name:var(--font-manrope)]">
                            Esta acción no se puede deshacer. Se borrarán todos los mensajes de esta sesión.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#2d3449] border-[#4a4455]/40 hover:bg-[#31394d] text-[#dae2fd] font-[family-name:var(--font-manrope)]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white font-[family-name:var(--font-manrope)]">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Sidebar Historial ──────────────────────────────────────── */}
            <div className={cn(
                "flex flex-col border-r border-[#4a4455]/30 bg-[#131b2e] transition-all duration-300 shrink-0 overflow-hidden",
                showHistory ? "w-64 xl:w-72" : "w-0"
            )}>
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="p-3 border-b border-[#4a4455]/30 flex items-center justify-between bg-[#131b2e]/60 shrink-0">
                        <div className="flex items-center gap-2 font-semibold text-sm tracking-tight">
                            <div className="p-1 rounded-md bg-[#7c3aed]/15">
                                <BrainCircuit className="w-3.5 h-3.5 text-[#d2bbff]" />
                            </div>
                            <span className="font-[family-name:var(--font-space-grotesk)] text-[#dae2fd]">Historial</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-[#7c3aed]/15 hover:text-[#d2bbff] text-[#958da1] transition-all"
                                onClick={handleNewConversation} title="Nueva conversación">
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-[#222a3d] text-[#4a4455] hover:text-[#958da1] md:hidden transition-all"
                                onClick={() => setShowHistory(false)}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        {isLoading ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-[#7c3aed]" />
                                <span className="text-xs text-[#958da1] font-[family-name:var(--font-manrope)]">Cargando...</span>
                            </div>
                        ) : (
                            <div className="p-2 flex flex-col gap-1">
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                                        <MessageSquare className="w-6 h-6 text-[#4a4455]" />
                                        <span className="text-xs text-[#958da1] font-[family-name:var(--font-manrope)]">Sin conversaciones</span>
                                        <button onClick={handleNewConversation}
                                            className="text-[11px] text-[#d2bbff] hover:text-[#7c3aed] transition-colors underline underline-offset-2 font-[family-name:var(--font-manrope)]">
                                            Crear primera consulta
                                        </button>
                                    </div>
                                ) : conversations.map((conv) => (
                                    <div key={conv.id}
                                        onClick={() => { handleSelectConversation(conv.id); if (window.innerWidth < 768) setShowHistory(false); }}
                                        className={cn(
                                            "relative group flex flex-col gap-0.5 p-2.5 text-left w-full rounded-xl transition-all cursor-pointer border",
                                            activeConversationId === conv.id
                                                ? "bg-[#7c3aed]/15 border-[#7c3aed]/40 shadow-[0_0_15px_-6px_rgba(124,58,237,0.5)]"
                                                : "hover:bg-[#171f33] border-transparent hover:border-[#4a4455]/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 w-full">
                                            <button type="button"
                                                className="h-5 w-5 flex items-center justify-center rounded shrink-0 text-[#4a4455] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(conv.id); }}>
                                                <Trash2 size={11} />
                                            </button>
                                            <MessageSquare className={cn("w-3 h-3 shrink-0 transition-colors",
                                                activeConversationId === conv.id ? "text-[#d2bbff]" : "text-[#4a4455] group-hover:text-[#958da1]"
                                            )} />
                                            <span className="font-[family-name:var(--font-manrope)] font-semibold truncate text-[12px] flex-1 leading-tight text-[#dae2fd]">
                                                {conv.title || "Nueva Conversación"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pl-5">
                                            <span className="text-[10px] text-[#4a4455] font-[family-name:var(--font-manrope)]">
                                                {format(new Date(conv.updatedAt), "d MMM, HH:mm", { locale: es })}
                                            </span>
                                            {activeConversationId === conv.id && <ChevronRight className="w-3 h-3 text-[#7c3aed]/60" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* ── Chat Area ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col relative min-h-0 bg-[#0b1326]">
                {/* Panel toggles */}
                <div className="absolute top-2 left-2 z-20">
                    <button onClick={() => setShowHistory(h => !h)} title={showHistory ? "Cerrar historial" : "Abrir historial"}
                        className="p-1.5 rounded-lg bg-[#171f33]/80 border border-[#4a4455]/30 text-[#958da1] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-all backdrop-blur-sm">
                        {showHistory ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                    </button>
                </div>
                <div className="absolute top-2 right-2 z-20">
                    <button onClick={() => setShowKnowledge(k => !k)} title={showKnowledge ? "Cerrar Wiki" : "Abrir Wiki técnica"}
                        className="p-1.5 rounded-lg bg-[#171f33]/80 border border-[#4a4455]/30 text-[#958da1] hover:text-[#4edea3] hover:bg-[#4edea3]/10 hover:border-[#4edea3]/30 transition-all backdrop-blur-sm">
                        {showKnowledge ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    </button>
                </div>

                {/* Loading overlay */}
                {isLoadingMessages && (
                    <div className="absolute inset-0 z-50 bg-[#0b1326]/70 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-[#7c3aed]" />
                            <span className="text-xs text-[#958da1] font-[family-name:var(--font-manrope)]">Cargando conversación...</span>
                        </div>
                    </div>
                )}

                {activeConversationId && !isLoadingMessages ? (
                    <CerebroChat key={activeConversationId} conversationId={activeConversationId} initialMessages={initialMessages} />
                ) : !activeConversationId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-[#7c3aed]/15 blur-3xl rounded-full scale-150" />
                            <div className="relative p-5 rounded-2xl bg-[#171f33] border border-[#7c3aed]/20 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                                <BrainCircuit className="w-10 h-10 text-[#d2bbff] drop-shadow-[0_0_12px_rgba(210,187,255,0.5)]" />
                            </div>
                        </div>
                        <h3 className="font-[family-name:var(--font-space-grotesk)] text-[#dae2fd] font-bold mb-2 text-lg tracking-tight">Cerebro de MACCELL</h3>
                        <p className="max-w-xs text-sm text-[#958da1] mb-6 leading-relaxed font-[family-name:var(--font-manrope)]">
                            Seleccioná una conversación del historial o iniciá una nueva consulta técnica.
                        </p>
                        <Button
                            onClick={handleNewConversation}
                            className="bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] px-6 h-10 text-sm font-bold font-[family-name:var(--font-manrope)] transition-all active:scale-95 border-0"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Consulta Técnica
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* ── Wiki Panel ────────────────────────────────────────────── */}
            <div className={cn(
                "flex flex-col border-l border-[#4a4455]/30 bg-[#131b2e] transition-all duration-300 shrink-0 overflow-hidden",
                showKnowledge ? "w-72 xl:w-80" : "w-0"
            )}>
                <KnowledgePanel userId={userId} initialContent={pendingKnowledgeContent} onClearInitial={() => setPendingKnowledgeContent(null)} />
            </div>
        </div>
    );
}
