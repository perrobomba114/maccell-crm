export type InvoiceBranchOption = {
    id: string;
    name: string;
};

export type InvoiceItemForm = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatCondition: "21" | "10.5";
};

export type InvoiceItemField = keyof Pick<InvoiceItemForm, "description" | "quantity" | "unitPrice" | "vatCondition">;

export type InvoiceItemValue = InvoiceItemForm[InvoiceItemField];
