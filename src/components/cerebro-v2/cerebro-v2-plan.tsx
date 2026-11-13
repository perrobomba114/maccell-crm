"use client";

import type { DiagnosticPlan } from "@/lib/cerebro-v2/diagnostic-plan";
import type { GuidedOption, GuidedQuestion } from "@/lib/cerebro-v2/types";

export function CerebroV2Plan({ plan, question, disabled, onAnswer }: {
    plan: DiagnosticPlan; question?: GuidedQuestion; disabled: boolean;
    onAnswer: (questionId: string, option: GuidedOption) => void;
}) {
    return <section aria-label="Próxima comprobación" className="bench-work mb-4 rounded-lg border border-blue-500/40 bg-blue-500/5 p-4">
        <p className="text-xs font-medium text-blue-300">{disabled ? "Comprobación anterior" : "Próxima comprobación"} · {plan.stage}</p>
        <h3 className="mt-2 text-base font-semibold leading-6 text-white">{plan.question}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{plan.reason}</p>
        <dl className="mt-3 space-y-2 text-sm leading-5">
            {[["Preparación", plan.conditions], ["Instrumento", plan.instrument], ["Punto", plan.point], ["Resultado esperado", plan.expected]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="font-medium text-zinc-200">{label}</dt><dd className="text-zinc-400">{value}</dd></div>)}
        </dl>
        {plan.branches.length > 0 ? <ul className="mt-3 space-y-2 border-t border-zinc-700 pt-3 text-sm">{plan.branches.map((branch,index) => <li key={index}><span className="font-medium text-zinc-200">{branch.result}: </span><span className="text-zinc-400">{branch.meaning}</span></li>)}</ul> : null}
        {plan.evidenceIds.length > 0 ? <p className="mt-3 text-xs text-blue-300">Referencias: {plan.evidenceIds.join(", ")}</p> : null}
        {question && !disabled ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map(option => <button key={option.id} type="button" onClick={() => onAnswer(question.id,option)} className="min-h-11 rounded-md border border-blue-500/30 bg-zinc-950/40 px-3 py-2 text-left text-sm text-blue-100 hover:bg-blue-500/10">{option.label}</button>)}</div> : null}
        {!disabled ? <p className="mt-3 text-xs text-zinc-400">Registrá el resultado con las opciones o escribilo abajo. Indicá unidad y condiciones cuando corresponda.</p> : null}
    </section>;
}
