"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";

type Detail = { documentId: string; title: string; brand: string; model: string; summary: NonNullable<CerebroPublicSource["repairSummary"]>; content: string };

export function CerebroV2RepairEvidence({ source, sessionId, onClose }: { source: CerebroPublicSource; sessionId: string; onClose: () => void }) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        setDetail(null); setError(null);
        void fetch(`/api/cerebro-v2/repair-evidence/${encodeURIComponent(source.documentId)}?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
            .then(async response => { const body = await response.json() as { source: Detail; error?: string }; if (!response.ok) throw new Error(body.error ?? "No se pudo consultar el antecedente"); setDetail(body.source); })
            .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo consultar el antecedente"); });
        return () => controller.abort();
    }, [source.documentId, sessionId]);
    const summary = detail?.summary ?? source.repairSummary;
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto border-slate-700 bg-[#111820] text-slate-200 sm:max-w-2xl"><DialogHeader><DialogTitle>{detail?.title ?? source.title}</DialogTitle><DialogDescription>{detail?.brand ?? source.brand} {detail?.model ?? source.model} · Antecedente técnico</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="text-sm text-amber-200">{error}</p> : !detail ? <p role="status" className="text-sm text-slate-400">Consultando el registro técnico…</p> : null}
        {summary ? <dl className="space-y-4 text-sm">{[["Síntoma",summary.symptom],["Causa documentada",summary.rootCause],["Intervención",summary.intervention],["Verificación final",summary.verification]].map(([label,value]) => <div key={label}><dt className="font-semibold text-cyan-200">{label}</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-300">{value || "No documentada"}</dd></div>)}</dl> : null}
        <p className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-6 text-amber-100">{summary?.caveat || "La coincidencia de modelo y síntoma no demuestra la misma causa. Contrastá este trabajo con las mediciones del equipo actual."}</p>
        {detail?.content ? <details><summary className="cursor-pointer text-sm text-slate-400">Ver registro técnico resumido</summary><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-400">{detail.content}</p></details> : null}
    </DialogContent></Dialog>;
}
