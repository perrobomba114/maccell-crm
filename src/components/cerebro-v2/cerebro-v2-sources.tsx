"use client";

import { CheckCircle2, FileSearch, Wrench } from "lucide-react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";

export function CerebroV2Sources({ sources, onOpen }: { sources: readonly CerebroPublicSource[]; onOpen: (source: CerebroPublicSource) => void }) {
    if (sources.length === 0) return null;
    return (
        <div className="mt-3 grid gap-2 border-t border-slate-700/60 pt-3 sm:grid-cols-2">
            {sources.map((source, index) => {
                const isPdf = source.sourceType === "PDF";
                return (
                    <button key={`${source.documentId}-${source.pageNumber ?? 0}-${index}`} type="button" onClick={() => onOpen(source)} className="rounded-md border border-slate-700 bg-[#0b1117] p-3 text-left hover:border-cyan-500/50 hover:bg-cyan-500/5">
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                            {isPdf ? <FileSearch size={13} /> : <Wrench size={13} />}
                            {isPdf ? `Documento · pág. ${source.pageNumber ?? 1}` : "Reparación registrada"}
                            {source.authority === "CONFIRMED_SUCCESS" ? <CheckCircle2 size={12} className="ml-auto text-emerald-400" /> : null}
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-200">{source.title}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{source.excerpt}</p>
                    </button>
                );
            })}
        </div>
    );
}
