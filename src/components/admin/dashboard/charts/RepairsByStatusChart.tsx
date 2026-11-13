import { LayoutList } from "lucide-react";

export function RepairsByStatusChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    const total = data.reduce((n,item) => n + item.value, 0);
    return <section className="h-full rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold"><LayoutList className="size-5 text-blue-400" />Estado Mensual</h3>
        <p className="my-4"><strong className="mr-2 text-3xl tabular-nums">{total}</strong>equipos resueltos</p>
        <div aria-hidden="true" className="mb-4 flex h-3 overflow-hidden rounded-full bg-zinc-800">{data.map(item => <i key={item.name} style={{ background:item.color, width:`${total ? item.value / total * 100 : 0}%` }} />)}</div>
        {total ? data.map(item => <div key={item.name} className="flex justify-between gap-3 border-t border-zinc-800 py-3 text-sm">
            <span>{item.name}</span><strong>{item.value} · {Math.round(item.value / total * 100)}%</strong>
        </div>) : <p className="text-sm text-zinc-400">Sin resoluciones en el mes seleccionado.</p>}
    </section>;
}
