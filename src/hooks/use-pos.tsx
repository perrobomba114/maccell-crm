"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { searchProductsForPos, searchRepairsForPos, processPosSale, type PosProduct, type PosRepair } from "@/lib/actions/pos";
import { getOpenShift, openRegister, closeRegister, getShiftSummary, registerExpense, type CashShiftResult, type ShiftSummary } from "@/lib/actions/cash-register";
import { getAllBranches } from "@/actions/branch-actions";
import { createStockTransfer, getPendingTransfers, respondToTransfer } from "@/actions/transfer-actions";
import { getBestSellingProducts } from "@/actions/analytics-actions";
import { printSaleTicket, printCashShiftClosureTicket, printInvoiceTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";
import { type InvoiceData } from "@/components/pos/invoice-modal";

export type CartItem = {
    uniqueId: string;
    type: "PRODUCT" | "REPAIR";
    id: string;
    name: string;
    details?: string;
    price: number;
    quantity: number;
    maxStock?: number;
    originalPrice?: number;
    priceChangeReason?: string;
    isWet?: boolean;
};

export type PosBranchData = {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    ticketPrefix?: string;
};

type PendingTransfer = {
    id: string;
    quantity: number;
    notes?: string | null;
    product: { name: string };
    sourceBranch?: { name: string } | null;
    createdBy?: { name: string } | null;
};

type PosSaleResult = Awaited<ReturnType<typeof processPosSale>>;

export function usePos(vendorId: string, branchId: string, branchData: PosBranchData) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cashShift, setCashShift] = useState<CashShiftResult | null>(null);
    const [isLoadingShift, setIsLoadingShift] = useState(true);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<"OPEN" | "CLOSE">("OPEN");
    const [amountInput, setAmountInput] = useState("");
    const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);

    // Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<PosProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [repairQuery, setRepairQuery] = useState("");
    const [repairs, setRepairs] = useState<PosRepair[]>([]);
    const [isSearchingRepairs, setIsSearchingRepairs] = useState(false);
    const [bestSellers, setBestSellers] = useState<PosProduct[]>([]);

    // Modals & Forms
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTab, setTransferTab] = useState<"NEW" | "INCOMING">("NEW");
    const [transferSearchQuery, setTransferSearchQuery] = useState("");
    const [transferProducts, setTransferProducts] = useState<PosProduct[]>([]);
    const [selectedTransferProduct, setSelectedTransferProduct] = useState<PosProduct | null>(null);
    const [targetBranchId, setTargetBranchId] = useState("");
    const [transferQty, setTransferQty] = useState("");
    const [transferNotes, setTransferNotes] = useState("");
    const [branches, setBranches] = useState<PosBranchData[]>([]);
    const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
    const [isSearchingTransfer, setIsSearchingTransfer] = useState(false);

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [editableTotal, setEditableTotal] = useState("");
    const [paymentAmountInput, setPaymentAmountInput] = useState("");
    const [partialPayments, setPartialPayments] = useState<{ method: "CASH" | "CARD" | "MERCADOPAGO", amount: number }[]>([]);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | undefined>(undefined);
    const [showCashConfirm, setShowCashConfirm] = useState(false);

    const [isPriceOverrideModalOpen, setIsPriceOverrideModalOpen] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
    const [overridePrice, setOverridePrice] = useState("");
    const [overrideReason, setOverrideReason] = useState("");

    const [billCounts, setBillCounts] = useState<Record<number, number>>({});
    const [employeeCount, setEmployeeCount] = useState(1);

    const processingRef = useRef(false);
    const cashWarningAccepted = useRef(false);

    useEffect(() => {
        if (branchId) {
            getBestSellingProducts(branchId).then(setBestSellers);
            loadInitialData();
        }
    }, [branchId, vendorId]);

    const loadInitialData = async () => {
        setIsLoadingShift(true);
        const shift = await getOpenShift(vendorId);
        setCashShift(shift);
        if (shift) updateShiftSummary(shift.id);
        setIsLoadingShift(false);
    };

    const updateShiftSummary = async (shiftId: string) => {
        const result = await getShiftSummary(shiftId);
        if (result.success && result.summary) setShiftSummary(result.summary);
    };

    const addToCartProduct = (product: PosProduct) => {
        if (!cashShift) return toast.error("Debe abrir la caja para operar.");
        const existing = cart.find(item => item.id === product.id && item.type === "PRODUCT");
        if (existing) {
            if (existing.quantity >= product.stock) {
                toast.warning("Stock agotado — venta en negativo. Se notificará al administrador.");
            } else {
                toast.success("Producto agregado");
            }
            setCart(prev => prev.map(item => item.uniqueId === existing.uniqueId ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart(prev => [...prev, {
                uniqueId: `prod-${product.id}`, type: "PRODUCT", id: product.id, name: product.name,
                details: product.sku, price: product.price, quantity: 1, maxStock: product.stock
            }]);
            if (product.stock <= 0) {
                toast.warning("Sin stock — venta en negativo. Se notificará al administrador.");
            } else {
                toast.success("Producto agregado");
            }
        }
    };

    const addRepairToCart = (repair: PosRepair) => {
        if (!cashShift) return toast.error("Debe abrir la caja para operar.");
        if (cart.some(item => item.id === repair.id && item.type === "REPAIR")) return toast.error("La reparación ya está en el carrito");
        setCart(prev => [...prev, {
            uniqueId: `rep-${repair.id}`, type: "REPAIR", id: repair.id, name: `Ticket #${repair.ticketNumber}`,
            details: `${repair.device} - ${repair.customerName}`, price: repair.price, quantity: 1, isWet: repair.isWet
        }]);
        setRepairQuery("");
        toast.success("Reparación agregada");
    };

    const handleCheckoutClick = () => {
        if (!cashShift) return toast.error("Caja cerrada.");
        if (cart.length === 0) return;
        const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setEditableTotal(currentTotal.toString());
        setPaymentAmountInput(currentTotal.toString());
        setPartialPayments([]);
        cashWarningAccepted.current = false;
        setIsCheckoutModalOpen(true);
    };

    const handleAddPayment = (method: "CASH" | "CARD" | "MERCADOPAGO") => {
        const totalToPay = parseFloat(editableTotal);
        const amountToPay = parseFloat(paymentAmountInput);
        if (isNaN(totalToPay) || isNaN(amountToPay) || amountToPay <= 0) return toast.error("Monto inválido");
        const paidSoFar = partialPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = totalToPay - paidSoFar;
        if (amountToPay > remaining + 0.01) return toast.error("Monto excede el restante");
        const newPayments = [...partialPayments, { method, amount: amountToPay }];
        setPartialPayments(newPayments);
        const nextRemaining = totalToPay - (paidSoFar + amountToPay);
        setPaymentAmountInput(nextRemaining > 0 ? nextRemaining.toString() : "0");
    };

    const confirmSplitSale = async (vendorName: string) => {
        if (processingRef.current) return;
        if (invoiceData && partialPayments.some(p => p.method === "CASH") && !cashWarningAccepted.current) {
            setShowCashConfirm(true);
            return;
        }
        processingRef.current = true;
        setIsProcessingSale(true);
        try {
            const totalToPay = parseFloat(editableTotal);
            const paidSoFar = partialPayments.reduce((acc, p) => acc + p.amount, 0);
            if (Math.abs(paidSoFar - totalToPay) > 1) throw new Error("Monto no cubierto");
            const result = await processPosSale({
                vendorId, branchId, payments: partialPayments as { method: "CASH" | "CARD" | "MERCADOPAGO", amount: number }[], total: totalToPay, paymentMethod: "SPLIT",
                invoiceData, items: cart.map(i => ({ id: i.id, type: i.type, quantity: i.quantity, price: i.price, name: i.name, originalPrice: i.originalPrice, priceChangeReason: i.priceChangeReason }))
            });
            if (result.success) {
                toast.success("¡Venta completada!", { icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> });
                if (cashShift) updateShiftSummary(cashShift.id);

                const soldItems = [...cart];
                setCart([]);
                setIsCheckoutModalOpen(false);
                setInvoiceData(undefined);

                setTimeout(() => handlePrinting(result, totalToPay, soldItems, vendorName), 150);
                setTimeout(() => handleAutomaticAttachments(soldItems), 2500);
            } else throw new Error(result.error);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Error al procesar venta");
        } finally {
            processingRef.current = false;
            setIsProcessingSale(false);
        }
    };

    const handlePrinting = (result: PosSaleResult, totalToPay: number, soldItems: CartItem[], vendorName: string) => {
        if (!result.success) return;
        if (result.invoice) {
            printInvoiceTicket({
                branch: branchData, items: soldItems, total: totalToPay, paymentMethod: partialPayments.length === 1 ? partialPayments[0].method : "SPLIT",
                invoice: { type: invoiceData?.invoiceType || "B", number: result.invoice.number, cae: result.invoice.cae, caeExpiresAt: result.invoice.caeExpiresAt ? new Date(result.invoice.caeExpiresAt) : new Date(), customerName: invoiceData?.customerName || "Consumidor Final", customerDocType: invoiceData?.docType || "FINAL", customerDoc: invoiceData?.docNumber || "0", customerAddress: invoiceData?.customerAddress || "", salesPoint: invoiceData?.salesPoint || 1 },
                vendorName, date: new Date(), billingEntity: branchData.name.toUpperCase().includes("8 BIT") ? "8BIT" : "MACCELL", customerIvaCondition: invoiceData?.ivaCondition
            });
        } else {
            printSaleTicket({ branch: branchData, items: soldItems, total: totalToPay, method: partialPayments.length === 1 ? partialPayments[0].method : "SPLIT", date: new Date(), saleId: result.saleId, vendorName });
        }
    };

    const handleAutomaticAttachments = (oldCart: CartItem[]) => {
        oldCart.filter(i => i.type === "REPAIR").forEach((item, idx) => {
            setTimeout(() => {
                const parts = item.details?.split(" - ") || [];
                const repairStub = { ticketNumber: item.name.replace("Ticket #", ""), deviceBrand: parts[0] || "Eq", deviceModel: "", customer: { name: parts[1] || "Cl" }, isWet: item.isWet, branch: branchData };
                printWarrantyTicket(repairStub);
                if (item.isWet) setTimeout(() => printWetReport(repairStub), 1200);
            }, idx * 2500);
        });
    };

    const handleBillChange = (denom: number, count: number) => {
        setBillCounts(prev => {
            const next = { ...prev, [denom]: count };
            const total = Object.entries(next).reduce((acc, [d, c]) => acc + (Number(d) * Number(c)), 0);
            setAmountInput(total.toString());
            return next;
        });
    };

    const confirmShiftAction = async () => {
        const val = parseFloat(amountInput.replace(/\./g, "").replace(",", ".")) || 0;
        if (modalAction === "OPEN") {
            const res = await openRegister(vendorId, branchId, val);
            if (res.success) (toast.success("Caja abierta"), loadInitialData(), setIsRegisterModalOpen(false));
            else toast.error(res.error || "Error al abrir caja");
        } else {
            if (!cashShift || !shiftSummary) return;
            const res = await closeRegister(cashShift.id, val, employeeCount);
            if (res.success) {
                printCashShiftClosureTicket({ branch: branchData, user: { name: "Cajero" }, shift: { startAmount: cashShift.startAmount, startTime: cashShift.startTime }, summary: shiftSummary, billCounts, finalCount: val, employeeCount });
                toast.success("Caja cerrada"); setBillCounts({}); loadInitialData(); setIsRegisterModalOpen(false);
            } else toast.error(res.error || "Error al cerrar caja");
        }
    };

    const handleSubmitExpense = async () => {
        if (!cashShift) {
            toast.error("Caja cerrada");
            return;
        }

        const amount = parseFloat(expenseAmount.replace(/\./g, "").replace(",", "."));
        const description = expenseDescription.trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Monto de gasto inválido");
            return;
        }

        if (!description) {
            toast.error("Ingrese una descripción del gasto");
            return;
        }

        setIsSubmittingExpense(true);
        try {
            const res = await registerExpense(branchId, vendorId, amount, description);
            if (!res.success) {
                toast.error(res.error || "Error al registrar gasto");
                return;
            }

            toast.success("Gasto registrado");
            setExpenseAmount("");
            setExpenseDescription("");
            setIsExpenseModalOpen(false);
            await updateShiftSummary(cashShift.id);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Error inesperado al registrar gasto");
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    // Search Effects
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length < 2) return setProducts([]);
            setIsSearching(true);
            try {
                const raw = await searchProductsForPos(searchQuery, branchId);
                const results = raw.filter(p => p.id && p.name && typeof p.price === 'number' && p.price >= 0 && typeof p.stock === 'number');
                setProducts(results);
                const exactMatch = results.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase()) || (results.length === 1 ? results[0] : null);
                if (exactMatch && cashShift) { addToCartProduct(exactMatch); setSearchQuery(""); setProducts([]); }
            } catch (err) { console.error(err); toast.error("Error al buscar productos."); } finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, branchId, cashShift]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (repairQuery.trim().length < 2) return setRepairs([]);
            setIsSearchingRepairs(true);
            try { setRepairs(await searchRepairsForPos(repairQuery, branchId)); }
            catch (err) { console.error(err); toast.error("Error al buscar reparaciones."); } finally { setIsSearchingRepairs(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [repairQuery, branchId]);

    // Transfer Logic
    useEffect(() => {
        if (isTransferModalOpen) {
            getAllBranches().then(res => {
                if (res.success && res.branches) {
                    setBranches(res.branches.filter((b) => b.id !== branchId));
                }
            });
            getPendingTransfers(branchId).then(res => {
                if (res.success && res.transfers) {
                    setPendingTransfers(res.transfers);
                }
            });
        }
    }, [isTransferModalOpen, branchId]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (transferSearchQuery.trim().length < 2) return setTransferProducts([]);
            setIsSearchingTransfer(true);
            try {
                const results = await searchProductsForPos(transferSearchQuery, branchId);
                setTransferProducts(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingTransfer(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [transferSearchQuery, branchId]);

    const handleCreateTransfer = async () => {
        try {
            const qty = parseInt(transferQty);
            if (!selectedTransferProduct || !targetBranchId || isNaN(qty) || qty <= 0) return toast.error("Datos incompletos");
            const res = await createStockTransfer({ sourceBranchId: branchId, targetBranchId, productId: selectedTransferProduct.id, quantity: qty, notes: transferNotes, userId: vendorId });
            if (res.success) {
                toast.success("Transferencia enviada");
                setIsTransferModalOpen(false);
            } else {
                toast.error(res.error || "Error al crear la transferencia");
            }
        } catch (error) {
            toast.error("Error inesperado al crear transferencia");
        }
    };

    const handleRespondTransfer = async (id: string, action: "ACCEPT" | "REJECT") => {
        try {
            const res = await respondToTransfer(id, action, vendorId);
            if (res.success) {
                toast.success("Respuesta enviada");
                getPendingTransfers(branchId).then(r => {
                    if (r.success && r.transfers) {
                        setPendingTransfers(r.transfers);
                    }
                });
            } else {
                toast.error(res.error || "Error al procesar la respuesta a la transferencia");
            }
        } catch (error) {
            toast.error("Error inesperado al responder transferencia");
        }
    };

    return {
        cart, setCart, cashShift, isLoadingShift, isRegisterModalOpen, setIsRegisterModalOpen,
        modalAction, setModalAction, amountInput, setAmountInput, shiftSummary,
        searchQuery, setSearchQuery, products, setProducts, isSearching,
        repairQuery, setRepairQuery, repairs, setRepairs, isSearchingRepairs,
        bestSellers, isExpenseModalOpen, setIsExpenseModalOpen, expenseAmount, setExpenseAmount,
        expenseDescription, setExpenseDescription, isSubmittingExpense,
        isTransferModalOpen, setIsTransferModalOpen, transferTab: transferTab as "NEW" | "INCOMING", setTransferTab,
        transferSearchQuery, setTransferSearchQuery, transferProducts, selectedTransferProduct, setSelectedTransferProduct,
        targetBranchId, setTargetBranchId, transferQty, setTransferQty, transferNotes, setTransferNotes,
        branches, pendingTransfers, isSearchingTransfer,
        isCheckoutModalOpen, setIsCheckoutModalOpen, isProcessingSale,
        editableTotal, setEditableTotal, paymentAmountInput, setPaymentAmountInput,
        partialPayments, setPartialPayments, isInvoiceModalOpen, setIsInvoiceModalOpen,
        invoiceData, setInvoiceData, showCashConfirm, setShowCashConfirm,
        isPriceOverrideModalOpen, setIsPriceOverrideModalOpen, selectedCartItem, setSelectedCartItem,
        overridePrice, setOverridePrice, overrideReason, setOverrideReason,
        billCounts, employeeCount, setEmployeeCount,
        addToCartProduct, addRepairToCart, handleCheckoutClick, handleAddPayment,
        confirmSplitSale, handleBillChange, confirmShiftAction, handleSubmitExpense,
        handleCreateTransfer, handleRespondTransfer, updateShiftSummary, loadInitialData,
        cashWarningAccepted
    };
}
