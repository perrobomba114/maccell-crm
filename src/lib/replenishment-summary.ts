type StockedProduct = { id: string; name: string; stock: { branchId: string; quantity: number }[] };
type Branch = { id: string; name: string };

export function summarizeReplenishment(
    products: StockedProduct[], branches: Branch[],
    items: { productId: string | null; sale: { branchId: string } }[],
    salesMap: Map<string, { quantity: number }>, branchId?: string
) {
    const soldAt = new Map<string, Set<string>>();
    for (const item of items) {
        if (!item.productId) continue;
        const locations = soldAt.get(item.productId) ?? new Set<string>();
        locations.add(item.sale.branchId);
        soldAt.set(item.productId, locations);
    }
    const byBranch = new Map(branches.map(branch => [branch.id, { name: branch.name, count: 0 }]));
    const replenishmentSuggestions = products.map(product => {
        const name = product.name.toLowerCase();
        const target = name.includes("hidrogel") ? 20 : /templado|funda/.test(name) ? 10 : 5;
        const scopedStock = branchId ? product.stock.filter(row => row.branchId === branchId) : product.stock;
        const stocks = new Map(scopedStock.map(row => [row.branchId, row.quantity]));
        for (const id of soldAt.get(product.id) ?? []) {
            const summary = byBranch.get(id);
            if (summary && (stocks.get(id) ?? 0) < target) summary.count++;
        }
        const quantity = scopedStock.reduce((total, row) => total + row.quantity, 0);
        return {
            name: product.name, branch: branchId ? branches[0]?.name ?? "" : "Todas las sucursales",
            quantity, suggestedQuantity: Math.max(0, target * branches.length - quantity),
            salesVolume: salesMap.get(product.id)?.quantity ?? 0
        };
    }).filter(item => item.suggestedQuantity > 0)
        .sort((a, b) => Number(b.quantity <= 0) - Number(a.quantity <= 0)
            || b.suggestedQuantity * (1 + b.salesVolume) - a.suggestedQuantity * (1 + a.salesVolume)
            || a.name.localeCompare(b.name, "es"))
        .slice(0, 40);

    return { replenishmentSuggestions, stockByBranch: Array.from(byBranch.values()) };
}
