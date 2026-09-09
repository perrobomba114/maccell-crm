"use client";

import { FileSearch, Wrench } from "lucide-react";
import { safeWorkbenchUrl } from "@/lib/cerebro-v2/source-links";
import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";

export function CerebroV2Sources({ sources, onOpen }: { sources: readonly CerebroPublicSource[]; onOpen: (source: CerebroPublicSource) => void }) {
    const repairs = sources.filter(source => source.sourceType === "REPAIR");
    const documents = sources.filter(source => source.sourceType !== "REPAIR");
    return <section aria-label="Evidencia consultada" className="mt-4 space-y-3 border-t border-slate-700/60 pt-4">
        <h3 className="text-sm font-semibold text-slate-200">Antecedentes del modelo</h3>
        {repairs.length === 0 ? <p className="text-xs leading-5 text-slate-400">No se recuperaron reparaciones anteriores pertinentes en esta consulta. Esto no demuestra que no existan.</p> : repairs.map((source,index) => {
            const summary = source.repairSummary;
            return <button key={`${source.documentId}-${index}`} type="button" onClick={() => onOpen(source)} className="block w-full rounded-md border border-slate-700 bg-[#0b1117] p-3 text-left hover:border-cyan-500/50">
                <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300"><Wrench size={14} /><span>{source.citationId} · {source.title}</span><span className="ml-auto text-slate-400">{summary?.outcome === "verified" ? "Verificación registrada" : summary?.outcome === "reported" ? "Resultado reportado" : summary?.outcome === "unrepaired" ? "Sin reparación" : "Evidencia incompleta"}</span></div>
                <p className="mt-1 text-xs text-slate-400">{source.brand} {source.model}</p>
                {summary ? <dl className="mt-2 space-y-1 text-sm leading-5">{[["Síntoma",summary.symptom],["Intervención",summary.intervention],["Verificación",summary.verification]].map(([label,value]) => <div key={label}><dt className="inline font-medium text-slate-300">{label}: </dt><dd className="inline text-slate-400">{value || "No documentada"}</dd></div>)}</dl> : <p className="mt-2 text-xs leading-5 text-slate-400">Abrí el antecedente para revisar el registro técnico completo.</p>}
                <p className="mt-2 text-xs text-amber-200/80">{summary?.caveat || "Un caso anterior orienta la comprobación; no confirma la falla de este equipo."}</p>
                <p className="mt-2 text-xs text-cyan-300 underline">Ver antecedente completo</p>
            </button>;
        })}
        {documents.length ? <details className="rounded-md border border-slate-700 bg-[#0b1117]"><summary className="cursor-pointer px-3 py-3 text-xs font-medium text-slate-300">Documentación técnica · {documents.length} referencias</summary><div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">{documents.map((source,index) => <button key={`${source.documentId}-${source.pageNumber}-${index}`} type="button" onClick={() => { const url = safeWorkbenchUrl(source.workbenchUrl); if (url) window.location.assign(url); else onOpen(source); }} className="min-w-0 rounded border border-slate-700 p-3 text-left hover:border-cyan-500/50"><p className="flex items-center gap-2 text-xs text-cyan-300"><FileSearch size={14} />{source.citationId} · {source.sourceType === "PDF" ? `Página ${source.pageNumber ?? 1}` : "Placa"}</p><p className="mt-1 break-words text-xs text-slate-300">{source.title}</p><p className="mt-1 text-xs text-slate-500">{source.brand} {source.model}</p></button>)}</div></details> : null}
    </section>;
}
