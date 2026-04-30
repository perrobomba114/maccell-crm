"use client";

import { UIMessage } from "@ai-sdk/react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot, Send, User, BrainCircuit, X, FileIcon,
    Loader2, Paperclip, FileText, Microscope,
    BookMarked, Zap, ChevronDown, Wrench, Radio,
    Waves, Flame, Droplets, Shield
} from "lucide-react";
import { useCerebroChat } from "./use-cerebro-chat";
import { MarkdownContent, MessageActions, TokenBar, TypingIndicator, Lightbox } from "./chat-components";
import type { LucideIcon } from "lucide-react";

type ChatMode = "STANDARD" | "MENTOR";
interface CerebroChatProps { conversationId: string; initialMessages?: UIMessage[]; }

type CerebroDisplayPart = UIMessage["parts"][number] & {
    type?: string;
    text?: string;
    image?: string;
    file?: {
        mediaType?: string;
        type?: string;
        url?: string;
        data?: string;
        name?: string;
    };
    mediaType?: string;
    url?: string;
    data?: string;
    name?: string;
};

const QUICK_CHIPS = [
    { icon: Zap, label: "No enciende", prompt: "El equipo no enciende. Fuente muestra 0.00A constante." },
    { icon: Radio, label: "No carga", prompt: "El dispositivo no carga. No detecta cable, conector visual limpio." },
    { icon: Waves, label: "Pantalla negra", prompt: "La pantalla no da imagen pero el equipo enciende (vibra y suena)." },
    { icon: Shield, label: "Sin señal", prompt: "El dispositivo no tiene señal de red, no detecta SIM." },
    { icon: Droplets, label: "Mojado", prompt: "El equipo ingresó en contacto con humedad/agua. Síntomas:" },
    { icon: Flame, label: "Reinicia solo", prompt: "El equipo reinicia constantemente (bootloop)." },
];

const MODES: { id: ChatMode; label: string; icon: LucideIcon; desc: string }[] = [
    { id: "STANDARD", label: "Directo", icon: Wrench, desc: "Diagnóstico completo en una sola respuesta." },
    { id: "MENTOR", label: "Guiado", icon: Microscope, desc: "Una sola medición por turno." },
];

