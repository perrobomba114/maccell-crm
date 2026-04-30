import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Gift, Banknote, CreditCard, ArrowRightLeft, Smartphone } from "lucide-react";
import React from "react";
import type { PaymentMethodLike, SalePaymentSummary } from "@/types/sales";

export const getPaymentBadge = (method: PaymentMethodLike, payments: SalePaymentSummary[], total: number) => {
    if (total === 0) {
        return (
            <Badge variant="secondary" className="font-bold shadow-sm px-2.5 py-0.5 bg-zinc-100 text-zinc-500 border-zinc-200">
                <Gift className="w-3 h-3 mr-1" />
                Sin Cargo
            </Badge>
        );
    }

    let resolvedMethod = method;
    let label: string = method;
    let icon = <Banknote className="w-3 h-3 mr-1" />;
    let color = "bg-zinc-100 text-zinc-700 border-zinc-200";

    if (payments && payments.length > 0) {
        const uniqueMethods = Array.from(new Set(payments.map(p => p.method)));
        if (uniqueMethods.length > 1) {
            resolvedMethod = "MIXTO";
        } else if (uniqueMethods.length === 1) {
            resolvedMethod = uniqueMethods[0];
        }
    }

    switch (resolvedMethod) {
        case "CASH":
            label = "Efectivo";
            icon = <Banknote className="w-3 h-3 mr-1" />;
            color = "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
            break;
        case "CARD":
            label = "Tarjeta";
            icon = <CreditCard className="w-3 h-3 mr-1" />;
            color = "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
            break;
        case "TRANSFER":
            label = "Transferencia";
            icon = <ArrowRightLeft className="w-3 h-3 mr-1" />;
            color = "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200";
            break;
        case "MERCADOPAGO":
            label = "MercadoPago";
            icon = <Smartphone className="w-3 h-3 mr-1" />;
            color = "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200";
            break;
        case "MIXTO":
        case "SPLIT":
            label = "Dividido";
            icon = <ArrowRightLeft className="w-3 h-3 mr-1" />;
            color = "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200";
            break;
        default:
            color = "bg-gray-100 text-gray-700 border-gray-200";
            break;
    }

    return (
        <Badge variant="secondary" className={cn("font-bold shadow-sm px-2.5 py-0.5", color)}>
            {icon}
            {label}
        </Badge>
    );
};
