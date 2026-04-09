"use client";

import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot, Send, User, BrainCircuit, RefreshCw, X, FileIcon, Plus,
    Loader2, Paperclip, FileText, Microscope, Copy, Check,
    BookMarked, Zap, ChevronDown, Wrench, Radio,
    Waves, Flame, Droplets, Shield
} from "lucide-react";
import { saveMessagesToDbAction, saveUserMessageAction, updateConversationTitleAction } from "@/actions/cerebro-actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ──────────────────────────────────────────────────────────────────
type ChatMode = "STANDARD" | "MENTOR";
interface CerebroChatProps { conversationId: string; initialMessages?: UIMessage[]; }

// ─── Stitch Obsidian Tokens ──────────────────────────────────────────────────
// surface:              #0b1326
// surface_container:    #171f33
// surface_container_h:  #222a3d
// surface_container_hh: #2d3449
// surface_container_l:  #131b2e
// surface_container_ll: #060e20
// surface_bright:       #31394d
// primary:              #d2bbff  (text on dark)
// primary_container:    #7c3aed  (violet CTA bg)
// secondary:            #4edea3  (emerald)
// secondary_container:  #00a572
// tertiary:             #ffb95f  (amber)
// on_surface:           #dae2fd
// on_surface_variant:   #ccc3d8
// outline:              #958da1
// outline_variant:      #4a4455

// ─── Quick chips ─────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
    { icon: Zap,      label: "No enciende",   prompt: "El equipo no enciende. Fuente muestra 0.00A constante.",                          color: "bg-[#2a1f00]/60 border-[#ffb95f]/30 text-[#ffb95f] hover:bg-[#ffb95f]/15" },
    { icon: Radio,    label: "No carga",      prompt: "El dispositivo no carga. No detecta cable, conector visual limpio.",             color: "bg-[#001933]/60 border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/10" },
    { icon: Waves,    label: "Pantalla negra",prompt: "La pantalla no da imagen pero el equipo enciende (vibra y suena).",              color: "bg-[#1a0f33]/60 border-[#d2bbff]/30 text-[#d2bbff] hover:bg-[#d2bbff]/10" },
    { icon: Shield,   label: "Sin señal",     prompt: "El dispositivo no tiene señal de red, no detecta SIM.",                          color: "bg-[#001a0f]/60 border-[#4edea3]/40 text-[#4edea3] hover:bg-[#4edea3]/10" },
    { icon: Droplets, label: "Mojado",        prompt: "El equipo ingresó en contacto con humedad/agua. Síntomas:",                      color: "bg-[#001a2e]/60 border-[#38bdf8]/30 text-[#38bdf8] hover:bg-[#38bdf8]/10" },
    { icon: Flame,    label: "Reinicia solo", prompt: "El equipo reinicia constantemente (bootloop). No logra completar el arranque.", color: "bg-[#2a0a00]/60 border-[#fb923c]/30 text-[#fb923c] hover:bg-[#fb923c]/10" },
];

// ─── Mode config ─────────────────────────────────────────────────────────────
const MODES: { id: ChatMode; label: string; icon: any; desc: string; activeBg: string; dotColor: string }[] = [
    { id: "STANDARD", label: "Directo",  icon: Wrench,     desc: "Recibís el diagnóstico completo en una sola respuesta: análisis diferencial, protocolo de medición y acción.", activeBg: "bg-[#7c3aed]/20 border-[#7c3aed]/60 text-[#d2bbff] shadow-[0_0_14px_rgba(124,58,237,0.3)]", dotColor: "bg-[#7c3aed]" },
    { id: "MENTOR",   label: "Guiado",   icon: Microscope, desc: "El AI te pide una sola medición por turno y va adaptando el diagnóstico en tiempo real según lo que reportás.", activeBg: "bg-[#4edea3]/15 border-[#4edea3]/50 text-[#4edea3] shadow-[0_0_14px_rgba(78,222,163,0.25)]", dotColor: "bg-[#4edea3]" },
];

