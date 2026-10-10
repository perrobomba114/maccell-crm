const PAYMENT_METHODS = new Set(["CASH", "CARD", "MERCADOPAGO"]);

type PosAmounts = {
    total: number;
    paymentMethod?: string;
    payments?: Array<{ method: string; amount: number }>;
    items: Array<{ type: string; price: number; quantity: number }>;
};

/** Integer cents avoid accepting a whole peso of missing or excess payment. */
function cents(amount: number): number | null {
    if (!Number.isFinite(amount) || amount < 0) return null;
    const rounded = Math.round(amount * 100);
    if (!Number.isSafeInteger(rounded) || Math.abs(amount - rounded / 100) > 0.000001) return null;
    return rounded;
}

export function validatePosAmounts(data: PosAmounts): string | null {
    const total = cents(data.total);
    if (total === null) return "Total de venta inválido.";
    if (data.items.length === 0) return "El carrito está vacío.";
    let itemsTotal = 0;
    for (const item of data.items) {
        const price = cents(item.price);
        if (price === null || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
            return "Precio o cantidad inválidos.";
        }
        itemsTotal += price * item.quantity;
        if (!Number.isSafeInteger(itemsTotal)) return "Total de artículos inválido.";
    }
    if (itemsTotal !== total) return "El total de la venta no coincide con los artículos.";
    if (data.paymentMethod !== undefined && data.paymentMethod !== "SPLIT" && !PAYMENT_METHODS.has(data.paymentMethod)) {
        return "Método de pago inválido.";
    }
    const payments = data.payments ?? [];
    if (total === 0) {
        // Delivery of repairs without a charge is an existing valid operation.
        return data.items.every(item => item.type === "REPAIR") && payments.length === 0
            ? null
            : "Una venta sin cobro sólo puede entregar reparaciones sin pagos.";
    }
    if (payments.length === 0) {
        // Legacy callers provide one header method and no allocation array.
        return data.paymentMethod === "SPLIT" ? "Faltan los pagos de la venta." : null;
    }
    let paidTotal = 0;
    for (const payment of payments) {
        const amount = cents(payment.amount);
        if (amount === null || amount === 0 || !PAYMENT_METHODS.has(payment.method)) return "Monto o método de pago inválido.";
        if (data.paymentMethod && data.paymentMethod !== "SPLIT" && payment.method !== data.paymentMethod) {
            return "El método de pago no coincide con los pagos registrados.";
        }
        paidTotal += amount;
        if (!Number.isSafeInteger(paidTotal)) return "Total de pagos inválido.";
    }
    return paidTotal === total ? null : "La suma de los pagos no coincide con el total de la venta.";
}
