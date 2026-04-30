"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { generateAdminInvoice, searchCuit } from "@/lib/actions/admin-invoice";
import type { InvoiceBranchOption, InvoiceItemField, InvoiceItemForm, InvoiceItemValue } from "@/types/invoice-form";

export function useInvoiceForm(branches: InvoiceBranchOption[], userId: string, initialBranchId?: string) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Form State
    const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || "");
    const [salesPoint, setSalesPoint] = useState("10");
    const [invoiceType, setInvoiceType] = useState<"A" | "B">("B");
    const [billingEntity, setBillingEntity] = useState<"MACCELL" | "8BIT">("MACCELL");
    const [concept, setConcept] = useState<1 | 2 | 3>(1);

    // Dates for Services
    const today = new Date().toISOString().split('T')[0];
    const [serviceDateFrom, setServiceDateFrom] = useState(today);
    const [serviceDateTo, setServiceDateTo] = useState(today);
    const [paymentDueDate, setPaymentDueDate] = useState(today);

    // Customer
    const [docType, setDocType] = useState<"CUIT" | "DNI" | "FINAL">("FINAL");
    const [docNumber, setDocNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [ivaCondition, setIvaCondition] = useState("");

    // Items
    const [items, setItems] = useState<InvoiceItemForm[]>([
        { id: "1", description: "", quantity: 1, unitPrice: 0, vatCondition: "21" }
    ]);

    // Totals
    const [totals, setTotals] = useState({ net: 0, vat: 0, total: 0 });

    useEffect(() => {
        let net = 0;
        let vat = 0;

        items.forEach(item => {
            const totalItem = item.quantity * item.unitPrice;
            const rate = item.vatCondition === "21" ? 1.21 : 1.105;
            const itemNet = totalItem / rate;
            const itemVat = totalItem - itemNet;

            net += itemNet;
            vat += itemVat;
        });

        setTotals({
            net: Math.round(net * 100) / 100,
            vat: Math.round(vat * 100) / 100,
            total: Math.round((net + vat) * 100) / 100
        });
    }, [items]);

    const handleAddItem = () => {
        setItems([...items, {
            id: Math.random().toString(),
            description: "",
            quantity: 1,
            unitPrice: 0,
            vatCondition: "21"
        }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleUpdateItem = (id: string, field: InvoiceItemField, value: InvoiceItemValue) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSearchCuit = async () => {
        if (!docNumber) return;
        setIsSearching(true);
        try {
            const cuitNum = parseInt(docNumber.replace(/\D/g, ''));
            const res = await searchCuit(cuitNum);

            if (res.success && res.data) {
                setCustomerName(res.data.name);
                setCustomerAddress(res.data.address);
                setIvaCondition(res.data.ivaCondition || "Consumidor Final");

                if (res.data.ivaCondition === "Responsable Inscripto") {
                    setInvoiceType("A");
                } else {
                    setInvoiceType("B");
                }
                toast.success("Cliente encontrado: " + res.data.name);
            } else {
                toast.error(res.error || "Verifique el CUIT");
            }
        } catch (error) {
            toast.error("Error al buscar CUIT");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const res = await generateAdminInvoice({
                userId,
                branchId,
                salesPoint: parseInt(salesPoint),
                invoiceType,
                concept,
                serviceDateFrom: concept === 1 ? undefined : serviceDateFrom,
                serviceDateTo: concept === 1 ? undefined : serviceDateTo,
                paymentDueDate: concept === 1 ? undefined : paymentDueDate,
                customer: {
                    docType,
                    docNumber,
                    name: customerName,
                    address: customerAddress,
                    ivaCondition
                },
                items: items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    vatCondition: i.vatCondition
                })),
                paymentMethod: "CASH",
                billingEntity
            });

            if (res.success) {
                toast.success("Factura Generada Correctamente");
                setOpen(false);
            } else {
                toast.error(res.error || "Error al generar factura");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDocNumberChange = (val: string) => {
        const cleanVal = val.replace(/\D/g, '');
        setDocNumber(cleanVal);

        if (cleanVal.length === 0 || cleanVal === "0") {
            setDocType("FINAL");
        } else if (cleanVal.length === 11) {
            setDocType("CUIT");
        } else if (cleanVal.length === 7 || cleanVal.length === 8) {
            setDocType("DNI");
        }
    };

    return {
        open, setOpen, isLoading, isSearching,
        branchId, setBranchId, salesPoint, setSalesPoint,
        invoiceType: invoiceType as "A" | "B", setInvoiceType,
        billingEntity: billingEntity as "MACCELL" | "8BIT", setBillingEntity,
        concept: concept as 1 | 2 | 3, setConcept,
        serviceDateFrom, setServiceDateFrom,
        serviceDateTo, setServiceDateTo, paymentDueDate, setPaymentDueDate,
        docType, docNumber, setDocNumber: handleDocNumberChange,
        customerName, setCustomerName, customerAddress, setCustomerAddress,
        ivaCondition, items, totals,
        handleAddItem, handleRemoveItem, handleUpdateItem,
        handleSearchCuit, handleSubmit
    };
}
