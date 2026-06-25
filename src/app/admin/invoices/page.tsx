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
import { ReceiptText } from "lucide-react";
import { CreateInvoiceModal } from "./create-invoice-modal";
import { InvoicePrintButton } from "./invoice-print-button";
import { getInvoices } from "@/actions/invoice-actions";
import { InvoiceDateFilter } from "./invoice-date-filter";
import { InvoicePagination } from "./invoice-pagination";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { InvoiceSummaryCards } from "./invoice-summary-cards";


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
    const { invoices, totalPages, currentPage, totalAmount, totalCount, totalNet, totalVat, receivedSummary, vatPayableSummary, systemAfipDiffSummary } = await getInvoices({
        page,
        limit: 25,
        date
    });

    const periodLabel = !date
        ? "del historial completo"
        : date.length === 10
            ? "del día seleccionado"
            : "del mes seleccionado";

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

                <InvoiceSummaryCards
                    totalAmount={totalAmount}
                    totalNet={totalNet}
                    totalVat={totalVat}
                    totalCount={totalCount}
                    periodLabel={periodLabel}
                    receivedSummary={receivedSummary}
                    vatPayableSummary={vatPayableSummary}
                    systemAfipDiffSummary={systemAfipDiffSummary}
                />
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
                        {/* Mobile View */}
                        <div className="sm:hidden flex flex-col divide-y divide-border/60">
                            {invoices.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center">
                                    <ReceiptText className="h-8 w-8 opacity-20" />
                                    <p>No se encontraron facturas {date ? "para esta fecha" : "emitidas"}.</p>
                                </div>
                            ) : (
                                invoices.map((inv) => (
                                    <div key={inv.id} className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="rounded-md bg-background font-mono text-[10px] font-bold">
                                                        {inv.invoiceType} - {inv.invoiceNumber}
                                                    </Badge>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {format(inv.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-sm">{inv.billingEntity === "8BIT" ? "8 Bit Accesorios" : "MACCELL"}</span>
                                                <span className="text-xs text-muted-foreground">{inv.sale.branch.name}</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tighter">
                                                    {currencyFormatter.format(inv.totalAmount)}
                                                </span>
                                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                                                    IVA: {currencyFormatter.format(inv.vatAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-0.5 pt-2 border-t border-border/40">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cliente</span>
                                            <span className="text-xs font-bold truncate">{inv.customerName}</span>
                                            <span className="text-[10px] text-muted-foreground">{inv.customerDocType}: {inv.customerDoc}</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">CAE: {inv.cae}</span>
                                            <div className="flex gap-1">
                                                <InvoiceDetailModal invoice={inv} />
                                                <InvoicePrintButton invoice={inv} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
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
                    </div>

                    <InvoicePagination currentPage={currentPage} totalPages={totalPages} />
                </CardContent>
            </Card>
        </div>
    );
}
