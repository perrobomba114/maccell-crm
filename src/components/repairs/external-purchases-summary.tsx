"use client";

import { useEffect, useState } from "react";
import { getRepairExternalPurchases } from "@/actions/repairs/external-purchases";

type PurchaseResult = Awaited<ReturnType<typeof getRepairExternalPurchases>>;
export function ExternalPurchasesSummary({ repairId }: { repairId: string }) {
    const [result, setResult] = useState<PurchaseResult | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        getRepairExternalPurchases(repairId).then(data => { if (active) setResult(data); }).catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [repairId]);
    if (result && !result.allowed) return null;
    return <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2">
        <p className="text-xs font-bold text-slate-400">Compras a otros proveedores</p>
        {failed ? <p className="text-xs text-red-400">No se pudieron cargar las compras. Volvé a abrir el detalle para reintentar.</p> : !result ? <p className="text-xs text-slate-500">Cargando compras...</p> : result.purchases.length === 0 ? <p className="text-xs text-slate-500">Sin compras externas registradas.</p> : result.purchases.map(p => <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs">
            <p className="font-bold text-white break-words">{p.description} × {p.quantity}</p>
            <p className="text-slate-400 break-words">{p.supplier} · {p.purchasedAt.split("-").reverse().join("/")}</p>
            <p className="text-slate-200">Costo unitario: ${Number(p.unitCost).toLocaleString("es-AR", { minimumFractionDigits: 2 })} · Total: ${Number(p.totalCost).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS</p>
            <p className="text-slate-500">Registró: {p.userName}{p.receipt ? ` · ${p.receipt}` : ""}</p>
        </div>)}
    </div>;
}
