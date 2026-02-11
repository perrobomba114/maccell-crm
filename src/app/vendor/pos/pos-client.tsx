"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { searchProductsForPos, searchRepairsForPos, processPosSale, type PosProduct, type PosRepair } from "@/lib/actions/pos";
import { getOpenShift, openRegister, closeRegister, getShiftSummary, registerExpense, type CashShiftResult, type ShiftSummary } from "@/lib/actions/cash-register";
import { getAllBranches } from "@/actions/branch-actions";
import { createStockTransfer, getPendingTransfers, respondToTransfer } from "@/actions/transfer-actions";
import { getBestSellingProducts } from "@/actions/analytics-actions";
import { printSaleTicket, printCashShiftClosureTicket, printInvoiceTicket, printWarrantyTicket, printWetReport } from "../../../lib/print-utils";
import { type InvoiceData } from "@/components/pos/invoice-modal";

// Extracted Components
import { PosHeader } from "@/components/pos/PosHeader";
import { PosCart } from "@/components/pos/PosCart";
import { PosSearch } from "@/components/pos/PosSearch";
import { RegisterDialog } from "@/components/pos/RegisterDialog";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";
import { ExpenseDialog } from "@/components/pos/ExpenseDialog";
import { TransferDialog } from "@/components/pos/TransferDialog";
import { PriceOverrideDialog } from "@/components/pos/PriceOverrideDialog";

