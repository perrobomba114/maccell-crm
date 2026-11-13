"use client";
import { Copy, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type Item = { name: string; branch: string; quantity: number; suggestedQuantity?: number };
const purchase = (item: Item) => `${item.name} · ${item.branch}: comprar ${item.suggestedQuantity ?? 0} un. (stock: ${item.quantity})`;

export function ReplenishmentTable({ data }: { data: Item[] }) {
    async function copy(items: Item[]) {
        try { await navigator.clipboard.writeText(items.map(purchase).join("\n")); toast.success("Lista copiada"); }
        catch { toast.error("No se pudo copiar la lista"); }
    }
    return <section className="rounded-2xl border border-orange-900/60 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-xl font-black italic"><ShoppingCart className="size-5 text-orange-400" />Plan de Reposición</h3>
            <p className="text-sm text-zinc-400">{data.length} artículos con compra sugerida</p></div>
            <button disabled={!data.length} onClick={() => copy(data)} className="min-h-11 rounded-lg border border-orange-700 px-3 text-sm text-orange-200 disabled:opacity-50">Copiar lista de compra</button>
        </div>
        <ul className="mt-3 divide-y divide-zinc-800">{data.map((item,i) => <li key={i} className="grid grid-cols-[1fr_auto] gap-2 py-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="min-w-0 break-words"><strong>{item.name}</strong><p className="text-sm text-zinc-400">{item.branch} · Stock {item.quantity} un.</p></div>
            <strong className="self-center text-sm text-orange-300">Comprar {item.suggestedQuantity ?? 0} un.</strong>
            <button className="min-h-11 w-fit px-2 text-sm text-zinc-300" onClick={() => copy([item])} aria-label={`Copiar compra de ${item.name}`}><Copy size={16} /></button>
        </li>)}</ul>{!data.length && <p className="mt-4 text-sm">Sin compras sugeridas para esta selección.</p>}
    </section>;
}
