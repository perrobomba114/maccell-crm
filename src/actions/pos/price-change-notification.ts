export type PosPriceChangeItem = {
    name: string;
    price: number;
    originalPrice: number;
    priceChangeReason?: string;
};

export function getPriceChangeItems(items: readonly PosPriceChangeItem[]): PosPriceChangeItem[] {
    return items.filter((item) => Math.abs(item.originalPrice - item.price) > 0.01);
}

export function buildPriceChangeNotificationMessage(
    vendorName: string,
    saleNumber: string,
    items: readonly PosPriceChangeItem[],
): string {
    const details = items
        .map((item) => `${item.name}: $${item.originalPrice} -> $${item.price} (${item.priceChangeReason || "Sin motivo"})`)
        .join("\n");

    return `${vendorName} modificó precios en Venta #${saleNumber}:\n${details}`;
}