type CartItem = {
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

interface PosClientProps {
    vendorId: string;
    vendorName: string;
    branchId: string;
    branchData: any;
}

export function PosClient({ vendorId, vendorName, branchId, branchData }: PosClientProps) {
    // --- State Management ---
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
    const [bestSellers, setBestSellers] = useState<any[]>([]);

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
    const [branches, setBranches] = useState<any[]>([]);
    const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
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

    // --- Effects & Initialization ---
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

    // --- Core POS Logic ---
    const updateShiftSummary = async (shiftId: string) => {
        const result = await getShiftSummary(shiftId);
        if (result.success && result.summary) setShiftSummary(result.summary);
    };

    const addToCartProduct = (product: PosProduct) => {
        if (!cashShift) return toast.error("Debe abrir la caja para operar.");
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.type === "PRODUCT");
            if (existing) {
                if (existing.quantity >= product.stock) return (toast.error("Stock insuficiente"), prev);
                return prev.map(item => item.uniqueId === existing.uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                uniqueId: `prod-${product.id}`, type: "PRODUCT", id: product.id, name: product.name,
                details: product.sku, price: product.price, quantity: 1, maxStock: product.stock
            }];
        });
        toast.success("Producto agregado");
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

    const confirmSplitSale = async () => {
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
                vendorId, branchId, payments: partialPayments, total: totalToPay, paymentMethod: "SPLIT",
                invoiceData, items: cart.map(i => ({ id: i.id, type: i.type, quantity: i.quantity, price: i.price, name: i.name, originalPrice: i.originalPrice, priceChangeReason: i.priceChangeReason }))
            });
            if (result.success) {
                toast.success("¡Venta completada!", { icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> });
                if (cashShift) updateShiftSummary(cashShift.id);

                // Keep a reference to the cart before clearing it for printing
                const soldItems = [...cart];
                setCart([]);
                setIsCheckoutModalOpen(false);
                setInvoiceData(undefined);

                setTimeout(() => handlePrinting(result, totalToPay, soldItems), 150);
                setTimeout(() => handleAutomaticAttachments(soldItems), 2500);
            } else throw new Error(result.error);
        } catch (error: any) {
            toast.error(error.message || "Error al procesar venta");
        } finally {
            processingRef.current = false;
            setIsProcessingSale(false);
        }
    };

    const handlePrinting = (result: any, totalToPay: number, soldItems: CartItem[]) => {
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

    // --- Search Logic & Effects ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length < 2) return setProducts([]);
            setIsSearching(true);
            try {
                const results = await searchProductsForPos(searchQuery, branchId);
                setProducts(results);
                const exactMatch = results.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase()) || (results.length === 1 ? results[0] : null);
                if (exactMatch && cashShift) { addToCartProduct(exactMatch); setSearchQuery(""); setProducts([]); }
            } catch (err) { console.error(err); } finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, branchId, cashShift]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (repairQuery.trim().length < 2) return setRepairs([]);
            setIsSearchingRepairs(true);
            try { setRepairs(await searchRepairsForPos(repairQuery, branchId)); }
            catch (err) { console.error(err); } finally { setIsSearchingRepairs(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [repairQuery, branchId]);

    // --- Transfer Logic ---
    useEffect(() => {
        if (isTransferModalOpen) {
            getAllBranches().then(res => {
                if (res.success && res.branches) {
                    setBranches(res.branches.filter((b: any) => b.id !== branchId));
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
            searchProductsForPos(transferSearchQuery, branchId).then(setTransferProducts);
            setIsSearchingTransfer(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [transferSearchQuery, branchId]);

    // --- Render ---
    return (
        <div className="flex flex-col md:flex-row gap-4 p-4 h-[calc(100vh-4rem)] bg-zinc-950 overflow-hidden font-sans">
            <AlertDialog open={showCashConfirm} onOpenChange={setShowCashConfirm}>
                <AlertDialogContent className="w-[95vw] sm:max-w-xl bg-zinc-950 border-zinc-800 border-2 p-8">
                    <AlertDialogHeader className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                            <Banknote className="w-12 h-12 text-yellow-500" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black text-center text-yellow-500 uppercase tracking-tight">¿FACTURAR EN EFECTIVO?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-zinc-400 text-lg">Estás por registrar un pago en EFECTIVO. Se generará la factura correspondiente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
                        <AlertDialogCancel className="w-full sm:w-1/2 h-14 bg-zinc-900">VOLVER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { cashWarningAccepted.current = true; confirmSplitSale(); }} className="w-full sm:w-1/2 h-14 bg-yellow-500 text-black font-black">SÍ, FACTURAR</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="w-full md:w-2/3 flex flex-col gap-6">
                <PosHeader
                    cashShift={cashShift} shiftSummary={shiftSummary} pendingTransfers={pendingTransfers}
                    onTransferClick={() => setIsTransferModalOpen(true)}
                    onExpenseClick={() => { if (!cashShift) return toast.error("Caja cerrada"); setExpenseAmount(""); setExpenseDescription(""); setIsExpenseModalOpen(true); }}
                    onRegisterClick={async () => {
                        if (cashShift) {
                            const res = await getShiftSummary(cashShift.id);
                            if (res.success && res.summary) {
                                setShiftSummary(res.summary);
                                setModalAction("CLOSE");
                                setAmountInput("");
                                setIsRegisterModalOpen(true);
                            }
                        } else {
                            setModalAction("OPEN");
                            setAmountInput("");
                            setIsRegisterModalOpen(true);
                        }
                    }}
                />

                <PosSearch
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    repairQuery={repairQuery} setRepairQuery={setRepairQuery}
                    isSearching={isSearching} isSearchingRepairs={isSearchingRepairs}
                    cashShift={cashShift} repairs={repairs} products={products} bestSellers={bestSellers}
                    onAddRepairToCart={addRepairToCart} onAddToCartProduct={addToCartProduct}
                    onClearProducts={() => setProducts([])}
                />
            </div>

            <PosCart
                cart={cart} cashShift={cashShift}
                onUpdateQuantity={(uid, delta) => setCart(prev => prev.map(i => {
                    if (i.uniqueId === uid && i.type === "PRODUCT") {
                        const newQty = i.quantity + delta;
                        if (delta > 0 && i.maxStock !== undefined && newQty > i.maxStock) {
                            toast.error("Alcanzado stock máximo");
                            return i;
                        }
                        return { ...i, quantity: Math.max(1, newQty) };
                    }
                    return i;
                }))}
                onRemoveFromCart={(uid) => setCart(prev => prev.filter(i => i.uniqueId !== uid))}
                onItemClick={(item) => { setSelectedCartItem(item); setOverridePrice(item.price.toString()); setOverrideReason(item.priceChangeReason || ""); setIsPriceOverrideModalOpen(true); }}
                onCheckoutClick={handleCheckoutClick}
                subtotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)}
                total={cart.reduce((s, i) => s + (i.price * i.quantity), 0)}
            />

            <RegisterDialog
                isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)}
                modalAction={modalAction} amountInput={amountInput} setAmountInput={setAmountInput}
                shiftSummary={shiftSummary} billCounts={billCounts} handleBillChange={handleBillChange}
                employeeCount={employeeCount} setEmployeeCount={setEmployeeCount}
                confirmRegisterAction={confirmShiftAction}
            />

            <CheckoutDialog
                isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)}
                total={cart.reduce((s, i) => s + (i.price * i.quantity), 0)}
                subtotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)}
                editableTotal={editableTotal} setEditableTotal={setEditableTotal}
                partialPayments={partialPayments} paymentAmountInput={paymentAmountInput} setPaymentAmountInput={setPaymentAmountInput}
                onAddPayment={handleAddPayment} onRemovePayment={(idx) => setPartialPayments(prev => prev.filter((_, i) => i !== idx))}
                isProcessingSale={isProcessingSale} onConfirm={confirmSplitSale}
                invoiceData={invoiceData} setInvoiceData={setInvoiceData}
                isInvoiceModalOpen={isInvoiceModalOpen} setIsInvoiceModalOpen={setIsInvoiceModalOpen}
                onInvoiceConfirm={(data) => { setInvoiceData(data); setIsInvoiceModalOpen(false); toast.success("Factura configurada"); }}
                branchData={branchData}
            />

            <ExpenseDialog
                isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)}
                expenseAmount={expenseAmount} setExpenseAmount={setExpenseAmount}
                expenseDescription={expenseDescription} setExpenseDescription={setExpenseDescription}
                isSubmittingExpense={isSubmittingExpense}
                onSubmit={async () => {
                    const amt = parseFloat(expenseAmount);
                    if (isNaN(amt) || amt <= 0 || !expenseDescription) return toast.error("Datos inválidos");
                    setIsSubmittingExpense(true);
                    const res = await registerExpense(branchId, vendorId, amt, expenseDescription);
                    setIsSubmittingExpense(false);
                    if (res.success) { toast.success("Gasto registrado"); setIsExpenseModalOpen(false); if (cashShift) updateShiftSummary(cashShift.id); }
                    else toast.error(res.error);
                }}
            />

            <TransferDialog
                isOpen={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}
                transferTab={transferTab} setTransferTab={setTransferTab}
                pendingTransfers={pendingTransfers} selectedTransferProduct={selectedTransferProduct} setSelectedTransferProduct={setSelectedTransferProduct}
                transferSearchQuery={transferSearchQuery} setTransferSearchQuery={setTransferSearchQuery}
                transferProducts={transferProducts} targetBranchId={targetBranchId} setTargetBranchId={setTargetBranchId}
                branches={branches} transferQty={transferQty} setTransferQty={setTransferQty}
                transferNotes={transferNotes} setTransferNotes={setTransferNotes}
                onCreateTransfer={async () => {
                    const qty = parseInt(transferQty);
                    if (!selectedTransferProduct || !targetBranchId || isNaN(qty)) return toast.error("Datos incompletos");
                    const res = await createStockTransfer({ sourceBranchId: branchId, targetBranchId, productId: selectedTransferProduct.id, quantity: qty, notes: transferNotes, userId: vendorId });
                    if (res.success) { toast.success("Transferencia enviada"); setIsTransferModalOpen(false); }
                    else toast.error(res.error);
                }}
                onRespondTransfer={async (id, action) => {
                    const res = await respondToTransfer(id, action, vendorId);
                    if (res.success) {
                        toast.success("Respuesta enviada");
                        getPendingTransfers(branchId).then(r => {
                            if (r.success && r.transfers) {
                                setPendingTransfers(r.transfers);
                            }
                        });
                    }
                }}
            />

            <PriceOverrideDialog
                isOpen={isPriceOverrideModalOpen} onClose={() => setIsPriceOverrideModalOpen(false)}
                selectedItem={selectedCartItem} overridePrice={overridePrice} setOverridePrice={setOverridePrice}
                overrideReason={overrideReason} setOverrideReason={setOverrideReason}
                onConfirm={() => {
                    if (!selectedCartItem) return;
                    const price = parseFloat(overridePrice);
                    if (isNaN(price) || price < 0) return toast.error("Precio inválido");
                    if (price !== (selectedCartItem.originalPrice || selectedCartItem.price) && !overrideReason) return toast.error("Indique motivo");
                    setCart(prev => prev.map(i => i.uniqueId === selectedCartItem.uniqueId ? { ...i, price, originalPrice: i.originalPrice || i.price, priceChangeReason: overrideReason } : i));
                    setIsPriceOverrideModalOpen(false);
                }}
            />
        </div>
    );
}