export function CerebroChat({ conversationId, initialMessages = [] }: CerebroChatProps) {
    const [mode, setMode] = useState<ChatMode>("STANDARD");
    const [brand, setBrand] = useState("Auto");
    const [model, setModel] = useState("");

    const {
        input, setInput, files, fileInputRef, isSummarizing, selectedImage, setSelectedImage,
        zoom, setZoom, tokenUsage, atBottom, setAtBottom, scrollRef, bottomRef, textareaRef,
        messages, isLoading, error, stop, submit, handleScroll, adjustTextarea, handleFileChange,
        removeFile, handleSummarize
    } = useCerebroChat({ conversationId, initialMessages, mode, deviceContext: { brand, model } });

    const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(input); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } };

    return (
        <div className="flex flex-col h-full overflow-hidden relative bg-[#0d1117]">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#161b22]/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 bg-[#060e20] p-1 rounded-lg border border-[#4a4455]/40">
                    <select value={brand} onChange={(e) => setBrand(e.target.value)} className="bg-transparent text-[12px] text-[#dae2fd] outline-none pl-2 pr-1 py-1 cursor-pointer">
                        <option value="Auto">Detectar Automático</option>
                        <option value="Samsung">Samsung</option>
                        <option value="Apple">Apple / iPhone</option>
                        <option value="Motorola">Motorola</option>
                        <option value="Xiaomi">Xiaomi / Redmi</option>
                        <option value="Huawei">Huawei</option>
                    </select>
                    {brand !== "Auto" && (
                        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo" className="bg-transparent text-[12px] text-[#ccc3d8] outline-none w-28 border-l border-[#4a4455]/50 pl-2 ml-1" />
                    )}
                </div>
                <div className="flex items-center gap-1 bg-[#060e20] p-1 rounded-lg border border-[#4a4455]/40">
                    {MODES.map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)} title={m.desc} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${mode === m.id ? "bg-violet-500/20 text-violet-300 shadow-[0_0_8px_rgba(124,58,237,0.3)]" : "text-[#958da1] hover:text-[#dae2fd]"}`}>
                            <span className="hidden sm:inline">{m.label}</span>
                            <m.icon size={11} className="sm:hidden" />
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                {messages.length > 1 && (
                    <button onClick={handleSummarize} disabled={isSummarizing || isLoading} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40">
                        {isSummarizing ? <Loader2 size={10} className="animate-spin" /> : <BookMarked size={10} />}
                        <span>Guardar</span>
                    </button>
                )}
                <TokenBar usage={tokenUsage} />
            </div>

            {/* Chat Area */}
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0" onScrollCapture={handleScroll}>
                <div className="p-4 space-y-5 pb-4 max-w-3xl mx-auto w-full">
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                                <BrainCircuit size={24} className="text-violet-300" />
                            </div>
                            <div>
                                <p className="text-white/80 font-semibold text-sm">Listo para diagnosticar</p>
                                <p className="text-white/30 text-xs mt-1">Describí el síntoma abajo</p>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-2 w-full max-w-sm">
                                {QUICK_CHIPS.map(chip => (
                                    <button key={chip.label} onClick={() => submit(chip.prompt)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] text-white/60 hover:text-white/90 transition-all text-left">
                                        <chip.icon size={12} className="shrink-0 opacity-60" />
                                        <span>{chip.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => {
                        const isUser = message.role === "user";
                        const parts = (message.parts || []) as CerebroDisplayPart[];
                        const rawText = parts.length > 0 ? parts.filter((p) => p.type === "text").map((p) => p.text || "").join("\n") : "";
                        const thinkMatch = rawText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                        const hasThink = !!thinkMatch;
                        const thinkContent = hasThink ? thinkMatch![1].trim() : "";
                        const mainContent = rawText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim();

                        return (
                            <div key={message.id} className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${isUser ? "bg-[#00a572]" : "bg-[#7c3aed]"}`}>
                                    {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                                </div>
                                <div className={`flex flex-col max-w-[86%] ${isUser ? "items-end" : "items-start"}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-[#222a3d] border border-[#4a4455]/30" : "bg-[#171f33] border border-[#7c3aed]/20"}`}>
                                        <div className="flex flex-col gap-2">
                                            {parts.map((part, index) => {
                                                const fileObj = part.file || part;
                                                const mediaType = fileObj.mediaType || fileObj.type || "";
                                                const isImage = String(part.type) === "image" || mediaType.startsWith("image/");
                                                const fileUrl = fileObj.url || (fileObj.data ? `data:${mediaType};base64,${fileObj.data}` : "") || (part.image || "");
                                                if (!fileUrl) return null;
                                                return isImage ? (
                                                    <img key={index} src={fileUrl} alt="adjunto" onClick={() => { setSelectedImage(fileUrl); setZoom(1); }} className="max-w-full rounded-xl border border-[#4a4455]/40 cursor-zoom-in max-h-[280px]" />
                                                ) : (
                                                    <div key={index} className="flex items-center gap-2 p-2 bg-[#0b1326] rounded-lg border border-[#4a4455]/40 text-xs text-[#958da1]">
                                                        <FileIcon size={14} /><span className="truncate">{fileObj.name || "Archivo"}</span>
                                                    </div>
                                                );
                                            })}
                                            {hasThink && (
                                                <details className="mb-1 group/think" open={!rawText.includes("</think>")}>
                                                    <summary className="text-[11px] text-[#958da1] cursor-pointer flex items-center gap-1.5 font-[family-name:var(--font-manrope)] uppercase tracking-wider">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${rawText.includes("</think>") ? "bg-[#4edea3]/50" : "bg-[#7c3aed]/80 animate-pulse"}`} />
                                                        {rawText.includes("</think>") ? "Análisis lógico" : "Analizando..."}
                                                        <ChevronDown size={10} className="ml-0.5 transition-transform group-open/think:rotate-180" />
                                                    </summary>
                                                    <div className="mt-2 text-[11.5px] text-[#958da1] border-l-2 border-[#7c3aed]/30 pl-3 py-1.5 bg-[#060e20] rounded-r-md font-mono whitespace-pre-wrap">{thinkContent}</div>
                                                </details>
                                            )}
                                            {mainContent && (isUser ? <div className="whitespace-pre-wrap text-[13px] text-[#dae2fd]">{mainContent}</div> : <MarkdownContent content={mainContent} />)}
                                        </div>
                                    </div>
                                    {!isUser && mainContent && <MessageActions content={mainContent} onSaveWiki={(c) => window.dispatchEvent(new CustomEvent("cerebro-save-wiki", { detail: { content: c } }))} />}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && <TypingIndicator />}
                    {error && <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs">Error de conexión. Reintentá.</div>}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 border-t border-[#4a4455]/30 bg-[#131b2e]/90 backdrop-blur-[12px] shrink-0">
                <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-3xl mx-auto">
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-[#0b1326] rounded-xl border border-[#4a4455]/30">
                            {files.map((file, i) => (
                                <div key={i} className="relative group shrink-0 w-14 h-14 rounded-xl border border-[#4a4455]/40 overflow-hidden">
                                    {file.type.startsWith("image/") ? <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#171f33] flex flex-col items-center justify-center text-[10px] text-[#958da1]"><FileText size={18} className="mb-1 text-[#d2bbff]" /><span>PDF</span></div>}
                                    <button type="button" onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 bg-red-900/80 text-red-200 rounded-full p-1"><X size={10} strokeWidth={3} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <button type="button" disabled={isLoading} onClick={() => fileInputRef.current?.click()} className="h-11 w-11 shrink-0 rounded-xl border border-[#4a4455]/40 bg-[#171f33] text-[#958da1] flex items-center justify-center hover:bg-[#7c3aed]/15 transition-all"><Paperclip size={18} /></button>
                        <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" />
                        <div className="relative flex-1">
                            <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); adjustTextarea(); }} onKeyDown={handleKeyDown} placeholder="Describe el síntoma..." rows={1} className="w-full bg-[#060e20] border border-[#4a4455]/40 text-[#dae2fd] rounded-xl pl-4 pr-12 py-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/50 transition-all resize-none leading-relaxed" disabled={isLoading} style={{ minHeight: "44px", maxHeight: "140px" }} />
                            <div className="absolute right-1 bottom-1">
                                {isLoading ? (
                                    <button type="button" onClick={() => stop()} className="h-9 w-9 rounded-lg bg-red-600 text-white flex items-center justify-center"><X size={15} /></button>
                                ) : (
                                    <button type="submit" disabled={isLoading || (!input.trim() && files.length === 0)} className="h-9 w-9 rounded-lg bg-[#7c3aed] text-white disabled:opacity-40 flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)]"><Send size={15} /></button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {selectedImage && <Lightbox url={selectedImage} zoom={zoom} setZoom={setZoom} onClose={() => setSelectedImage(null)} />}
        </div>
    );
}
