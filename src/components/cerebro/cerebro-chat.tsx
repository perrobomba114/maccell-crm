"use client";

import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot, Send, User, BrainCircuit, RefreshCw, X, FileIcon, Plus,
    Loader2, Paperclip, FileText, Microscope, Copy, Check,
    BookMarked, Zap, GraduationCap, ChevronDown, Wrench, Radio,
    Waves, Flame, Droplets, Shield
} from "lucide-react";
import { saveMessagesToDbAction, saveUserMessageAction, updateConversationTitleAction } from "@/actions/cerebro-actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ChatMode = "STANDARD" | "MENTOR" | "ACADEMY";

interface CerebroChatProps {
    conversationId: string;
    initialMessages?: UIMessage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick-start chips
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
    { icon: Zap,      label: "No enciende",     prompt: "El equipo no enciende. Fuente muestra 0.00A constante.", color: "text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10" },
    { icon: Radio,    label: "No carga",         prompt: "El dispositivo no carga. No detecta cable, conector visual limpio.", color: "text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10" },
    { icon: Waves,    label: "Pantalla negra",   prompt: "La pantalla no da imagen pero el equipo enciende (vibra y suena).", color: "text-violet-400 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10" },
    { icon: Shield,   label: "Sin señal",        prompt: "El dispositivo no tiene señal de red, no detecta SIM. Señal WiFi también afectada.", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10" },
    { icon: Droplets, label: "Mojado",           prompt: "El equipo ingresó en contacto con humedad/agua. Síntomas:", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10" },
    { icon: Flame,    label: "Reinicia solo",    prompt: "El equipo reinicia constantemente (bootloop). No logra completar el arranque.", color: "text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mode config
// ─────────────────────────────────────────────────────────────────────────────
const MODES: { id: ChatMode; label: string; icon: any; desc: string; color: string; activeBg: string }[] = [
    {
        id: "STANDARD",
        label: "Experto",
        icon: Wrench,
        desc: "Diagnóstico directo para técnicos avanzados",
        color: "text-violet-400",
        activeBg: "bg-violet-500/15 border-violet-500/50 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)]",
    },
    {
        id: "MENTOR",
        label: "Guiado",
        icon: Microscope,
        desc: "Una medición por turno, paso a paso",
        color: "text-emerald-400",
        activeBg: "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]",
    },
    {
        id: "ACADEMY",
        label: "Academia",
        icon: GraduationCap,
        desc: "Modo pedagógico para aprender la falla",
        color: "text-amber-400",
        activeBg: "bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 border-b border-slate-700/50 pb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-violet-200 mt-3 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2.5 mb-1 flex items-center gap-1.5">{children}</h3>,
                p: ({ children }) => <p className="text-[13.5px] text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1 my-2 ml-1 list-decimal list-inside">{children}</ol>,
                li: ({ children }) => (
                    <li className="text-[13px] text-slate-300 leading-relaxed flex gap-2 items-start">
                        <span className="text-violet-500 mt-1.5 shrink-0">▸</span>
                        <span>{children}</span>
                    </li>
                ),
                code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                        return (
                            <code className="block bg-slate-950 border border-slate-800 rounded-lg p-3 text-[12px] font-mono text-emerald-300 my-2 overflow-x-auto whitespace-pre">
                                {children}
                            </code>
                        );
                    }
                    return <code className="bg-slate-800 text-violet-300 px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>;
                },
                pre: ({ children }) => <div className="my-2">{children}</div>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-slate-400">{children}</em>,
                table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                        <table className="w-full text-xs border-collapse border border-slate-700/50 rounded-lg overflow-hidden">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="bg-slate-800 text-slate-300 font-semibold px-3 py-2 text-left border border-slate-700/50">{children}</th>,
                td: ({ children }) => <td className="px-3 py-1.5 text-slate-400 border border-slate-800/50">{children}</td>,
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-violet-500/50 pl-3 py-1 my-2 text-slate-400 italic bg-violet-500/5 rounded-r-md">
                        {children}
                    </blockquote>
                ),
                hr: () => <hr className="border-slate-800 my-3" />,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all">
                        {children}
                    </a>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message actions (copy, save wiki)
// ─────────────────────────────────────────────────────────────────────────────
function MessageActions({ content, onSaveWiki }: { content: string; onSaveWiki: (c: string) => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("No se pudo copiar al portapapeles");
        }
    }, [content]);

    return (
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all"
                title="Copiar respuesta"
            >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
            <button
                onClick={() => onSaveWiki(content)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
                title="Guardar en Wiki técnica"
            >
                <BookMarked size={11} />
                <span>Guardar Wiki</span>
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Token bar
// ─────────────────────────────────────────────────────────────────────────────
function TokenBar({ usage }: { usage: { used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null }) {
    if (!usage) return null;
    const color = usage.percentage >= 80 ? "bg-red-500" : usage.percentage >= 50 ? "bg-amber-500" : "bg-emerald-500";
    const textColor = usage.percentage >= 80 ? "text-red-400" : usage.percentage >= 50 ? "text-amber-400" : "text-emerald-400";
    return (
        <div className="flex items-center gap-2" title={`${usage.remaining.toLocaleString()} tokens restantes. Reset: ${usage.resetAt}`}>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${usage.percentage}%` }} />
            </div>
            <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${textColor}`}>
                {usage.remaining.toLocaleString()} tkn
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing stages indicator
// ─────────────────────────────────────────────────────────────────────────────
const TYPING_STAGES = [
    "Clasificando síntoma...",
    "Buscando en historial RAG...",
    "Analizando schematics...",
    "Generando diagnóstico...",
];

function TypingIndicator() {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        const timings = [800, 1800, 2800];
        const timers = timings.map((ms, i) =>
            setTimeout(() => setStage(i + 1), ms)
        );
        return () => timers.forEach(clearTimeout);
    }, []);
    return (
        <div className="flex gap-3 flex-row">
            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 bg-violet-600/80 shadow-violet-900 shadow-lg animate-pulse">
                <Bot size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-violet-900/30 rounded-tl-sm">
                <div className="flex items-center gap-2 text-violet-400 mb-1.5">
                    <RefreshCw size={12} className="animate-spin" />
                    <span className="text-[11px] font-semibold tracking-wide uppercase">{TYPING_STAGES[stage]}</span>
                </div>
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-violet-500/60 animate-bounce"
                            style={{ animationDelay: `${i * 120}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function CerebroChat({ conversationId, initialMessages = [] }: CerebroChatProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [tokenUsage, setTokenUsage] = useState<{ used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null>(null);
    const [mode, setMode] = useState<ChatMode>("STANDARD");
    const [atBottom, setAtBottom] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Token polling
    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/cerebro/tokens");
                if (res.ok) setTokenUsage(await res.json());
            } catch { }
        };
        fetch_();
        const interval = setInterval(fetch_, 30_000);
        return () => clearInterval(interval);
    }, []);

    const { messages, sendMessage, stop, status, error } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: "/api/cerebro/chat",
            body: { guidedMode: mode === "MENTOR" },
        }),
        onFinish: async ({ messages: allMessages }: any) => {
            try {
                if (allMessages?.length > 0) {
                    await saveMessagesToDbAction(conversationId, allMessages.map((m: any) => {
                        const textContent = m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || m.content || "";
                        const mediaUrls = m.parts?.filter((p: any) => p.type === "file").map((p: any) => p.url || p.file?.url || "").filter(Boolean) || [];
                        return { role: m.role as "user" | "assistant", content: textContent, mediaUrls };
                    }));
                    if (allMessages.length <= 2) {
                        const firstUser = allMessages.find((m: any) => m.role === "user");
                        if (firstUser) {
                            const raw = firstUser.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || firstUser.content || "";
                            const title = raw.substring(0, 40).trim() + (raw.length > 40 ? "..." : "");
                            if (title) await updateConversationTitleAction(conversationId, title);
                        }
                    }
                }
            } catch (err) { console.error("Error saving:", err); }
        },
        onError: (err: any) => {
            console.error("⛔ [CEREBRO_CLIENT_ERROR]:", err);
            toast.error("Error de conexión: " + (err.message || "Ver consola para detalles"));
        },
    } as any);

    const isLoading = status === "submitted" || status === "streaming";

    // Auto-scroll
    useEffect(() => {
        if (atBottom && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, status, atBottom]);

    const handleScroll = useCallback(() => {
        const vp = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
        if (!vp) return;
        const isNearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 80;
        setAtBottom(isNearBottom);
    }, []);

    // Auto-resize textarea
    const adjustTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    };

    const submit = async (text: string, extraFiles?: File[]) => {
        const currentFiles = extraFiles || files;
        if ((!text.trim() && currentFiles.length === 0) || isLoading) return;

        setInput("");
        setFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setAtBottom(true);

        const fileParts = await Promise.all(currentFiles.map(async (file) => {
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            return { type: "file" as const, filename: file.name, mediaType: file.type, url: dataUrl };
        }));

        const isFirstMessage = !initialMessages || initialMessages.length === 0;
        saveUserMessageAction(conversationId, text, fileParts.map(f => f.url), isFirstMessage)
            .catch(err => console.error("[onSubmit] Error saving user msg:", err));

        sendMessage({ text, files: fileParts.length > 0 ? fileParts : undefined });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submit(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(input);
        }
    };

    const handleSummarize = async () => {
        if (messages.length === 0) return;
        setIsSummarizing(true);
        try {
            const res = await fetch("/api/cerebro/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
            });
            const data = await res.json();
            if (res.ok && data.summary) {
                window.dispatchEvent(new CustomEvent("cerebro-save-wiki", { detail: { content: data.summary } }));
                toast.success("Resumen técnico generado correctamente.");
            } else {
                toast.error(data.error || "Error al generar el resumen.");
            }
        } catch {
            toast.error("Error de conexión al resumir.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };

    const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

    const saveToWiki = (content: string) => {
        window.dispatchEvent(new CustomEvent("cerebro-save-wiki", { detail: { content } }));
    };

    const activeMode = MODES.find(m => m.id === mode)!;

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col border-b border-slate-800 bg-slate-950/80 shrink-0 backdrop-blur-md">
                {/* Row 1: logo + mode badge + tokens */}
                <div className="flex items-center px-4 py-2.5 gap-3">
                    <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 shrink-0">
                        <BrainCircuit size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-bold text-sm leading-tight">Cerebro AI</h2>
                        <p className="text-violet-300/60 text-[10px] leading-tight">BD MACCELL</p>
                    </div>
                    {/* Active mode badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${activeMode.activeBg}`}>
                        <activeMode.icon size={11} />
                        <span>{activeMode.label}</span>
                    </div>
                    <TokenBar usage={tokenUsage} />
                </div>

                {/* Row 2: mode selector */}
                <div className="flex items-center gap-2 px-4 pb-2.5">
                    {MODES.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            title={m.desc}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 border flex-1 justify-center ${
                                mode === m.id
                                    ? m.activeBg
                                    : "bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                            }`}
                        >
                            <m.icon size={11} />
                            <span>{m.label}</span>
                        </button>
                    ))}
                    {messages.length > 1 && (
                        <button
                            onClick={handleSummarize}
                            disabled={isSummarizing || isLoading}
                            title="Resumir sesión y guardar en Wiki"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                            {isSummarizing ? <Loader2 size={11} className="animate-spin" /> : <BrainCircuit size={11} />}
                            <span>Resumir</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Chat Area ─────────────────────────────────────────────────── */}
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0" onScrollCapture={handleScroll}>
                <div className="p-4 space-y-5 pb-4 max-w-3xl mx-auto w-full">

                    {/* Welcome screen */}
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center pt-6 pb-4 gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full scale-150" />
                                <div className="relative p-5 rounded-2xl bg-slate-800/60 border border-violet-900/30 shadow-2xl shadow-violet-900/10">
                                    <BrainCircuit size={40} className="text-violet-400" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-100 mb-1">Asistente Técnico Disponible</h3>
                                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                                    Describí el síntoma y te daré un diagnóstico cruzado con el historial real de MACCELL.
                                </p>
                            </div>
                            {/* Quick start chips */}
                            <div className="w-full max-w-md">
                                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-2 text-center">Consultas frecuentes</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {QUICK_CHIPS.map((chip) => (
                                        <button
                                            key={chip.label}
                                            onClick={() => submit(chip.prompt)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-semibold text-left transition-all active:scale-[0.97] ${chip.color}`}
                                        >
                                            <chip.icon size={14} className="shrink-0" />
                                            <span>{chip.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Mode descriptions */}
                            <div className="w-full max-w-md bg-slate-800/30 rounded-2xl border border-slate-800 p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-3">Modos disponibles</p>
                                <div className="space-y-2">
                                    {MODES.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setMode(m.id)}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border text-left ${
                                                mode === m.id ? m.activeBg : "border-transparent hover:bg-slate-800/50 hover:border-slate-700"
                                            }`}
                                        >
                                            <div className={`p-1.5 rounded-md bg-slate-800 ${m.color}`}>
                                                <m.icon size={14} />
                                            </div>
                                            <div>
                                                <div className="text-[12px] font-bold text-slate-200">{m.label}</div>
                                                <div className="text-[11px] text-slate-500">{m.desc}</div>
                                            </div>
                                            {mode === m.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((message: any) => {
                        const isUser = message.role === "user";
                        let rawText = "";
                        if (message.parts?.length > 0) {
                            rawText = message.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
                        } else if (message.content) {
                            rawText = message.content;
                        }

                        // Strip <think> blocks from display
                        const thinkMatch = rawText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                        const hasThink = !!thinkMatch;
                        const thinkContent = hasThink ? thinkMatch![1].trim() : "";
                        const mainContent = rawText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim();

                        return (
                            <div
                                key={message.id}
                                className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                    isUser ? "bg-emerald-600 shadow-emerald-900 shadow-lg" : "bg-violet-600 shadow-violet-900 shadow-lg"
                                }`}>
                                    {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                                </div>

                                <div className={`flex flex-col max-w-[86%] ${isUser ? "items-end" : "items-start"}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                        isUser
                                            ? "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tr-sm"
                                            : "bg-slate-950/80 text-slate-300 border border-violet-900/30 rounded-tl-sm shadow-inner"
                                    }`}>
                                        <div className="flex flex-col gap-2">
                                            {/* Media attachments */}
                                            {(message.parts || []).map((part: any, index: number) => {
                                                if (part.type === "file" || part.type === "image") {
                                                    const fileObj = part.file || part;
                                                    const mediaType = fileObj.mediaType || fileObj.type || "";
                                                    const isImage = part.type === "image" || mediaType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileObj.name || fileObj.filename || "");
                                                    const fileUrl = fileObj.url || (fileObj.data ? `data:${mediaType};base64,${fileObj.data}` : "") || (part.image || "");
                                                    const fileName = fileObj.name || fileObj.filename || "Archivo adjunto";
                                                    return (
                                                        <div key={`media-${index}`} className="mt-1">
                                                            {isImage ? (
                                                                <img
                                                                    src={fileUrl}
                                                                    alt={fileName}
                                                                    onClick={() => { setSelectedImage(fileUrl); setZoom(1); }}
                                                                    className="max-w-full rounded-xl border border-slate-700 shadow-md cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                    style={{ maxHeight: "280px" }}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700 text-xs">
                                                                    <FileIcon size={14} className="text-slate-400" />
                                                                    <span className="truncate">{fileName}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}

                                            {/* Think block */}
                                            {hasThink && (
                                                <details className="mb-1 group/think" open={!rawText.includes("</think>")}>
                                                    <summary className="text-[11px] text-slate-500 font-medium cursor-pointer flex items-center gap-1.5 hover:text-slate-300 transition-colors select-none list-none">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${rawText.includes("</think>") ? "bg-emerald-500/50" : "bg-violet-500/80 animate-pulse"}`} />
                                                        {rawText.includes("</think>") ? "Ver análisis lógico" : "Analizando hardware..."}
                                                        <ChevronDown size={10} className="ml-0.5 transition-transform group-open/think:rotate-180" />
                                                    </summary>
                                                    <div className="mt-2 text-[11.5px] text-slate-500 border-l-2 border-violet-900/50 pl-3 py-1.5 bg-slate-950/30 rounded-r-md font-mono whitespace-pre-wrap">
                                                        {thinkContent}
                                                    </div>
                                                </details>
                                            )}

                                            {/* Main content */}
                                            {mainContent && (
                                                isUser
                                                    ? <div className="whitespace-pre-wrap text-[13.5px]">{mainContent}</div>
                                                    : <MarkdownContent content={mainContent} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Per-message actions for AI */}
                                    {!isUser && mainContent && (
                                        <MessageActions content={mainContent} onSaveWiki={saveToWiki} />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {isLoading && <TypingIndicator />}

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs">
                            Hubo un problema con la conexión. Reintentá en unos segundos.
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            {!atBottom && (
                <button
                    onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className="absolute bottom-24 right-4 z-20 p-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-900/40 transition-all"
                >
                    <ChevronDown size={16} />
                </button>
            )}

            {/* ── Input Area ────────────────────────────────────────────────── */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0 backdrop-blur-md">
                <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-3xl mx-auto">
                    {/* File previews */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
                            {files.map((file, i) => (
                                <div key={i} className="relative group shrink-0">
                                    {file.type.startsWith("image/") ? (
                                        <div className="w-14 h-14 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl border border-slate-700 bg-slate-800 flex flex-col items-center justify-center text-[10px] text-slate-400">
                                            <FileText size={18} className="mb-1 text-violet-400" />
                                            <span className="truncate w-full text-center px-1">PDF</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-900/80 text-red-200 hover:bg-red-600 hover:text-white rounded-full p-1 border border-red-500/30 shadow-lg transition-all z-10"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" />
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-violet-400 hover:bg-violet-600/10 hover:border-violet-500/50 transition-all flex items-center justify-center"
                        >
                            <Paperclip size={18} />
                        </button>

                        <div className="relative flex-1">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => { setInput(e.target.value); adjustTextarea(); }}
                                onKeyDown={handleKeyDown}
                                placeholder={`Describe el síntoma... (${activeMode.label})`}
                                rows={1}
                                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all resize-none placeholder:text-slate-600 leading-relaxed"
                                disabled={isLoading}
                                style={{ minHeight: "44px", maxHeight: "140px" }}
                            />
                            <div className="absolute right-1 bottom-1">
                                {isLoading ? (
                                    <button
                                        type="button"
                                        onClick={() => stop()}
                                        className="h-9 w-9 p-0 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center"
                                        title="Detener respuesta"
                                    >
                                        <X size={15} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isLoading || (!input.trim() && files.length === 0)}
                                        className="h-9 w-9 p-0 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all flex items-center justify-center disabled:cursor-not-allowed"
                                    >
                                        <Send size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-700 text-center">Enter para enviar · Shift+Enter para nueva línea · Adjuntá imágenes o PDFs de esquemáticos</p>
                </form>
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-5 right-5 p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors z-[110]"
                        onClick={e => { e.stopPropagation(); setSelectedImage(null); }}
                    >
                        <X size={20} />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
                        <img
                            src={selectedImage}
                            alt="Full screen preview"
                            className="max-w-full max-h-full object-contain transition-transform duration-300 shadow-2xl rounded-lg"
                            style={{ transform: `scale(${zoom})` }}
                            onClick={e => { e.stopPropagation(); setZoom(p => p === 1 ? 2 : 1); }}
                        />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-full backdrop-blur-sm shadow-xl">
                            <button onClick={e => { e.stopPropagation(); setZoom(p => Math.max(0.5, p - 0.5)); }} className="text-white hover:text-violet-400 font-bold px-2">−</button>
                            <span className="text-white text-xs font-mono min-w-[52px] text-center">{(zoom * 100).toFixed(0)}%</span>
                            <button onClick={e => { e.stopPropagation(); setZoom(p => Math.min(4, p + 0.5)); }} className="text-white hover:text-violet-400 font-bold px-2">+</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
