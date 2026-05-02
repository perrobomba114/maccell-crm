import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, DollarSign, Landmark, Percent, ReceiptText, Store } from "lucide-react";
import { CreateInvoiceModal } from "./create-invoice-modal";
import { InvoicePrintButton } from "./invoice-print-button";
import { getInvoices } from "@/actions/invoice-actions";
import { InvoiceDateFilter } from "./invoice-date-filter";
import { InvoicePagination } from "./invoice-pagination";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import type { ReactNode } from "react";


export const dynamic = 'force-dynamic';

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
});

export default async function InvoicesPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string, date?: string, view?: string }>
}) {
    const resolvedParams = await searchParams;
    const page = Number(resolvedParams.page) || 1;
    const viewAll = resolvedParams.view === 'all';

    // Default to Current Month if not "view all" and no date provided
    let date = resolvedParams.date;
    if (!date && !viewAll) {
        date = format(new Date(), 'yyyy-MM');
    }

    // Determine User/Branch (Mock or real if auth available)
    const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' }
    }) || await db.user.findFirst();

    const adminUserId = adminUser?.id || "admin-user";

    // Fetch Branches for the modal
    const branches = await db.branch.findMany({ select: { id: true, name: true, code: true } });

    // Fetch Invoices via Server Action
    const { invoices, totalPages, currentPage, totalAmount, totalCount, totalVat, entitySummaries } = await getInvoices({
        page,
        limit: 25,
        date
    });

    const maccellSummary = entitySummaries.find((summary) => summary.entity === "MACCELL");
    const eightBitSummary = entitySummaries.find((summary) => summary.entity === "8BIT");
    const periodLabel = date && date.length === 10 ? "del día seleccionado" : "del mes seleccionado";

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8" suppressHydrationWarning>
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ReceiptText className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Facturas electrónicas</h1>
                                    <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                        AFIP / ARCA
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Control fiscal por certificado · MACCELL consolida sus 3 locales · 8 Bit Accesorios separado.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden sm:inline">Mostrando</span>
                            <Badge variant="secondary" className="rounded-md font-semibold">
                                {totalCount.toLocaleString("es-AR")} comprobantes
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 border-t bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5">
                    <InvoiceDateFilter />
                    <div className="ml-auto">
                        <CreateInvoiceModal branches={branches} userId={adminUserId} />
                    </div>
                </div>

                <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
                        <CardContent className="flex min-h-[218px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-emerald-100">Total facturado</p>
                                <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <DollarSign className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{currencyFormatter.format(totalAmount)}</h3>
                            <div className="mt-auto flex items-center gap-2 pt-4">
                                <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">{totalCount} comprobantes</span>
                                <span className="text-xs text-emerald-100">{periodLabel}</span>
                            </div>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </Card>

                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                        <CardContent className="flex min-h-[218px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-blue-100">IVA facturado</p>
                                <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <Percent className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{currencyFormatter.format(totalVat)}</h3>
                            <div className="mt-auto pt-4 text-sm text-blue-100">Solo facturación nueva configurada al 21%</div>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </Card>

                    {maccellSummary && (
                        <FiscalEntityCard
                            title="MACCELL"
                            subtitle="3 locales, mismo certificado"
                            icon={<Landmark className="h-6 w-6 text-white" />}
                            summary={maccellSummary}
                            tone="amber"
                        />
                    )}

                    {eightBitSummary && (
                        <FiscalEntityCard
                            title="8 Bit Accesorios"
                            subtitle="certificado AFIP propio"
                            icon={<Store className="h-6 w-6 text-white" />}
                            summary={eightBitSummary}
                            tone="purple"
                        />
                    )}
                </div>
            </section>

            <Card className="border bg-card shadow-sm">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <ReceiptText className="h-5 w-5 text-emerald-600" />
                        Comprobantes ({totalCount})
                    </CardTitle>
                    <CardDescription>Historial emitido por las entidades fiscales configuradas.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Fecha</TableHead>
                                <TableHead>Entidad / local</TableHead>
                                <TableHead>Comprobante</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>CAE</TableHead>
                                <TableHead className="text-right">IVA</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No se encontraron facturas {date ? "para esta fecha" : "emitidas"}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">
                                            {format(inv.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{inv.billingEntity === "8BIT" ? "8 Bit Accesorios" : "MACCELL"}</span>
                                                <span className="text-xs text-muted-foreground">{inv.sale.branch.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-md bg-background font-mono">
                                                {inv.invoiceType} - {inv.invoiceNumber}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium truncate max-w-[150px]" title={inv.customerName}>{inv.customerName}</span>
                                                <span className="text-xs text-muted-foreground">{inv.customerDocType}: {inv.customerDoc}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {inv.cae}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-sky-700 dark:text-sky-300">
                                            {currencyFormatter.format(inv.vatAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-300">
                                            {currencyFormatter.format(inv.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <InvoiceDetailModal invoice={inv} />
                                                <InvoicePrintButton invoice={inv} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>

                    <InvoicePagination currentPage={currentPage} totalPages={totalPages} />
                </CardContent>
            </Card>
        </div>
    );
}

function FiscalEntityCard({
    title,
    subtitle,
    icon,
    summary,
    tone,
}: {
    title: string;
    subtitle: string;
    icon: ReactNode;
    summary: Awaited<ReturnType<typeof getInvoices>>["entitySummaries"][number];
    tone: "amber" | "purple";
}) {
    const color = tone === "amber"
        ? "from-amber-400 to-orange-600"
        : "from-purple-500 to-pink-600";
    const mutedText = tone === "amber" ? "text-amber-100" : "text-purple-100";

    return (
        <Card className={`relative overflow-hidden border-none bg-gradient-to-br ${color} text-white shadow-lg`}>
            <CardContent className="flex min-h-[218px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <p className={`line-clamp-2 min-h-[2.5rem] text-sm font-medium ${mutedText}`}>{title}</p>
                    <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                        {icon}
                    </div>
                </div>
                <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{currencyFormatter.format(summary.totalVat)}</h3>
                <p className={`mt-2 text-xs font-semibold ${mutedText}`}>IVA facturado · {summary.count} comprobantes · {subtitle}</p>
                <div className="mt-auto space-y-1.5 border-t border-white/20 pt-4">
                    {summary.branches.length === 0 ? (
                        <p className={`text-xs ${mutedText}`}>Sin comprobantes en el período.</p>
                    ) : summary.branches.map((branch) => (
                        <div key={branch.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                                <Building2 className="h-3.5 w-3.5 shrink-0 text-white/80" />
                                <span className="truncate">{branch.name}</span>
                            </span>
                            <span className="text-right font-mono font-bold tabular-nums">{currencyFormatter.format(branch.totalVat)}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}
