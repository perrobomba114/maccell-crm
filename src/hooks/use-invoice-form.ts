"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generateAdminInvoice, searchCuit } from "@/lib/actions/admin-invoice";
import { validateAndCalculateAdminInvoice } from "@/lib/admin-invoice-validation";
import type { InvoiceBranchOption, InvoiceItemField, InvoiceItemForm, InvoiceItemValue, InvoicePaymentMethod } from "@/types/invoice-form";
import { formatArgentinaDate } from "@/lib/date-utils";

type InvoiceFormStep = "FORM" | "REVIEW" | "SUCCESS";

export function useInvoiceForm(branches: InvoiceBranchOption[], initialBranchId?: string) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<InvoiceFormStep>("FORM");
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<{ cae: string; voucherNumber: string; caeExpiresAt: string } | null>(null);
    const requestIdRef = useRef(crypto.randomUUID());

    const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || "");
    const [invoiceType, setInvoiceType] = useState<"A" | "B">("B");
    const [billingEntity, setBillingEntity] = useState<"MACCELL" | "8BIT">("MACCELL");
    const [concept, setConcept] = useState<1 | 2 | 3>(1);
    const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>("CASH");
    const today = formatArgentinaDate();
    const [serviceDateFrom, setServiceDateFrom] = useState(today);
    const [serviceDateTo, setServiceDateTo] = useState(today);
    const [paymentDueDate, setPaymentDueDate] = useState(today);
    const [docType, setDocType] = useState<"CUIT" | "DNI" | "FINAL">("FINAL");
    const [docNumber, setDocNumber] = useState("");
    const [customerName, setCustomerName] = useState("Consumidor Final");
    const [customerAddress, setCustomerAddress] = useState("");
    const [ivaCondition, setIvaCondition] = useState("Consumidor Final");
    const [items, setItems] = useState<InvoiceItemForm[]>([
        { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, vatCondition: "21" },
    ]);

    const branchesByEntity = useMemo(() => ({
        MACCELL: branches.filter((branch) => branch.code !== "8BIT" && !branch.name.toUpperCase().includes("8 BIT")),
        "8BIT": branches.filter((branch) => branch.code === "8BIT" || branch.name.toUpperCase().includes("8 BIT")),
    }), [branches]);

    useEffect(() => {
        const entityBranches = branchesByEntity[billingEntity];
        const firstBranchId = entityBranches[0]?.id;
        if (firstBranchId && !entityBranches.some((branch) => branch.id === branchId)) {
            setBranchId(firstBranchId);
        }
    }, [billingEntity, branchId, branchesByEntity]);

    const totals = useMemo(() => {
        const total = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
        const net = Math.round((total / 1.21) * 100) / 100;
        return { net, vat: Math.round((total - net) * 100) / 100, total };
    }, [items]);

    function buildInput() {
        return {
            requestId: requestIdRef.current,
            branchId,
            invoiceType,
            concept,
            serviceDateFrom: concept === 1 ? undefined : serviceDateFrom,
            serviceDateTo: concept === 1 ? undefined : serviceDateTo,
            paymentDueDate: concept === 1 ? undefined : paymentDueDate,
            customer: { docType, docNumber, name: customerName, address: customerAddress, ivaCondition },
            items: items.map(({ description, quantity, unitPrice, vatCondition }) => ({ description, quantity, unitPrice, vatCondition })),
            paymentMethod,
        };
    }

    const handleAddItem = () => setItems((current) => [
        ...current,
        { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, vatCondition: "21" },
    ]);
    const handleRemoveItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
    const handleUpdateItem = (id: string, field: InvoiceItemField, value: InvoiceItemValue) => {
        setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    async function handleSearchCuit() {
        if (!docNumber) return;
        setIsSearching(true);
        try {
            const response = await searchCuit(Number(docNumber.replace(/\D/g, "")));
            if (response.success && "data" in response && response.data) {
                setCustomerName(response.data.name);
                setCustomerAddress(response.data.address);
                setIvaCondition(response.data.ivaCondition || "Consumidor Final");
                setInvoiceType(response.data.ivaCondition === "Responsable Inscripto" ? "A" : "B");
                toast.success(`Cliente encontrado: ${response.data.name}`);
            } else {
                toast.error(response.error || "Verificá el CUIT.");
            }
        } catch {
            toast.error("No se pudo consultar el CUIT.");
        } finally {
            setIsSearching(false);
        }
    }

    function handleReview() {
        const validation = validateAndCalculateAdminInvoice(buildInput());
        if (!validation.success) {
            toast.error(validation.error);
            return;
        }
        setStep("REVIEW");
    }

    async function handleSubmit() {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await generateAdminInvoice(buildInput());
            if (response.success && response.invoice) {
                setResult(response.invoice);
                setStep("SUCCESS");
                requestIdRef.current = crypto.randomUUID();
                toast.success("Factura autorizada y guardada correctamente.");
            } else {
                toast.error(response.error || "No se pudo emitir la factura.");
            }
        } catch {
            toast.error("Ocurrió un error inesperado. No vuelvas a emitir sin revisar ARCA.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleDocNumberChange(value: string) {
        const cleanValue = value.replace(/\D/g, "");
        setDocNumber(cleanValue);
        if (!cleanValue || cleanValue === "0") {
            setDocType("FINAL");
            setCustomerName("Consumidor Final");
            setIvaCondition("Consumidor Final");
        } else if (cleanValue.length === 11) {
            setDocType("CUIT");
        } else if (cleanValue.length === 7 || cleanValue.length === 8) {
            setDocType("DNI");
        }
    }

    function handleOpenChange(nextOpen: boolean) {
        if (isLoading) return;
        setOpen(nextOpen);
        if (!nextOpen) {
            setStep("FORM");
            setResult(null);
            requestIdRef.current = crypto.randomUUID();
        }
    }

    return {
        open, setOpen: handleOpenChange, step, setStep, result, isLoading, isSearching,
        branchId, setBranchId, invoiceType, setInvoiceType, billingEntity, setBillingEntity,
        branchesByEntity, concept, setConcept, paymentMethod, setPaymentMethod, serviceDateFrom, setServiceDateFrom,
        serviceDateTo, setServiceDateTo, paymentDueDate, setPaymentDueDate,
        docType, docNumber, setDocNumber: handleDocNumberChange, customerName, setCustomerName,
        customerAddress, setCustomerAddress, ivaCondition, items, totals,
        handleAddItem, handleRemoveItem, handleUpdateItem, handleSearchCuit, handleReview, handleSubmit,
    };
}
