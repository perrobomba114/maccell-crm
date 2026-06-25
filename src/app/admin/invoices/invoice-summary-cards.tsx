import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calculator, FileInput, Landmark, ReceiptText, Store } from "lucide-react";
import type { InvoiceReceivedSummary, InvoiceSystemAfipDiffSummary, InvoiceVatPayableSummary } from "@/actions/invoice-actions";
import type { ReactNode } from "react";

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
    receivedSummary: InvoiceReceivedSummary;
    vatPayableSummary: InvoiceVatPayableSummary[];
    systemAfipDiffSummary: InvoiceSystemAfipDiffSummary[];
};

export function InvoiceSummaryCards({
    totalAmount,
    totalNet,
    totalVat,
    totalCount,
    periodLabel,
    receivedSummary,
    vatPayableSummary,
    systemAfipDiffSummary,
}: InvoiceSummaryCardsProps) {
    const maccellDiff = systemAfipDiffSummary.find((summary) => summary.entity === "MACCELL");
    const eightBitDiff = systemAfipDiffSummary.find((summary) => summary.entity === "8BIT");

    return (
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
                title="AFIP emitido"
                description={`${totalCount.toLocaleString("es-AR")} comprobantes ${periodLabel}`}
                amount={totalAmount}
                icon={<ReceiptText className="h-5 w-5" />}
                accent="emerald"
                rows={[
                    { label: "Neto", value: currencyFormatter.format(totalNet) },
                    { label: "IVA debito", value: currencyFormatter.format(totalVat) },
                ]}
            />

            <VatPayableCard summary={vatPayableSummary} />

            {maccellDiff && (
                <SystemAfipDiffCard
                    title="Control MACCELL"
                    icon={<Landmark className="h-5 w-5" />}
                    summary={maccellDiff}
                    accent="amber"
                />
            )}

            {eightBitDiff && (
                <SystemAfipDiffCard
                    title="Control 8 Bit"
                    icon={<Store className="h-5 w-5" />}
                    summary={eightBitDiff}
                    accent="fuchsia"
                />
            )}

            <ReceivedSummaryCard receivedSummary={receivedSummary} periodLabel={periodLabel} />
        </div>
    );
}

type SummaryCardProps = {
    title: string;
    description: string;
    amount: number;
    icon: ReactNode;
    accent: "emerald" | "amber" | "fuchsia" | "sky";
    rows: { label: ReactNode; value: string }[];
};

function SummaryCard({ title, description, amount, icon, accent, rows }: SummaryCardProps) {
    const accentClasses = {
        emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
        amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
        fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
        sky: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    }[accent];

    return (
        <Card className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <CardContent className="flex min-h-[190px] flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">{title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className={`shrink-0 rounded-md border p-2.5 ${accentClasses}`}>
                        {icon}
                    </div>
                </div>

                <div>
                    <p className="truncate text-2xl font-black tabular-nums text-foreground" title={currencyFormatter.format(amount)}>
                        {currencyFormatter.format(amount)}
                    </p>
                </div>

                <div className="mt-auto grid gap-2 border-t pt-3">
                    {rows.map((row, index) => (
                        <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate text-muted-foreground">{row.label}</span>
                            <span className="max-w-[58%] shrink-0 truncate text-right font-mono font-bold tabular-nums text-foreground">{row.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function SystemAfipDiffCard({
    title,
    icon,
    summary,
    accent,
}: {
    title: string;
    icon: ReactNode;
    summary: InvoiceSystemAfipDiffSummary;
    accent: "amber" | "fuchsia";
}) {
    return (
        <SummaryCard
            title={title}
            description={`${summary.systemCount} local · ${summary.afipCount} AFIP leída`}
            amount={summary.differenceAmount}
            icon={icon}
            accent={accent}
            rows={[
                { label: "Validado en local", value: currencyFormatter.format(summary.systemAmount) },
                { label: "Leído en AFIP", value: currencyFormatter.format(summary.afipAmount) },
                { label: "Diferencia", value: currencyFormatter.format(summary.differenceAmount) },
            ]}
        />
    );
}

function ReceivedSummaryCard({
    receivedSummary,
    periodLabel,
}: {
    receivedSummary: InvoiceReceivedSummary;
    periodLabel: string;
}) {
    const branchRows = receivedSummary.branches.length > 0
        ? receivedSummary.branches.slice(0, 3).map((branch) => ({
            label: branch.name,
            value: currencyFormatter.format(branch.totalAmount),
        }))
        : [{ label: "Sin registros", value: currencyFormatter.format(0) }];

    return (
        <SummaryCard
            title="Recibidas registradas"
            description={`${receivedSummary.count.toLocaleString("es-AR")} comprobantes/gastos ${periodLabel}`}
            amount={receivedSummary.totalAmount}
            icon={<FileInput className="h-5 w-5" />}
            accent="sky"
            rows={[
                { label: "IVA recibido", value: currencyFormatter.format(receivedSummary.totalVat) },
                ...branchRows.map((branch) => ({
                    label: (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{branch.label}</span>
                        </span>
                    ),
                    value: branch.value,
                })),
            ]}
        />
    );
}

function VatPayableCard({ summary }: { summary: InvoiceVatPayableSummary[] }) {
    const totalPayable = summary.reduce((acc, item) => acc + item.payableVat, 0);

    return (
        <Card className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <CardContent className="flex min-h-[190px] flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">IVA a pagar</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">IVA emitido menos IVA recibido</p>
                    </div>
                    <div className="shrink-0 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-300">
                        <Calculator className="h-5 w-5" />
                    </div>
                </div>

                <div>
                    <p
                        className="truncate text-2xl font-black tabular-nums text-foreground"
                        title={currencyFormatter.format(totalPayable)}
                    >
                        {currencyFormatter.format(totalPayable)}
                    </p>
                </div>

                <div className="mt-auto grid gap-2 border-t pt-3">
                    {summary.map((item) => (
                        <div key={item.entity} className="grid gap-1 text-xs">
                            <div className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate font-semibold text-muted-foreground">{item.label}</span>
                                <span className="max-w-[58%] shrink-0 truncate text-right font-mono font-bold tabular-nums text-foreground">
                                    {currencyFormatter.format(item.payableVat)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span>Emitido {currencyFormatter.format(item.debitVat)}</span>
                                <span>Recibido {currencyFormatter.format(item.receivedVat)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
