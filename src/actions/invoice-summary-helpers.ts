export type InvoiceFiscalEntity = "MACCELL" | "8BIT";

const VAT_RATE = 0.21;

export type InvoiceEntitySummary = {
    entity: InvoiceFiscalEntity;
    label: string;
    count: number;
    totalAmount: number;
    totalNet: number;
    totalVat: number;
    branches: {
        name: string;
        count: number;
        totalAmount: number;
        totalVat: number;
    }[];
};

export type InvoiceReceivedSummary = {
    count: number;
    totalAmount: number;
    totalVat: number;
    branches: {
        name: string;
        count: number;
        totalAmount: number;
        totalVat: number;
    }[];
};

export type InvoiceVatPayableSummary = {
    entity: InvoiceFiscalEntity;
    label: string;
    debitVat: number;
    receivedVat: number;
    payableVat: number;
};

export type InvoiceSystemAfipDiffSummary = {
    entity: InvoiceFiscalEntity;
    label: string;
    systemAmount: number;
    afipAmount: number;
    differenceAmount: number;
    systemCount: number;
    afipCount: number;
};

type BranchLike = {
    name?: string | null;
    code?: string | null;
};

type InvoiceSummarySource = {
    billingEntity: string | null;
    totalAmount: number;
    netAmount: number;
    vatAmount: number;
    sale?: {
        branch?: BranchLike | null;
    } | null;
};

export function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

export function estimateVatFromGross(totalAmount: number) {
    return roundCurrency(totalAmount - totalAmount / (1 + VAT_RATE));
}

export function normalizeFiscalEntityFromBranch(branch?: BranchLike | null): InvoiceFiscalEntity {
    if (branch?.code === "8BIT" || branch?.name?.toUpperCase().includes("8 BIT")) {
        return "8BIT";
    }

    return "MACCELL";
}

export function normalizeBillingEntity(invoice: { billingEntity: string | null; sale?: { branch?: BranchLike | null } | null }): InvoiceFiscalEntity {
    if (invoice.billingEntity === "8BIT") {
        return "8BIT";
    }

    return normalizeFiscalEntityFromBranch(invoice.sale?.branch);
}

function createEmptyEntitySummaries() {
    return new Map<InvoiceFiscalEntity, InvoiceEntitySummary>([
        ["MACCELL", { entity: "MACCELL", label: "MACCELL - 3 locales", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] }],
        ["8BIT", { entity: "8BIT", label: "8 Bit Accesorios", count: 0, totalAmount: 0, totalNet: 0, totalVat: 0, branches: [] }],
    ]);
}

export function buildEntitySummaries(invoices: InvoiceSummarySource[]) {
    const summaryMap = createEmptyEntitySummaries();
    const branchSummary = new Map<InvoiceFiscalEntity, Map<string, InvoiceEntitySummary["branches"][number]>>([
        ["MACCELL", new Map()],
        ["8BIT", new Map()],
    ]);

    for (const invoice of invoices) {
        const entity = normalizeBillingEntity(invoice);
        const summary = summaryMap.get(entity);
        if (!summary) continue;

        summary.count += 1;
        summary.totalAmount += invoice.totalAmount;
        summary.totalNet += invoice.netAmount;
        summary.totalVat += invoice.vatAmount;

        const branchName = invoice.sale?.branch?.name || "Sucursal sin nombre";
        const branchesForEntity = branchSummary.get(entity);
        if (!branchesForEntity) continue;

        const currentBranch = branchesForEntity.get(branchName) ?? {
            name: branchName,
            count: 0,
            totalAmount: 0,
            totalVat: 0,
        };
        currentBranch.count += 1;
        currentBranch.totalAmount += invoice.totalAmount;
        currentBranch.totalVat += invoice.vatAmount;
        branchesForEntity.set(branchName, currentBranch);
    }

    return Array.from(summaryMap.values()).map((summary) => ({
        ...summary,
        totalAmount: roundCurrency(summary.totalAmount),
        totalNet: roundCurrency(summary.totalNet),
        totalVat: roundCurrency(summary.totalVat),
        branches: Array.from(branchSummary.get(summary.entity)?.values() ?? [])
            .map((branch) => ({
                ...branch,
                totalAmount: roundCurrency(branch.totalAmount),
                totalVat: roundCurrency(branch.totalVat),
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount),
    }));
}

export function buildSystemAfipDiffSummary(systemSummaries: InvoiceEntitySummary[], afipSummaries: InvoiceEntitySummary[]) {
    return systemSummaries.map((systemSummary): InvoiceSystemAfipDiffSummary => {
        const afipSummary = afipSummaries.find((summary) => summary.entity === systemSummary.entity);
        const afipAmount = afipSummary?.totalAmount || 0;

        return {
            entity: systemSummary.entity,
            label: systemSummary.entity === "8BIT" ? "8 Bit Accesorios" : "MACCELL",
            systemAmount: systemSummary.totalAmount,
            afipAmount,
            differenceAmount: roundCurrency(systemSummary.totalAmount - afipAmount),
            systemCount: systemSummary.count,
            afipCount: afipSummary?.count || 0,
        };
    });
}
