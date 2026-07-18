import { Card, CardContent } from "@/components/ui/card";
import { Calculator, CircleDollarSign, FileText, ReceiptText } from "lucide-react";
import type { InvoiceEntitySummary } from "@/actions/invoice-actions";
import type { InvoiceAfipControlResult } from "@/actions/invoice-afip-control";
import type { ReactNode } from "react";
import { InvoiceAfipControlPanel } from "./invoice-afip-control-panel";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
});

type InvoiceSummaryCardsProps = {
    totalAmount: number;
    totalNet: number;
    totalVat: number;
    totalCount: number;
    periodLabel: string;
    date?: string;
    entitySummaries: InvoiceEntitySummary[];
    initialAfipControl: InvoiceAfipControlResult;
};

export function InvoiceSummaryCards({
    totalAmount,
    totalNet,
    totalVat,
    totalCount,
    periodLabel,
    date,
    entitySummaries,
    initialAfipControl,
}: InvoiceSummaryCardsProps) {
    return (
        <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <KpiCard title="Ventas facturadas" value={currencyFormatter.format(totalAmount)} detail={`${totalCount.toLocaleString("es-AR")} comprobantes ${periodLabel}`} icon={<CircleDollarSign className="h-5 w-5" />} tone="emerald" />
                <KpiCard title="Neto gravado" value={currencyFormatter.format(totalNet)} detail="Base neta de comprobantes emitidos" icon={<FileText className="h-5 w-5" />} tone="sky" />
                <KpiCard title="IVA débito fiscal" value={currencyFormatter.format(totalVat)} detail="IVA de ventas emitidas" icon={<Calculator className="h-5 w-5" />} tone="rose" />
                <KpiCard title="Comprobantes emitidos" value={totalCount.toLocaleString("es-AR")} detail="Compras / crédito fiscal no integrados" icon={<ReceiptText className="h-5 w-5" />} tone="amber" />
            </div>

            <InvoiceAfipControlPanel
                key={date || "all"}
                date={date}
                localSummaries={entitySummaries}
                initialControl={initialAfipControl}
            />
        </div>
    );
}

function KpiCard({
    title,
    value,
    detail,
    icon,
    tone,
}: {
    title: string;
    value: string;
    detail: string;
    icon: ReactNode;
    tone: "emerald" | "sky" | "rose" | "amber";
}) {
    const toneClasses = {
        emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        sky: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
        rose: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        amber: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    }[tone];

    return (
        <Card className="min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm">
            <CardContent className="flex min-h-36 flex-col justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{title}</p>
                    <div className={`shrink-0 rounded-md border p-2 ${toneClasses}`}>{icon}</div>
                </div>
                <div className="min-w-0">
                    <p className="break-words text-xl font-black leading-tight tabular-nums text-foreground sm:text-2xl" title={value}>{value}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{detail}</p>
                </div>
            </CardContent>
        </Card>
    );
}
