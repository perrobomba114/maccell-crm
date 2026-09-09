"use client";

import { useState } from "react";
import type { DiagnosticState } from "@/lib/cerebro-v2/diagnostic-state";

export function CerebroV2Observations({ state, disabled, onCorrect }: {
    state: DiagnosticState; disabled: boolean; onCorrect: (text: string) => Promise<boolean>;
}) {
    const [editing, setEditing] = useState<string | null>(null);
    const [value, setValue] = useState("");
    return <details className="rounded-lg border border-slate-700 bg-[#101820] text-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-200">Expediente · {state.measurements.length} mediciones · {state.observations.filter(o => !o.superseded).length} observaciones</summary>
        <div className="space-y-3 border-t border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-400">Datos aportados por recepción y el técnico. Las hipótesis de Cerebro se muestran en el diagnóstico.</p>
            {state.observations.map(observation => <div key={observation.id} className={observation.superseded ? "opacity-50" : ""}>
                <p className="text-xs text-cyan-300">{observation.origin === "seller" ? "Recepción · pendiente de comprobar" : observation.origin === "record" ? "Nota del CRM · pendiente de confirmar" : "Técnico"}{observation.superseded ? " · corregida" : ""}</p>
                {observation.answerContext ? <p className="mt-1 text-xs leading-5 text-slate-500">Comprobación: {observation.answerContext.question} · {observation.answerContext.conditions}</p> : null}
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{observation.text.replace(/^Corrección de observación \[[^\]]+\]:/i,"Corrección:")}</p>
                {!observation.superseded && !disabled ? <button type="button" className="mt-1 text-xs text-slate-400 underline" onClick={() => { setEditing(observation.id); setValue(""); }}>Corregir observación</button> : null}
                {editing === observation.id ? <form className="mt-2 space-y-2" onSubmit={async event => { event.preventDefault(); if (value.trim() && await onCorrect(`Corrección de observación [${observation.id}]: ${value.trim()}`)) setEditing(null); }}>
                    <label className="block text-xs text-slate-300">Dato corregido<input value={value} onChange={event => setValue(event.target.value)} required className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" placeholder="Valor, unidad, instrumento y condiciones" /></label>
                    <div className="flex gap-3"><button disabled={disabled} className="rounded bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Guardar y continuar</button><button type="button" onClick={() => setEditing(null)} className="text-xs text-slate-400">Cancelar</button></div>
                </form> : null}
            </div>)}
        </div>
    </details>;
}
