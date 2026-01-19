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
import { FileText, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { CreateInvoiceModal } from "./create-invoice-modal";
import { InvoicePrintButton } from "./invoice-print-button";
import { getInvoices } from "@/actions/invoice-actions";
import { InvoiceDateFilter } from "./invoice-date-filter";
import { InvoicePagination } from "./invoice-pagination";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
    searchParams
}: {
    searchParams: { page?: string, date?: string, view?: string }
}) {
    const page = Number(searchParams.page) || 1;
    const viewAll = searchParams.view === 'all';

    // Default to Today if not "view all" and no date provided
    let date = searchParams.date;
    if (!date && !viewAll) {
        date = format(new Date(), 'yyyy-MM-dd');
    }

    // Determine User/Branch (Mock or real if auth available)
    const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' }
    }) || await db.user.findFirst();

    const adminUserId = adminUser?.id || "admin-user";

    // Fetch Branches for the modal
    const branches = await db.branch.findMany({ select: { id: true, name: true } });

    // Fetch Invoices via Server Action
    const { invoices, totalPages, currentPage, totalAmount, totalCount } = await getInvoices({
        page,
        limit: 25,
        date
    });

    return (
        <div className="p-8 space-y-6 bg-black min-h-screen text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Facturas Electrónicas</h1>
                    <p className="text-zinc-400">Historial de comprobantes emitidos vía ARCA/AFIP.</p>
                </div>
                <div className="flex items-center gap-4">
                    <CreateInvoiceModal branches={branches} userId={adminUserId} />
                </div>
            </div>

            {/* Filters & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Filter Card */}
                <Card className="bg-zinc-900 border-zinc-800 md:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Filtrar por Fecha
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <InvoiceDateFilter />
                    </CardContent>
                </Card>

                {/* Total Amount Card */}
                <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            {date ? "Total Facturado del Día" : "Total Facturado (Mes Actual)"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">
                            ${totalAmount.toLocaleString()}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {date
                                ? `Correspondiente al ${format(new Date(date + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: es })}`
                                : `Suma total de facturación en el mes en curso`
                            }
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Comprobantes ({totalCount})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                                <TableHead className="text-zinc-400">Fecha</TableHead>
                                <TableHead className="text-zinc-400">Sucursal</TableHead>
                                <TableHead className="text-zinc-400">Comprobante</TableHead>
                                <TableHead className="text-zinc-400">Cliente</TableHead>
                                <TableHead className="text-zinc-400">CAE</TableHead>
                                <TableHead className="text-right text-zinc-400">Total</TableHead>
                                <TableHead className="text-right text-zinc-400">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                                        No se encontraron facturas {date ? "para esta fecha" : "emitidas"}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-medium text-zinc-200">
                                            {format(inv.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-zinc-300">
                                            {inv.sale.branch.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-zinc-300">
                                                {inv.invoiceType} - {inv.invoiceNumber}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-300">
                                            <div className="flex flex-col">
                                                <span className="font-medium truncate max-w-[150px]" title={inv.customerName}>{inv.customerName}</span>
                                                <span className="text-xs text-zinc-500">{inv.customerDocType}: {inv.customerDoc}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-400">
                                            {inv.cae}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-400">
                                            ${inv.totalAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <InvoicePrintButton invoice={inv} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <InvoicePagination currentPage={currentPage} totalPages={totalPages} />
                </CardContent>
            </Card>
        </div>
    );
}
