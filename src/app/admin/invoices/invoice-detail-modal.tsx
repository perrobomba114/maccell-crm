"use client";

import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetailModalProps {
    invoice: any;
}

// Component
export function InvoiceDetailModal({ invoice }: InvoiceDetailModalProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Ver Detalle"
                >
                    <Eye className="w-4 h-4 text-zinc-400 hover:text-white" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-2 border-zinc-800 bg-zinc-950 text-white shadow-2xl">
                <DialogTitle className="sr-only">Detalle de Factura</DialogTitle>
                {/* Header */}
                <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-900/50 font-bold px-2 py-0.5 rounded text-sm">
                                {invoice.invoiceType}
                            </Badge>
                            <h2 className="text-xl font-bold tracking-tight">
                                Factura Electrónica
                            </h2>
                        </div>
                        <p className="text-sm text-zinc-400 font-mono">
                            N° {invoice.invoiceNumber}
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Emisión</span>
                            <div className="font-medium">
                                {format(new Date(invoice.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Razón Social</span>
                            <div className="font-medium bg-zinc-900/50 px-2 py-1 rounded inline-block text-xs font-bold text-blue-300 border border-zinc-800">
                                {invoice.billingEntity || "MACCELL"}
                            </div>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</span>
                            <div className="font-medium text-lg leading-tight">
                                {invoice.customerName}
                            </div>
                            <div className="text-zinc-400">
                                {invoice.customerDocType}: <span className="font-mono">{invoice.customerDoc}</span>
                            </div>
                            {invoice.customerAddress && (
                                <div className="text-zinc-500 text-xs mt-0.5">
                                    {invoice.customerAddress}
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-zinc-800" />

                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Detalle de Conceptos</div>
                        <div className="border border-zinc-800 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500 font-semibold">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Desc.</th>
                                        <th className="px-3 py-2 text-right">Cant.</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {invoice.sale.items.map((item: any) => (
                                        <tr key={item.id} className="text-zinc-300">
                                            <td className="px-3 py-2">{item.name}</td>
                                            <td className="px-3 py-2 text-right text-zinc-500">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                ${(item.price * item.quantity).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Breakdown & Totals */}
                    <div className="bg-zinc-900/30 rounded-lg p-4 space-y-2 border border-zinc-800/50">
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>CAE</span>
                            <span className="font-mono text-zinc-200">{invoice.cae}</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>Vto. CAE</span>
                            <span className="font-mono text-zinc-200">
                                {format(new Date(invoice.caeExpiresAt), "dd/MM/yyyy")}
                            </span>
                        </div>
                        <Separator className="bg-zinc-800 my-2" />
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                            <span className="text-3xl font-black text-green-500 tracking-tighter">
                                ${invoice.totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
