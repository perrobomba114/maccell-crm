"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Bot, Check, Copy, BookMarked, RefreshCw, ChevronDown,
    X, FileIcon
} from "lucide-react";
import { toast } from "sonner";

// ─── Markdown renderer ───────────────────────────────────────
export function MarkdownContent({ content }: { content: string }) {
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
export function MessageActions({ content, onSaveWiki }: { content: string; onSaveWiki: (c: string) => void }) {
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
export function TokenBar({ usage }: { usage: { used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null }) {
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

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TYPING_STAGES = ["Clasificando síntoma...", "Buscando en RAG...", "Analizando schematics...", "Generando diagnóstico..."];
export function TypingIndicator() {
    const [stage, setStage] = useState(0);
    useState(() => {
        const timers = [800, 1800, 2800].map((ms, i) => setTimeout(() => setStage(i + 1), ms));
        return () => timers.forEach(clearTimeout);
    });
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

// ─── Lightbox ─────────────────────────────────────────────────────────────────
export function Lightbox({ url, zoom, setZoom, onClose }: { url: string; zoom: number; setZoom: (z: number | ((p: number) => number)) => void; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1326]/95 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <button className="absolute top-5 right-5 p-2.5 rounded-full bg-[#2d3449] text-[#dae2fd] hover:bg-[#31394d] transition-colors z-[110]" onClick={e => { e.stopPropagation(); onClose(); }}><X size={20} /></button>
            <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
                <img src={url} alt="Full screen preview" className="max-w-full max-h-full object-contain transition-transform duration-300 shadow-2xl rounded-lg" style={{ transform: `scale(${zoom})` }} onClick={e => { e.stopPropagation(); setZoom(p => p === 1 ? 2 : 1); }} />
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 bg-[#171f33]/90 border border-[#4a4455]/40 rounded-full backdrop-blur-sm shadow-xl">
                    <button onClick={e => { e.stopPropagation(); setZoom(p => Math.max(0.5, p - 0.5)); }} className="text-[#dae2fd] hover:text-[#d2bbff] font-bold px-2">−</button>
                    <span className="text-[#dae2fd] text-xs font-mono min-w-[52px] text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={e => { e.stopPropagation(); setZoom(p => Math.min(4, p + 0.5)); }} className="text-[#dae2fd] hover:text-[#d2bbff] font-bold px-2">+</button>
                </div>
            </div>
        </div>
    );
}