// ─── Markdown renderer (Stitch tokens) ───────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => <h1 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#dae2fd] mt-3 mb-1.5 pb-1 border-b border-[#4a4455]/40">{children}</h1>,
                h2: ({ children }) => <h2 className="font-[family-name:var(--font-space-grotesk)] text-[13px] font-bold text-[#d2bbff] mt-3 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="font-[family-name:var(--font-space-grotesk)] text-[12.5px] font-semibold text-[#ccc3d8] mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="font-[family-name:var(--font-manrope)] text-[13px] text-[#ccc3d8] leading-relaxed mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-1 my-2 list-decimal list-inside">{children}</ol>,
                li: ({ children }) => (
                    <li className="text-[12.5px] text-[#ccc3d8] leading-relaxed flex gap-2 items-start font-[family-name:var(--font-manrope)]">
                        <span className="text-[#7c3aed] mt-[5px] shrink-0 text-[8px]">▸</span>
                        <span>{children}</span>
                    </li>
                ),
                code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) return (
                        <code className="block bg-[#060e20] border border-[#4a4455]/50 rounded-lg p-3 text-[11.5px] font-mono text-[#4edea3] my-2 overflow-x-auto whitespace-pre">
                            {children}
                        </code>
                    );
                    return <code className="bg-[#2d3449] text-[#d2bbff] px-1.5 py-0.5 rounded text-[11.5px] font-mono">{children}</code>;
                },
                pre: ({ children }) => <div className="my-2">{children}</div>,
                strong: ({ children }) => <strong className="font-bold text-[#dae2fd]">{children}</strong>,
                em: ({ children }) => <em className="italic text-[#958da1]">{children}</em>,
                table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                        <table className="w-full text-xs border-collapse border border-[#4a4455]/40 rounded-lg overflow-hidden">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="bg-[#2d3449] text-[#ccc3d8] font-semibold px-3 py-2 text-left border border-[#4a4455]/40">{children}</th>,
                td: ({ children }) => <td className="px-3 py-1.5 text-[#958da1] border border-[#4a4455]/20">{children}</td>,
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[#7c3aed]/50 pl-3 py-1 my-2 text-[#958da1] italic bg-[#7c3aed]/5 rounded-r-md">
                        {children}
                    </blockquote>
                ),
                hr: () => <hr className="border-[#4a4455]/40 my-3" />,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#d2bbff] hover:text-[#7c3aed] underline underline-offset-2 break-all">
                        {children}
                    </a>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

