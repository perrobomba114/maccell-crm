"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { printInvoiceTicket } from "@/lib/print-utils";

interface InvoicePrintButtonProps {
    invoice: any;
}

export function InvoicePrintButton({ invoice }: InvoicePrintButtonProps) {
    const handlePrint = () => {
        // Prepare data for printInvoiceTicket
        const printData = {
            branch: invoice.sale.branch,
            items: invoice.sale.items.map((i: any) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price
            })),
            total: invoice.totalAmount,
            paymentMethod: invoice.sale.paymentMethod,
            invoice: {
                type: invoice.invoiceType as "A" | "B",
                number: invoice.invoiceNumber,
                cae: invoice.cae,
                caeExpiresAt: new Date(invoice.caeExpiresAt),
                customerName: invoice.customerName,
                customerDocType: invoice.customerDocType,
                customerDoc: invoice.customerDoc,
                customerAddress: invoice.customerAddress || "",
                salesPoint: parseInt(invoice.invoiceNumber.split('-')[0]) || 1
            },
            date: new Date(invoice.createdAt),
            billingEntity: invoice.billingEntity as "MACCELL" | "8BIT" | undefined
        };

        printInvoiceTicket(printData);
    };

    return (
        <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handlePrint}
            title="Imprimir Factura (80mm)"
        >
            <Printer className="w-4 h-4 text-zinc-400 hover:text-white" />
        </Button>
    );
}
