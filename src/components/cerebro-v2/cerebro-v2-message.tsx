"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, UserRound } from "lucide-react";

import type { CerebroPublicSource, GuidedOption } from "@/lib/cerebro-v2/types";
import type { CerebroUiMessage } from "./use-cerebro-v2-chat";
import { CerebroV2Sources } from "./cerebro-v2-sources";

function messageText(message: CerebroUiMessage): string {
    return message.parts.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n");
}

type MessageProps = {
    message: CerebroUiMessage;
    disabled: boolean;
    onOpenSource: (source: CerebroPublicSource) => void;
    onGuidedAnswer: (questionId: string, option: GuidedOption) => void;
};

export function CerebroV2Message({ message, disabled, onOpenSource, onGuidedAnswer }: MessageProps) {
    const user = message.role === "user";
    const text = messageText(message);
    const sources = message.metadata?.sources ?? [];
    const question = message.metadata?.guidedQuestion;
    return (
        <article className={`flex gap-3 ${user ? "flex-row-reverse" : ""}`}>
            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${user ? "border-slate-600 bg-slate-800 text-slate-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>
                {user ? <UserRound size={15} /> : <Bot size={15} />}
            </div>
            <div className={`max-w-[90%] rounded-lg border px-4 py-3 ${user ? "border-slate-700 bg-slate-800/80" : "border-slate-700/70 bg-[#121b24]"}`}>
                {user ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{text}</p> : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        h2: ({ children }) => <h2 className="mb-2 mt-4 border-b border-slate-700 pb-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan-200 first:mt-0">{children}</h2>,
                        p: ({ children }) => <p className="mb-2 text-sm leading-6 text-slate-300 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-3 space-y-1 pl-4 text-sm text-slate-300">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">{children}</ol>,
                        li: ({ children }) => <li className="pl-1 leading-6 marker:text-cyan-400">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        code: ({ children }) => <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-amber-200">{children}</code>,
                    }}>{text}</ReactMarkdown>
                )}
                {!user ? <CerebroV2Sources sources={sources} onOpen={onOpenSource} /> : null}
                {!user && question ? (
                    <div className="mt-4 border-t border-slate-700/70 pt-4">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">Siguiente comprobación</p>
                        <p className="mt-2 text-sm font-semibold text-white">{question.prompt}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{question.conditions}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option) => <button key={option.id} type="button" disabled={disabled} onClick={() => onGuidedAnswer(question.id, option)} className="rounded-md border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-left text-xs text-cyan-100 hover:border-cyan-400/60 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40">{option.label}</button>)}
                        </div>
                        <p className="mt-2 text-[10px] text-slate-600">También podés escribir otro valor u observación abajo.</p>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
