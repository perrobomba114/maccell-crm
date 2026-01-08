import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CreateInvoiceModal } from "./create-invoice-modal";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    // Determine User/Branch (Mock or real if auth available)
    // Assuming a default user for admin or retrieving from session if configured
    const adminUserId = "admin-user"; // Placeholder if auth not strictly typed here

    // Fetch Branches for the modal
    const branches = await db.branch.findMany({ select: { id: true, name: true } });

    const invoices = await db.saleInvoice.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            sale: {
                include: {
                    branch: true
                }
            }
        },
        take: 100
    });

    return (
        <div className="p-8 space-y-6 bg-black min-h-screen text-white">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Facturas Electrónicas</h1>
                    <p className="text-zinc-400">Historial de comprobantes emitidos vía ARCA/AFIP.</p>
                </div>
                <CreateInvoiceModal branches={branches} userId={adminUserId} />
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Comprobantes
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
                                        No se encontraron facturas emitidas.
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
                                                <span className="font-medium">{inv.customerName}</span>
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
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <Printer className="w-4 h-4 text-zinc-400 hover:text-white" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