// ─── Per-message actions ──────────────────────────────────────────────────────
function MessageActions({ content, onSaveWiki }: { content: string; onSaveWiki: (c: string) => void }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(async () => {
        try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch { toast.error("No se pudo copiar"); }
    }, [content]);
    return (
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#958da1] hover:text-[#dae2fd] hover:bg-[#2d3449] transition-all">
                {copied ? <Check size={11} className="text-[#4edea3]" /> : <Copy size={11} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
            <button onClick={() => onSaveWiki(content)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#958da1] hover:text-[#4edea3] hover:bg-[#4edea3]/10 transition-all">
                <BookMarked size={11} />
                <span>Guardar Wiki</span>
            </button>
        </div>
    );
}

// ─── Token bar ────────────────────────────────────────────────────────────────
function TokenBar({ usage }: { usage: { used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null }) {
    if (!usage) return null;
    const color = usage.percentage >= 80 ? "bg-red-500" : usage.percentage >= 50 ? "bg-[#ffb95f]" : "bg-[#4edea3]";
    const textColor = usage.percentage >= 80 ? "text-red-400" : usage.percentage >= 50 ? "text-[#ffb95f]" : "text-[#4edea3]";
    return (
        <div className="flex items-center gap-2" title={`${usage.remaining.toLocaleString()} tokens restantes`}>
            <div className="w-16 h-1 bg-[#060e20] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${usage.percentage}%` }} />
            </div>
            <span className={`text-[10px] font-bold tabular-nums whitespace-nowrap font-[family-name:var(--font-manrope)] tracking-wide ${textColor}`}>
                {usage.remaining.toLocaleString()} tkn
            </span>
        </div>
    );
}

// ─── Typing stages ────────────────────────────────────────────────────────────
const TYPING_STAGES = ["Clasificando síntoma...", "Buscando en RAG...", "Analizando schematics...", "Generando diagnóstico..."];
function TypingIndicator() {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        const timers = [800, 1800, 2800].map((ms, i) => setTimeout(() => setStage(i + 1), ms));
        return () => timers.forEach(clearTimeout);
    }, []);
    return (
        <div className="flex gap-3">
            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 bg-[#7c3aed] shadow-[0_0_12px_rgba(124,58,237,0.5)] animate-pulse">
                <Bot size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#171f33] border border-[#7c3aed]/20">
                <div className="flex items-center gap-2 text-[#d2bbff] mb-1.5">
                    <RefreshCw size={12} className="animate-spin" />
                    <span className="text-[11px] font-semibold tracking-widest uppercase font-[family-name:var(--font-manrope)]">{TYPING_STAGES[stage]}</span>
                </div>
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]/60 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CerebroChat({ conversationId, initialMessages = [] }: CerebroChatProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [tokenUsage, setTokenUsage] = useState<{ used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null>(null);
    const [mode, setMode] = useState<ChatMode>("STANDARD");
    const [brand, setBrand] = useState("Auto");
    const [model, setModel] = useState("");
    const [atBottom, setAtBottom] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const fetch_ = async () => { try { const res = await fetch("/api/cerebro/tokens"); if (res.ok) setTokenUsage(await res.json()); } catch { } };
        fetch_(); const interval = setInterval(fetch_, 30_000); return () => clearInterval(interval);
    }, []);

    // Quick prompt from landing chips
    useEffect(() => {
        const handler = (e: Event) => {
            const ev = e as CustomEvent;
            if (ev.detail?.prompt) {
                setInput(ev.detail.prompt);
                setTimeout(() => textareaRef.current?.focus(), 100);
            }
        };
        window.addEventListener("cerebro-quick-prompt", handler);
        return () => window.removeEventListener("cerebro-quick-prompt", handler);
    }, []);

    const { messages, sendMessage, stop, status, error } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport: new DefaultChatTransport({ 
            api: "/api/cerebro/chat", 
            body: { 
                guidedMode: mode === "MENTOR",
                deviceContext: { brand, model }
            } 
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
        onError: (err: any) => { console.error("⛔ [CEREBRO_CLIENT_ERROR]:", err); toast.error("Error de conexión: " + (err.message || "Ver consola")); },
    } as any);

    const isLoading = status === "submitted" || status === "streaming";

    useEffect(() => { if (atBottom && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, status, atBottom]);

    const handleScroll = useCallback(() => {
        const vp = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
        if (!vp) return;
        setAtBottom(vp.scrollHeight - vp.scrollTop - vp.clientHeight < 80);
    }, []);

    const adjustTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    };

    const submit = async (text: string, extraFiles?: File[]) => {
        const currentFiles = extraFiles || files;
        if ((!text.trim() && currentFiles.length === 0) || isLoading) return;
        setInput(""); setFiles([]); if (textareaRef.current) textareaRef.current.style.height = "auto"; setAtBottom(true);
        const fileParts = await Promise.all(currentFiles.map(async (file) => {
            const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(file); });
            return { type: "file" as const, filename: file.name, mediaType: file.type, url: dataUrl };
        }));
        saveUserMessageAction(conversationId, text, fileParts.map(f => f.url), !initialMessages?.length).catch(console.error);
        sendMessage({ text, files: fileParts.length > 0 ? fileParts : undefined });
    };

    const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(input); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); };
    const removeFile = (i: number) => setFiles(prev => prev.filter((_, j) => i !== j));
    const saveToWiki = (content: string) => window.dispatchEvent(new CustomEvent("cerebro-save-wiki", { detail: { content } }));

    const handleSummarize = async () => {
        if (messages.length === 0) return;
        setIsSummarizing(true);
        try {
            const res = await fetch("/api/cerebro/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
            const data = await res.json();
            if (res.ok && data.summary) { saveToWiki(data.summary); toast.success("Resumen técnico generado."); }
            else toast.error(data.error || "Error al resumir.");
        } catch { toast.error("Error de conexión al resumir."); } finally { setIsSummarizing(false); }
    };

    const activeMode = MODES.find(m => m.id === mode)!;

    return (
        <div className="flex flex-col h-full overflow-hidden relative bg-[#0d1117]">

            {/* ── Header: Context Picker & Tokens ────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#161b22]/90 backdrop-blur-md shrink-0">
                
                {/* Device Context */}
                <div className="flex items-center gap-2 bg-[#060e20] p-1 rounded-lg border border-[#4a4455]/40">
                    <select 
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="bg-transparent text-[12px] text-[#dae2fd] outline-none pl-2 pr-1 py-1 cursor-pointer font-[family-name:var(--font-manrope)]"
                    >
                        <option value="Auto">Detectar Automático</option>
                        <option value="Samsung">Samsung</option>
                        <option value="Apple">Apple / iPhone</option>
                        <option value="Motorola">Motorola</option>
                        <option value="Xiaomi">Xiaomi / Redmi</option>
                        <option value="Huawei">Huawei</option>
                    </select>
                    
                    {brand !== "Auto" && (
                        <>
                            <div className="w-[1px] h-4 bg-[#4a4455]/50"></div>
                            <input 
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="Modelo (Ej: A52)"
                                className="bg-transparent text-[12px] text-[#ccc3d8] placeholder:text-[#4a4455] outline-none w-28 pl-1 py-1 font-[family-name:var(--font-manrope)]"
                            />
                        </>
                    )}
                </div>

                {/* Vertical separator */}
                <div className="hidden sm:block w-[1px] h-5 bg-[#4a4455]/30 mx-1"></div>

                {/* Modes (Compact) */}
                <div className="flex items-center gap-1 bg-[#060e20] p-1 rounded-lg border border-[#4a4455]/40">
                    {MODES.map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)} title={m.desc}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                mode === m.id
                                    ? m.id === "STANDARD" ? "bg-violet-500/20 text-violet-300 shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                                        : "bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(78,222,163,0.25)]"
                                    : "text-[#958da1] hover:text-[#dae2fd] hover:bg-white/[0.04]"
                            }`}>
                            <m.icon size={11} />
                            <span className="hidden sm:inline">{m.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Summarize */}
                {messages.length > 1 && (
                    <button onClick={handleSummarize} disabled={isSummarizing || isLoading}
                        title="Resumir y guardar en Wiki"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40">
                        {isSummarizing ? <Loader2 size={10} className="animate-spin" /> : <BookMarked size={10} />}
                        <span>Guardar sesión</span>
                    </button>
                )}

                <TokenBar usage={tokenUsage} />
            </div>

            {/* ── Chat Area ─────────────────────────────────────────────── */}
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0" onScrollCapture={handleScroll}>
                <div className="p-4 space-y-5 pb-4 max-w-3xl mx-auto w-full">

                    {/* Empty state — minimal, chat-ready */}
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                                <BrainCircuit size={24} className="text-violet-300" />
                            </div>
                            <div>
                                <p className="text-white/80 font-semibold text-sm">Listo para diagnosticar</p>
                                <p className="text-white/30 text-xs mt-1">Describí el síntoma en el campo de abajo</p>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-2 w-full max-w-sm">
                                {QUICK_CHIPS.map(chip => (
                                    <button key={chip.label} onClick={() => submit(chip.prompt)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] text-white/60 hover:text-white/90 transition-all text-left">
                                        <chip.icon size={12} className="shrink-0 opacity-60" />
                                        <span>{chip.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((message: any) => {
                        const isUser = message.role === "user";
                        let rawText = message.parts?.length > 0
                            ? message.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
                            : message.content || "";

                        const thinkMatch = rawText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                        const hasThink = !!thinkMatch;
                        const thinkContent = hasThink ? thinkMatch![1].trim() : "";
                        const mainContent = rawText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim();

                        return (
                            <div key={message.id} className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                {/* Avatar */}
                                <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                    isUser
                                        ? "bg-[#00a572] shadow-[0_0_10px_rgba(0,165,114,0.4)]"
                                        : "bg-[#7c3aed] shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                                }`}>
                                    {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                                </div>

                                <div className={`flex flex-col max-w-[86%] ${isUser ? "items-end" : "items-start"}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                        isUser
                                            ? "bg-[#222a3d] text-[#dae2fd] border border-[#4a4455]/30 rounded-tr-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                                            : "bg-[#171f33] text-[#ccc3d8] border border-[#7c3aed]/20 rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                                    }`}>
                                        <div className="flex flex-col gap-2">
                                            {/* Attachments */}
                                            {(message.parts || []).map((part: any, index: number) => {
                                                if (part.type !== "file" && part.type !== "image") return null;
                                                const fileObj = part.file || part;
                                                const mediaType = fileObj.mediaType || fileObj.type || "";
                                                const isImage = part.type === "image" || mediaType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileObj.name || fileObj.filename || "");
                                                const fileUrl = fileObj.url || (fileObj.data ? `data:${mediaType};base64,${fileObj.data}` : "") || (part.image || "");
                                                const fileName = fileObj.name || fileObj.filename || "Archivo adjunto";
                                                return (
                                                    <div key={`media-${index}`}>
                                                        {isImage ? (
                                                            <img src={fileUrl} alt={fileName}
                                                                onClick={() => { setSelectedImage(fileUrl); setZoom(1); }}
                                                                className="max-w-full rounded-xl border border-[#4a4455]/40 shadow-md cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                style={{ maxHeight: "280px" }} />
                                                        ) : (
                                                            <div className="flex items-center gap-2 p-2 bg-[#0b1326] rounded-lg border border-[#4a4455]/40 text-xs text-[#958da1]">
                                                                <FileIcon size={14} />
                                                                <span className="truncate">{fileName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Think block */}
                                            {hasThink && (
                                                <details className="mb-1 group/think" open={!rawText.includes("</think>")}>
                                                    <summary className="text-[11px] text-[#958da1] font-medium cursor-pointer flex items-center gap-1.5 hover:text-[#ccc3d8] transition-colors select-none list-none font-[family-name:var(--font-manrope)] uppercase tracking-wider">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${rawText.includes("</think>") ? "bg-[#4edea3]/50" : "bg-[#7c3aed]/80 animate-pulse"}`} />
                                                        {rawText.includes("</think>") ? "Ver análisis lógico" : "Analizando hardware..."}
                                                        <ChevronDown size={10} className="ml-0.5 transition-transform group-open/think:rotate-180" />
                                                    </summary>
                                                    <div className="mt-2 text-[11.5px] text-[#958da1] border-l-2 border-[#7c3aed]/30 pl-3 py-1.5 bg-[#060e20] rounded-r-md font-mono whitespace-pre-wrap">
                                                        {thinkContent}
                                                    </div>
                                                </details>
                                            )}

                                            {/* Content */}
                                            {mainContent && (
                                                isUser
                                                    ? <div className="whitespace-pre-wrap text-[13px] font-[family-name:var(--font-manrope)] text-[#dae2fd]">{mainContent}</div>
                                                    : <MarkdownContent content={mainContent} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Per-message actions */}
                                    {!isUser && mainContent && <MessageActions content={mainContent} onSaveWiki={saveToWiki} />}
                                </div>
                            </div>
                        );
                    })}

                    {isLoading && <TypingIndicator />}

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-[family-name:var(--font-manrope)]">
                            Hubo un problema. Reintentá en unos segundos.
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            {!atBottom && (
                <button
                    onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className="absolute bottom-24 right-4 z-20 p-2 rounded-full bg-[#7c3aed] hover:bg-[#7c3aed]/80 text-white shadow-[0_0_14px_rgba(124,58,237,0.4)] transition-all"
                >
                    <ChevronDown size={16} />
                </button>
            )}

            {/* ── Input Area ────────────────────────────────────────────── */}
            <div className="p-3 border-t border-[#4a4455]/30 bg-[#131b2e]/90 backdrop-blur-[12px] shrink-0">
                <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-3xl mx-auto">
                    {/* File previews */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-[#0b1326] rounded-xl border border-[#4a4455]/30">
                            {files.map((file, i) => (
                                <div key={i} className="relative group shrink-0">
                                    {file.type.startsWith("image/") ? (
                                        <div className="w-14 h-14 rounded-xl border border-[#4a4455]/40 overflow-hidden shadow-lg">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl border border-[#4a4455]/40 bg-[#171f33] flex flex-col items-center justify-center text-[10px] text-[#958da1]">
                                            <FileText size={18} className="mb-1 text-[#d2bbff]" />
                                            <span className="truncate w-full text-center px-1">PDF</span>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => removeFile(i)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-900/80 text-red-200 hover:bg-red-600 rounded-full p-1 border border-red-500/30 shadow-lg transition-all z-10">
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" />
                        <button type="button" disabled={isLoading} onClick={() => fileInputRef.current?.click()}
                            className="h-11 w-11 shrink-0 rounded-xl border border-[#4a4455]/40 bg-[#171f33] text-[#958da1] hover:text-[#d2bbff] hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/40 transition-all flex items-center justify-center">
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
                                className="w-full bg-[#060e20] border border-[#4a4455]/40 text-[#dae2fd] rounded-xl pl-4 pr-12 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]/40 transition-all resize-none placeholder:text-[#4a4455] leading-relaxed font-[family-name:var(--font-manrope)]"
                                disabled={isLoading}
                                style={{ minHeight: "44px", maxHeight: "140px" }}
                            />
                            <div className="absolute right-1 bottom-1">
                                {isLoading ? (
                                    <button type="button" onClick={() => stop()}
                                        className="h-9 w-9 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center">
                                        <X size={15} />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={isLoading || (!input.trim() && files.length === 0)}
                                        className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white disabled:opacity-40 transition-all flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)] disabled:shadow-none disabled:cursor-not-allowed">
                                        <Send size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="font-[family-name:var(--font-manrope)] text-[10px] text-[#4a4455] text-center tracking-wide">Enter para enviar · Shift+Enter nueva línea · Adjuntá imágenes o esquemáticos PDF</p>
                </form>
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1326]/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-5 right-5 p-2.5 rounded-full bg-[#2d3449] text-[#dae2fd] hover:bg-[#31394d] transition-colors z-[110]" onClick={e => { e.stopPropagation(); setSelectedImage(null); }}>
                        <X size={20} />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
                        <img src={selectedImage} alt="Full screen preview"
                            className="max-w-full max-h-full object-contain transition-transform duration-300 shadow-2xl rounded-lg"
                            style={{ transform: `scale(${zoom})` }}
                            onClick={e => { e.stopPropagation(); setZoom(p => p === 1 ? 2 : 1); }} />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 bg-[#171f33]/90 border border-[#4a4455]/40 rounded-full backdrop-blur-sm shadow-xl">
                            <button onClick={e => { e.stopPropagation(); setZoom(p => Math.max(0.5, p - 0.5)); }} className="text-[#dae2fd] hover:text-[#d2bbff] font-bold px-2">−</button>
                            <span className="text-[#dae2fd] text-xs font-mono min-w-[52px] text-center">{(zoom * 100).toFixed(0)}%</span>
                            <button onClick={e => { e.stopPropagation(); setZoom(p => Math.min(4, p + 0.5)); }} className="text-[#dae2fd] hover:text-[#d2bbff] font-bold px-2">+</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
