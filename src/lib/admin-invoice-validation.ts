import { z } from "zod";

const adminInvoiceItemSchema = z.object({
    description: z.string().trim().min(1, "Cada ítem necesita una descripción."),
    quantity: z.number().finite().positive("La cantidad debe ser mayor que cero."),
    unitPrice: z.number().finite().positive("El precio debe ser mayor que cero."),
    vatCondition: z.literal("21"),
});

const adminInvoiceInputSchema = z.object({
    requestId: z.string().trim().min(8),
    branchId: z.string().trim().min(1, "Seleccioná una sucursal."),
    customer: z.object({
        docType: z.enum(["CUIT", "DNI", "FINAL"]),
        docNumber: z.string().trim(),
        name: z.string().trim().min(1, "Ingresá el nombre del receptor."),
        address: z.string().trim(),
        ivaCondition: z.string().trim(),
    }),
    items: z.array(adminInvoiceItemSchema).min(1, "Agregá al menos un ítem."),
    invoiceType: z.enum(["A", "B"]),
    paymentMethod: z.enum(["CASH", "CARD", "MERCADOPAGO"]),
    concept: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
    serviceDateFrom: z.string().optional(),
    serviceDateTo: z.string().optional(),
    paymentDueDate: z.string().optional(),
});

export type AdminInvoiceInput = z.input<typeof adminInvoiceInputSchema>;
export type ValidAdminInvoiceInput = z.output<typeof adminInvoiceInputSchema>;

export type AdminInvoiceTotals = {
    net: number;
    vat: number;
    total: number;
};

export type AdminInvoiceValidationResult =
    | { success: true; data: ValidAdminInvoiceInput; totals: AdminInvoiceTotals }
    | { success: false; error: string };

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

export function resolveAdminFiscalContext(branch: { name: string | null; code: string | null }) {
    const is8Bit = branch.code === "8BIT" || branch.name?.toUpperCase().includes("8 BIT");
    return is8Bit
        ? { billingEntity: "8BIT" as const, salesPoint: 3 }
        : { billingEntity: "MACCELL" as const, salesPoint: 10 };
}

export function validateAndCalculateAdminInvoice(input: AdminInvoiceInput): AdminInvoiceValidationResult {
    const parsed = adminInvoiceInputSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Datos de factura inválidos." };
    }

    const data = parsed.data;
    const normalizedDocument = data.customer.docNumber.replace(/\D/g, "");
    const normalizedIvaCondition = data.customer.ivaCondition.trim().toLocaleLowerCase("es-AR");

    if (
        data.invoiceType === "A"
        && (
            data.customer.docType !== "CUIT"
            || normalizedDocument.length !== 11
            || normalizedIvaCondition !== "responsable inscripto"
        )
    ) {
        return {
            success: false,
            error: "La Factura A requiere CUIT de 11 dígitos y receptor Responsable Inscripto.",
        };
    }

    if (data.concept !== 1 && (!data.serviceDateFrom || !data.serviceDateTo || !data.paymentDueDate)) {
        return { success: false, error: "Las fechas de servicio y vencimiento son obligatorias." };
    }

    const grossTotal = data.items.reduce(
        (sum, item) => sum + roundCurrency(item.quantity * item.unitPrice),
        0
    );
    const total = roundCurrency(grossTotal);
    const net = roundCurrency(total / 1.21);
    const vat = roundCurrency(total - net);

    return { success: true, data, totals: { net, vat, total } };
}
