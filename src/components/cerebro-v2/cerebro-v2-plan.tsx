"use client";

import type { DiagnosticPlan } from "@/lib/cerebro-v2/diagnostic-plan";
import type { GuidedOption, GuidedQuestion } from "@/lib/cerebro-v2/types";

export function CerebroV2Plan({ plan, question, disabled, onAnswer }: {
    plan: DiagnosticPlan; question?: GuidedQuestion; disabled: boolean;
    onAnswer: (questionId: string, option: GuidedOption) => void;
}) {
    return <section aria-label="Próxima comprobación" className="mb-4 rounded-lg border border-cyan-500/40 bg-cyan-500/5 p-4">
        <p className="text-xs font-medium text-cyan-300">{disabled ? "Comprobación anterior" : "Próxima comprobación"} · {plan.stage}</p>
        <h3 className="mt-2 text-base font-semibold leading-6 text-white">{plan.question}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{plan.reason}</p>
        <dl className="mt-3 space-y-2 text-sm leading-5">
            {[["Preparación", plan.conditions], ["Instrumento", plan.instrument], ["Punto", plan.point], ["Resultado esperado", plan.expected]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="font-medium text-slate-200">{label}</dt><dd className="text-slate-400">{value}</dd></div>)}
        </dl>
        {plan.branches.length > 0 ? <ul className="mt-3 space-y-2 border-t border-slate-700 pt-3 text-sm">{plan.branches.map((branch,index) => <li key={index}><span className="font-medium text-slate-200">{branch.result}: </span><span className="text-slate-400">{branch.meaning}</span></li>)}</ul> : null}
        {plan.evidenceIds.length > 0 ? <p className="mt-3 text-xs text-cyan-300">Referencias: {plan.evidenceIds.join(", ")}</p> : null}
        {question && !disabled ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map(option => <button key={option.id} type="button" onClick={() => onAnswer(question.id,option)} className="min-h-11 rounded-md border border-cyan-500/30 bg-slate-950/40 px-3 py-2 text-left text-sm text-cyan-100 hover:bg-cyan-500/10">{option.label}</button>)}</div> : null}
        {!disabled ? <p className="mt-3 text-xs text-slate-400">Registrá el resultado con las opciones o escribilo abajo. Indicá unidad y condiciones cuando corresponda.</p> : null}
    </section>;
}
