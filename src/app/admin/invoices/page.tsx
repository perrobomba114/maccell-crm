import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--muted))_100%)] p-5 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <Badge variant="outline" className="mb-3 rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                AFIP / ARCA
                            </Badge>
                            <h1 className="text-3xl font-black tracking-tight text-foreground">Facturas Electrónicas</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Control fiscal por certificado: MACCELL consolida sus 3 locales y 8 Bit Accesorios se muestra separado.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="rounded-lg border bg-background/70 p-1.5">
                                <InvoiceDateFilter />
                            </div>
                            <CreateInvoiceModal branches={branches} userId={adminUserId} />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-4">
                    <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                <DollarSign className="h-4 w-4" />
                                Total facturado
                            </CardTitle>
                            <CardDescription>{periodLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">
                                {currencyFormatter.format(totalAmount)}
                            </div>
                            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">{totalCount} comprobantes</p>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-200 bg-sky-50/70 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-100">
                                <Percent className="h-4 w-4" />
                                IVA facturado
                            </CardTitle>
                            <CardDescription>Solo IVA 21% para facturas nuevas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight text-sky-950 dark:text-sky-50">
                                {currencyFormatter.format(totalVat)}
                            </div>
                            <p className="mt-1 text-xs font-medium text-sky-700 dark:text-sky-300">Facturación nueva configurada al 21%</p>
                        </CardContent>
                    </Card>

                    {maccellSummary && (
                        <FiscalEntityCard
                            title="MACCELL"
                            subtitle="3 locales, mismo certificado"
                            icon={<Landmark className="h-4 w-4" />}
                            summary={maccellSummary}
                            tone="blue"
                        />
                    )}

                    {eightBitSummary && (
                        <FiscalEntityCard
                            title="8 Bit Accesorios"
                            subtitle="certificado AFIP propio"
                            icon={<Store className="h-4 w-4" />}
                            summary={eightBitSummary}
                            tone="violet"
                        />
                    )}
                </div>
            </div>

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
    tone: "blue" | "violet";
}) {
    const color = tone === "blue"
        ? "border-blue-200 bg-blue-50/70 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-50"
        : "border-violet-200 bg-violet-50/70 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-50";

    return (
        <Card className={`${color} shadow-sm`}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription>{subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <div className="text-2xl font-black tracking-tight">{currencyFormatter.format(summary.totalVat)}</div>
                    <p className="text-xs font-semibold opacity-70">IVA facturado · {summary.count} comprobantes</p>
                </div>
                <Separator className="opacity-50" />
                <div className="space-y-1.5">
                    {summary.branches.length === 0 ? (
                        <p className="text-xs opacity-70">Sin comprobantes en el período.</p>
                    ) : summary.branches.map((branch) => (
                        <div key={branch.name} className="flex items-center justify-between gap-3 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <span className="truncate">{branch.name}</span>
                            </span>
                            <span className="font-mono font-bold">{currencyFormatter.format(branch.totalVat)}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
