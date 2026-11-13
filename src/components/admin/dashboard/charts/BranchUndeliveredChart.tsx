import { AlertCircle } from "lucide-react";

type Row = { name: string; [key: string]: string | number | undefined };
export function BranchUndeliveredChart({ data, keys = [] }: { data: Row[]; keys?: { name: string; color: string }[] }) {
    return <section className="h-full rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold"><AlertCircle className="size-5 text-orange-400" />Stock de Reparaciones</h3>
        <p className="mb-4 text-sm text-zinc-400">Equipos actualmente en taller, por sucursal y estado.</p>
        {data.map(row => {
            const states = keys.filter(k => Number(row[k.name]) > 0);
            return <div key={row.name} className="border-t border-zinc-800 py-3">
                <div className="flex justify-between gap-2 font-semibold"><span>{row.name}</span><span>{states.reduce((n,k) => n + Number(row[k.name]), 0)} equipos</span></div>
                <ul className="mt-2 flex flex-wrap gap-2">{states.map(k => <li key={k.name} className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1 text-xs"><i aria-hidden="true" className="size-2 rounded-full" style={{ background:k.color }} />{k.name} · {row[k.name]}</li>)}</ul>
            </div>;
        })}
        {!data.length && <p>Sin equipos en la selección.</p>}
    </section>;
}
