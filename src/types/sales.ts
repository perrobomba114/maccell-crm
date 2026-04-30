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
};

export type BranchRankingItem = {
    branchId: string | null;
    branchName: string;
    total: number;
};
