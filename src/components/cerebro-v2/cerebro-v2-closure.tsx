"use client";

import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canApproveClosure } from "@/lib/cerebro-v2/closure-learning";

type ClosureDraft = {
    symptom: string;
    rootCause: string;
    confirmingEvidence: string;
    intervention: string;
    verification: string;
    affectedReferences: string[];
    schematicPages: unknown[];
    externalSources: unknown[];
    authority?: string;
};

type ClosureResponse = { draft: ClosureDraft; version: string | null; isAdmin: boolean; canReview: boolean; error?: string };
type FieldName = "symptom" | "rootCause" | "confirmingEvidence" | "intervention" | "verification";
type Props = { repairId: string; onClose: () => void };

const fields: readonly { name: FieldName; label: string; help: string; placeholder: string }[] = [
    { name: "symptom", label: "Síntoma confirmado", help: "Lo reproducido en banco, sin datos del cliente.", placeholder: "Ej.: enciende, tiene audio y táctil, pero no presenta imagen." },
    { name: "rootCause", label: "Causa raíz", help: "Solo la causa demostrada. Podés declarar que no fue determinada.", placeholder: "Ej.: pista abierta entre J1200 y R1201." },
    { name: "confirmingEvidence", label: "Evidencia que la confirma", help: "Instrumento, punto, condición y resultado observado.", placeholder: "Ej.: continuidad abierta entre pin 12 de J1200 y R1201, equipo sin alimentación." },
    { name: "intervention", label: "Intervención realizada", help: "Trabajo efectivamente realizado por el técnico.", placeholder: "Ej.: se reconstruyó la pista y se aisló la zona reparada." },
    { name: "verification", label: "Prueba final", help: "Prueba específica, condición y duración cuando corresponda. “OK” no alcanza.", placeholder: "Ej.: imagen estable 20 minutos, tres reinicios y prueba con módulo definitivo." },
];

export function CerebroV2Closure({ repairId, onClose }: Props) {
    const [draft, setDraft] = useState<ClosureDraft | null>(null);
    const [serverCanReview, setServerCanReview] = useState(false);
    const [version, setVersion] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [pending, setPending] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qualityFeedback, setQualityFeedback] = useState<string[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/cerebro-v2/closure?repairId=${encodeURIComponent(repairId)}`, { signal: controller.signal })
            .then(async (response) => {
                const body = await response.json() as ClosureResponse;
                if (!response.ok) throw new Error(body.error ?? "No se pudo cargar el cierre técnico");
                setDraft(body.draft); setVersion(body.version); setDirty(body.version === null); setServerCanReview(body.canReview);
            })
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el cierre técnico");
            });
        return () => controller.abort();
    }, [repairId]);

    function updateField(name: FieldName, value: string) {
        setSaved(false);
        setQualityFeedback([]);
        setDirty(true);
        setServerCanReview(false);
        setDraft((current) => current ? { ...current, [name]: value } : current);
    }

    async function save() {
        if (!draft) return;
        setPending(true); setError(null); setSaved(false);
        try {
            const response = await fetch("/api/cerebro-v2/closure", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repairId, expectedVersion: version, closure: draft }),
            });
            const body = await response.json() as { authority?: string; version?: string; canReview?: boolean; qualityFeedback?: string[]; error?: string };
            if (!response.ok) throw new Error(body.error ?? "No se pudo guardar el cierre técnico");
            setDraft((current) => current ? { ...current, authority: body.authority } : current);
            setVersion(body.version ?? null); setDirty(false); setServerCanReview(body.canReview === true);
            setQualityFeedback(body.qualityFeedback ?? []);
            setSaved(true);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "No se pudo guardar el cierre técnico");
        } finally { setPending(false); }
    }

    async function approveTraining() {
        if (!canApproveClosure({ dirty, serverCanReview, expectedVersion: version })) return;
        setPending(true); setError(null);
        try {
            const response = await fetch("/api/cerebro-v2/closure/review", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repairId, expectedVersion: version }),
            });
            const body = await response.json() as { version?: string; error?: string };
            if (!response.ok) throw new Error(body.error ?? "No se pudo aprobar el cierre");
            setVersion(body.version ?? version); setServerCanReview(false); setSaved(true);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "No se pudo aprobar el cierre");
        } finally { setPending(false); }
    }

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-h-[92dvh] overflow-hidden border-slate-700 bg-[#101820] p-0 text-slate-100 sm:max-w-2xl">
                <DialogHeader className="border-b border-slate-700/80 bg-[#0b1218] px-6 py-5 pr-14">
                    <div className="flex items-center gap-3"><span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300"><ClipboardCheck size={19} /></span><DialogTitle>Cierre técnico verificable</DialogTitle></div>
                    <DialogDescription className="text-slate-400">Registrá únicamente lo comprobado en esta reparación. El cierre se revisa antes de alimentar entrenamiento.</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
                    {!draft && !error ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="animate-spin" size={17} />Cargando borrador técnico…</div> : null}
                    {draft ? fields.map((field) => (
                        <div key={field.name} className="space-y-2">
                            <div className="flex items-end justify-between gap-3"><Label htmlFor={`closure-${field.name}`} className="text-slate-100">{field.label}</Label>{field.name === "rootCause" ? <button type="button" onClick={() => updateField("rootCause", "No determinada")} className="text-xs text-cyan-300 hover:text-cyan-200">No determinada</button> : null}</div>
                            <p id={`closure-${field.name}-help`} className="text-xs leading-5 text-slate-500">{field.help}</p>
                            <Textarea id={`closure-${field.name}`} aria-describedby={`closure-${field.name}-help`} value={draft[field.name]} onChange={(event) => updateField(field.name, event.target.value)} placeholder={field.placeholder} className="min-h-24 resize-y border-slate-700 bg-[#0a1117] text-sm text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-500/40" />
                        </div>
                    )) : null}
                    {error ? <div role="alert" className="flex gap-2 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 shrink-0" size={16} />{error}</div> : null}
                    {qualityFeedback.length ? <div role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100"><p className="font-medium">Guardado como cierre incompleto</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">{qualityFeedback.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                    {saved ? <div role="status" className="flex gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="shrink-0" size={17} />Cierre guardado. Los cambios quedaron registrados con su autoridad técnica.</div> : null}
                </div>
                <DialogFooter className="border-t border-slate-700/80 bg-[#0b1218] px-6 py-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={pending} className="text-slate-300 hover:bg-slate-800 hover:text-white">Cancelar</Button>
                    {canApproveClosure({ dirty, serverCanReview, expectedVersion: version }) ? <Button type="button" variant="outline" onClick={approveTraining} disabled={pending} className="border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"><ShieldCheck />Aprobar para entrenamiento</Button> : null}
                    <Button type="button" onClick={save} disabled={!draft || pending || !dirty} className="bg-cyan-600 hover:bg-cyan-500">{pending ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}{dirty ? "Guardar cierre" : "Cierre guardado"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
