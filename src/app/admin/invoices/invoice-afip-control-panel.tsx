"use client";

import { getInvoiceAfipControl } from "@/actions/invoice-afip-control";
import type { InvoiceEntitySummary, InvoiceSystemAfipDiffSummary } from "@/actions/invoice-summary-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Landmark, Loader2, RefreshCw, ShieldCheck, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
});

const AUTO_REFRESH_STALE_MS = 15 * 60 * 1000;

type AfipControlState = {
    summaries: InvoiceSystemAfipDiffSummary[];
    warnings: string[];
    readAt: string;
} | null;

type InvoiceAfipControlPanelProps = {
    date?: string;
    localSummaries: InvoiceEntitySummary[];
};

export function InvoiceAfipControlPanel({ date, localSummaries }: InvoiceAfipControlPanelProps) {
    const [isPending, startTransition] = useTransition();
    const [controlState, setControlState] = useState<AfipControlState>(null);
    const [error, setError] = useState<string | null>(null);
    const activeDateRef = useRef(date);
    const inFlightDateRef = useRef<string | null>(null);

    const loadedByEntity = useMemo(() => {
        return new Map(controlState?.summaries.map((summary) => [summary.entity, summary]) ?? []);
    }, [controlState]);

    const readAfipControl = useCallback((showToast: boolean) => {
        if (!date || inFlightDateRef.current === date) return;

        const requestDate = date;
        inFlightDateRef.current = requestDate;
        setError(null);
        startTransition(async () => {
            try {
                const result = await getInvoiceAfipControl(requestDate);
                if (activeDateRef.current !== requestDate) return;

                if (!result.success) {
                    setError(result.error || "No se pudo consultar ARCA.");
                    if (showToast) {
                        toast.error(result.error || "No se pudo consultar ARCA.");
                    }
                    return;
                }

                if (showToast) {
                    toast.success("Consulta ARCA actualizada.");
                }
                setControlState({
                    summaries: result.summaries,
                    warnings: result.warnings,
                    readAt: result.readAt,
                });
            } catch {
                if (activeDateRef.current !== requestDate) return;

                setError("No se pudo consultar ARCA.");
                if (showToast) {
                    toast.error("No se pudo consultar ARCA.");
                }
            } finally {
                if (inFlightDateRef.current === requestDate) {
                    inFlightDateRef.current = null;
                }
            }
        });
    }, [date, startTransition]);

    useEffect(() => {
        activeDateRef.current = date;

        if (!date) {
            setControlState(null);
            setError(null);
            return;
        }

        setControlState(null);
        setError(null);
        readAfipControl(false);
    }, [date, readAfipControl]);

    useEffect(() => {
        if (!date) return;

        function refreshIfStale() {
            if (document.visibilityState === "hidden") return;

            const lastReadAt = controlState?.readAt ? new Date(controlState.readAt).getTime() : 0;
            const shouldRefresh = !lastReadAt || Date.now() - lastReadAt > AUTO_REFRESH_STALE_MS;
            if (shouldRefresh) {
                readAfipControl(false);
            }
        }

        window.addEventListener("focus", refreshIfStale);
        document.addEventListener("visibilitychange", refreshIfStale);

        return () => {
            window.removeEventListener("focus", refreshIfStale);
            document.removeEventListener("visibilitychange", refreshIfStale);
        };
    }, [controlState?.readAt, date, readAfipControl]);

    const statusLabel = (() => {
        if (!date) return "Elegí un período";
        if (isPending) return "Consultando ARCA";
        if (error) return "Consulta fallida";
        if (controlState) return `Leído ${formatReadTime(controlState.readAt)}`;
        return "Sin consultar";
    })();

    return (
        <section className="overflow-hidden rounded-lg border border-amber-500/20 bg-card shadow-sm">
            <div className="flex min-h-[250px] flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-wide text-foreground">Control ARCA</p>
                        <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
                    </div>
                    <div className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-300">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                </div>

                <div className="grid gap-3">
                    {localSummaries.map((summary) => (
                        <AfipEntityRow
                            key={summary.entity}
                            localSummary={summary}
                            loadedSummary={loadedByEntity.get(summary.entity)}
                        />
                    ))}
                </div>

                <div className="mt-auto space-y-2 border-t pt-3">
                    {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
                    {controlState?.warnings.map((warning) => (
                        <p key={warning} className="text-xs text-amber-600 dark:text-amber-300">{warning}</p>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => readAfipControl(true)}
                        disabled={isPending || !date}
                        className="w-full justify-center border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-200"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Actualizar ARCA
                    </Button>
                </div>
            </div>
        </section>
    );
}

function AfipEntityRow({
    localSummary,
    loadedSummary,
}: {
    localSummary: InvoiceEntitySummary;
    loadedSummary?: InvoiceSystemAfipDiffSummary;
}) {
    const Icon = localSummary.entity === "8BIT" ? Store : Landmark;
    const afipAmount = loadedSummary ? currencyFormatter.format(loadedSummary.afipAmount) : "Sin consultar";
    const differenceAmount = loadedSummary ? currencyFormatter.format(loadedSummary.differenceAmount) : "Pendiente";
    const differenceTone = loadedSummary && Math.abs(loadedSummary.differenceAmount) < 0.01
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-foreground";

    return (
        <div className="rounded-md border border-white/10 bg-background/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="min-w-0 text-sm font-bold text-foreground">{localSummary.label}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                    {localSummary.count.toLocaleString("es-AR")} local
                    {loadedSummary ? ` · ${loadedSummary.afipCount.toLocaleString("es-AR")} ARCA` : ""}
                </span>
            </div>

            <div className="grid gap-2 text-xs">
                <MetricLine label="Local" value={currencyFormatter.format(localSummary.totalAmount)} />
                <MetricLine label="ARCA" value={afipAmount} muted={!loadedSummary} />
                <MetricLine label="Diferencia" value={differenceAmount} valueClassName={differenceTone} muted={!loadedSummary} />
            </div>
        </div>
    );
}

function MetricLine({
    label,
    value,
    muted = false,
    valueClassName,
}: {
    label: string;
    value: string;
    muted?: boolean;
    valueClassName?: string;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-start gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(
                "max-w-full text-right font-mono font-bold tabular-nums leading-snug text-foreground [overflow-wrap:anywhere]",
                muted && "font-medium text-muted-foreground",
                valueClassName
            )}>
                {value}
            </span>
        </div>
    );
}

function formatReadTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "reciente";

    return new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}
