import type { PaymentMethodLike, SalePaymentSummary } from "@/types/sales";

export type SalePaymentDetailsRow = {
    method: PaymentMethodLike;
    label: string;
    amount: number;
    formattedAmount: string;
};

export type SalePaymentDetails = {
    label: string;
    isMixed: boolean;
    rows: SalePaymentDetailsRow[];
    formattedTotal: string;
};

type SalePaymentDetailsInput = {
    total: number;
    paymentMethod: PaymentMethodLike;
    payments?: SalePaymentSummary[];
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethodLike, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    MERCADOPAGO: "MercadoPago",
    SPLIT: "Mixto",
    MIXTO: "Mixto",
    TRANSFER: "Transferencia",
};

const amountFormatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
});

export function formatSalePaymentAmount(amount: number): string {
    return `$${amountFormatter.format(amount)}`;
}

export function getSalePaymentMethodLabel(method: PaymentMethodLike): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function buildSalePaymentDetails(input: SalePaymentDetailsInput): SalePaymentDetails {
    const amountsByMethod = new Map<PaymentMethodLike, number>();

    for (const payment of input.payments ?? []) {
        if (!Number.isFinite(payment.amount)) continue;
        const currentAmount = amountsByMethod.get(payment.method) ?? 0;
        amountsByMethod.set(payment.method, currentAmount + payment.amount);
    }

    const rows = Array.from(amountsByMethod, ([method, amount]) => ({
        method,
        label: getSalePaymentMethodLabel(method),
        amount,
        formattedAmount: formatSalePaymentAmount(amount),
    }));

    const isMixed = input.paymentMethod === "SPLIT" || input.paymentMethod === "MIXTO" || rows.length > 1;
    const label = isMixed ? "Mixto" : rows[0]?.label ?? getSalePaymentMethodLabel(input.paymentMethod);

    return {
        label,
        isMixed,
        rows,
        formattedTotal: formatSalePaymentAmount(input.total),
    };
}
