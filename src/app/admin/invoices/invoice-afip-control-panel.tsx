"use client";

import { getInvoiceAfipControl, type InvoiceAfipControlResult } from "@/actions/invoice-afip-control";
import type { InvoiceEntitySummary, InvoiceSystemAfipDiffSummary } from "@/actions/invoice-summary-helpers";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
});

type InvoiceAfipControlPanelProps = {
    date?: string;
    localSummaries: InvoiceEntitySummary[];
    initialControl: InvoiceAfipControlResult;
};

export function InvoiceAfipControlPanel({ date, localSummaries, initialControl }: InvoiceAfipControlPanelProps) {
    const [isPending, startTransition] = useTransition();
    const [control, setControl] = useState(initialControl);
    const [error, setError] = useState<string | null>(initialControl.error || null);
    const loadedByEntity = useMemo(
        () => new Map(control.summaries.map((summary) => [summary.entity, summary])),
        [control.summaries]
    );

    function refresh() {
        if (!date || isPending) return;
        setError(null);
        startTransition(async () => {
            const result = await getInvoiceAfipControl(date);
            if (!result.success) {
                setError(result.error || "No se pudo completar la consulta ARCA.");
                toast.error(result.error || "No se pudo completar la consulta ARCA.");
                return;
            }
            setControl(result);
            toast.success("Período completo actualizado desde ARCA.");
        });
    }

    return (
        <section className="overflow-hidden rounded-lg border border-amber-500/25 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300"><ShieldCheck className="h-5 w-5" /></div>
                    <div>
                        <h2 className="font-black">Período completo ARCA</h2>
                        <p className="text-xs text-muted-foreground">
                            {control.summaries.length ? `Última lectura ${formatReadTime(control.readAt)}` : "Todavía no se consultó este período"}
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={!date || isPending} className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {isPending ? "Leyendo período completo…" : "Actualizar ARCA"}
                </Button>
            </div>

            <div className="hidden grid-cols-[minmax(150px,1.2fr)_repeat(4,minmax(105px,1fr))_minmax(130px,1fr)] gap-3 border-b bg-muted/20 px-5 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground md:grid">
                <span>Entidad</span><span>Local</span><span>ARCA</span><span>Diferencia</span><span>Comprobantes</span><span>Estado</span>
            </div>
            <div className="divide-y">
                {localSummaries.map((local) => (
                    <EntityReconciliationRow key={local.entity} local={local} remote={loadedByEntity.get(local.entity)} />
                ))}
            </div>

            {(error || control.warnings.length > 0) && (
                <details className="border-t px-4 py-3 text-xs sm:px-5">
                    <summary className="cursor-pointer font-bold text-amber-700 dark:text-amber-300">Ver avisos de la consulta</summary>
                    <div className="mt-2 space-y-1 text-muted-foreground">
                        {error ? <p className="text-rose-600 dark:text-rose-300">{error}</p> : null}
                        {control.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                    </div>
                </details>
            )}
        </section>
    );
}

function EntityReconciliationRow({ local, remote }: { local: InvoiceEntitySummary; remote?: InvoiceSystemAfipDiffSummary }) {
    const isComplete = remote?.status === "COMPLETE";
    const reconciled = isComplete
        && Math.abs(remote.differenceAmount) < 0.01
        && (remote.onlyLocalCount ?? 0) === 0
        && (remote.onlyAfipCount ?? 0) === 0;
    const status = !remote
        ? { label: "Sin consultar", className: "text-muted-foreground", icon: AlertTriangle }
        : !isComplete
            ? { label: remote.status === "FAILED" ? "Error" : "Incompleto", className: "text-amber-700 dark:text-amber-300", icon: AlertTriangle }
            : reconciled
                ? { label: "Completo · conciliado", className: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 }
                : { label: "Completo · con diferencias", className: "text-rose-700 dark:text-rose-300", icon: XCircle };
    const StatusIcon = status.icon;

    return (
        <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(150px,1.2fr)_repeat(4,minmax(105px,1fr))_minmax(130px,1fr)] md:items-center md:px-5">
            <div><p className="font-black">{local.label}</p><p className="text-[11px] text-muted-foreground">Ventas emitidas del período</p></div>
            <MobileMetric label="Local" value={currencyFormatter.format(local.totalAmount)} />
            <MobileMetric label="ARCA" value={remote ? currencyFormatter.format(remote.afipAmount) : "—"} />
            <MobileMetric label="Diferencia" value={remote ? currencyFormatter.format(remote.differenceAmount) : "—"} tone={remote && Math.abs(remote.differenceAmount) >= 0.01 ? "danger" : undefined} />
            <div className="grid grid-cols-2 gap-2 text-xs md:block">
                <p><span className="text-muted-foreground md:hidden">Local </span><b>{local.count.toLocaleString("es-AR")}</b></p>
                <p><span className="text-muted-foreground md:hidden">ARCA </span><b>{remote?.afipCount.toLocaleString("es-AR") ?? "—"}</b></p>
                {remote ? <p className="col-span-2 mt-1 text-[10px] text-muted-foreground">Solo en local: {remote.onlyLocalCount ?? 0} · Solo en ARCA: {remote.onlyAfipCount ?? 0}</p> : null}
            </div>
            <div className={`flex items-center gap-2 text-xs font-bold ${status.className}`}><StatusIcon className="h-4 w-4" />{status.label}</div>
        </div>
    );
}

function MobileMetric({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
    return <div className="flex items-center justify-between gap-3 text-xs md:block"><span className="text-muted-foreground md:hidden">{label}</span><b className={tone === "danger" ? "tabular-nums text-rose-600 dark:text-rose-300" : "tabular-nums"}>{value}</b></div>;
}

function formatReadTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "reciente";
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
