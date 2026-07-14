"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, UserRound } from "lucide-react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";
import type { CerebroUiMessage } from "./use-cerebro-v2-chat";
import { CerebroV2Sources } from "./cerebro-v2-sources";

function messageText(message: CerebroUiMessage): string {
    return message.parts.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n");
}

export function CerebroV2Message({ message, onOpenSource }: { message: CerebroUiMessage; onOpenSource: (source: CerebroPublicSource) => void }) {
    const user = message.role === "user";
    const text = messageText(message);
    const sources = message.metadata?.sources ?? [];
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
            </div>
        </article>
    );
}
