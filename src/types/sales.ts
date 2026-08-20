import type { PaymentMethod } from "@prisma/client";

export type PaymentMethodLike = PaymentMethod | "MIXTO" | "TRANSFER";
export type EditablePaymentMethod = Extract<PaymentMethod, "CASH" | "CARD" | "MERCADOPAGO">;

export type SalePaymentSummary = {
    id?: string;
    amount: number;
    method: PaymentMethodLike;
    createdAt?: Date;
};

export type SaleItemSummary = {
    id: string;
    name: string;
    quantity: number;
    price: number;
    productId?: string | null;
    repairId?: string | null;
    originalPrice?: number | null;
    priceChangeReason?: string | null;
};

export type BranchSummary = {
    id?: string;
    name: string;
    address?: string | null;
    phone?: string | null;
};

export type SaleInvoiceSummary = {
    id?: string;
    invoiceType: string;
    invoiceNumber: string;
    cae: string;
    caeExpiresAt?: Date | null;
    customerDocType?: string;
    customerDoc?: string;
    customerName?: string;
    customerAddress?: string | null;
    netAmount?: number;
    vatAmount?: number;
    totalAmount?: number;
    billingEntity?: string | null;
};

export type SaleWithDetails = {
    id: string;
    saleNumber: string;
    total: number;
    paymentMethod: PaymentMethodLike;
    originalPaymentMethod?: PaymentMethodLike | null;
    wasPaymentModified?: boolean;
    createdAt: Date;
    vendor: { name: string };
    branch?: BranchSummary | null;
    items: SaleItemSummary[];
    payments?: SalePaymentSummary[];
    invoice?: SaleInvoiceSummary | null;
};

export type AdminSalesPage = {
    sales: SaleWithDetails[];
    totalSalesCount: number;
    totalRevenue: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type BranchRankingItem = {
    branchId: string | null;
    branchName: string;
    total: number;
};
