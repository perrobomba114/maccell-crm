"use client";

import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getShiftSummary } from "@/lib/actions/cash-register";

// Extracted Components
import { PosHeader } from "@/components/pos/PosHeader";
import { PosCart } from "@/components/pos/PosCart";
import { PosSearch } from "@/components/pos/PosSearch";
import { RegisterDialog } from "@/components/pos/RegisterDialog";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";
import { ExpenseDialog } from "@/components/pos/ExpenseDialog";
import { TransferDialog } from "@/components/pos/TransferDialog";
import { PriceOverrideDialog } from "@/components/pos/PriceOverrideDialog";
import { type PosBranchData, usePos } from "@/hooks/use-pos";

interface PosClientProps {
    vendorId: string;
    vendorName: string;
    branchId: string;
    branchData: PosBranchData;
}

export function PosClient({ vendorId, vendorName, branchId, branchData }: PosClientProps) {
    const {
        cart, setCart, cashShift, shiftSummary,
        isRegisterModalOpen, setIsRegisterModalOpen,
        modalAction, setModalAction, amountInput, setAmountInput,
        searchQuery, setSearchQuery, products, setProducts, isSearching,
        repairQuery, setRepairQuery, repairs, isSearchingRepairs,
        bestSellers, isExpenseModalOpen, setIsExpenseModalOpen, expenseAmount, setExpenseAmount,
        expenseDescription, setExpenseDescription, isSubmittingExpense,
        isTransferModalOpen, setIsTransferModalOpen, transferTab, setTransferTab,
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
        confirmSplitSale, handleBillChange, confirmShiftAction,
        handleCreateTransfer, handleRespondTransfer, updateShiftSummary,
        cashWarningAccepted
    } = usePos(vendorId, branchId, branchData);

    const cartTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

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
                        <AlertDialogAction onClick={() => { cashWarningAccepted.current = true; confirmSplitSale(vendorName); }} className="w-full sm:w-1/2 h-14 bg-yellow-500 text-black font-black">SÍ, FACTURAR</AlertDialogAction>
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
                                updateShiftSummary(cashShift.id);
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
                onUpdateQuantity={(uid, delta) => {
                    if (delta > 0) {
                        const item = cart.find(i => i.uniqueId === uid && i.type === "PRODUCT");
                        if (item && item.maxStock !== undefined && item.quantity + delta > item.maxStock) {
                            toast.warning("Stock agotado — venta en negativo. Se notificará al administrador.");
                        }
                    }
                    setCart(prev => prev.map(i =>
                        i.uniqueId === uid && i.type === "PRODUCT"
                            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
                            : i
                    ));
                }}
                onRemoveFromCart={(uid) => setCart(prev => prev.filter(i => i.uniqueId !== uid))}
                onItemClick={(item) => { setSelectedCartItem(item); setOverridePrice(item.price.toString()); setOverrideReason(item.priceChangeReason || ""); setIsPriceOverrideModalOpen(true); }}
                onCheckoutClick={handleCheckoutClick}
                subtotal={cartTotal}
                total={cartTotal}
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
                total={cartTotal}
                subtotal={cartTotal}
                editableTotal={editableTotal} setEditableTotal={setEditableTotal}
                partialPayments={partialPayments} paymentAmountInput={paymentAmountInput} setPaymentAmountInput={setPaymentAmountInput}
                onAddPayment={handleAddPayment} onRemovePayment={(idx) => setPartialPayments(prev => prev.filter((_, i) => i !== idx))}
                isProcessingSale={isProcessingSale} onConfirm={() => confirmSplitSale(vendorName)}
                invoiceData={invoiceData} setInvoiceData={setInvoiceData}
                isInvoiceModalOpen={isInvoiceModalOpen} setIsInvoiceModalOpen={setIsInvoiceModalOpen}
                onInvoiceConfirm={(data) => {
                    if (!data.customerName?.trim()) return toast.error("Nombre del cliente requerido");
                    if (!data.salesPoint || data.salesPoint <= 0) return toast.error("Punto de venta inválido");
                    setInvoiceData(data);
                    setIsInvoiceModalOpen(false);
                    toast.success("Factura configurada");
                }}
                branchData={branchData}
            />

            <ExpenseDialog
                isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)}
                expenseAmount={expenseAmount} setExpenseAmount={setExpenseAmount}
                expenseDescription={expenseDescription} setExpenseDescription={setExpenseDescription}
                isSubmittingExpense={isSubmittingExpense}
                onSubmit={confirmShiftAction}
            />

            <TransferDialog
                isOpen={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}
                transferTab={transferTab} setTransferTab={setTransferTab}
                pendingTransfers={pendingTransfers} selectedTransferProduct={selectedTransferProduct} setSelectedTransferProduct={setSelectedTransferProduct}
                transferSearchQuery={transferSearchQuery} setTransferSearchQuery={setTransferSearchQuery}
                transferProducts={transferProducts} targetBranchId={targetBranchId} setTargetBranchId={setTargetBranchId}
                branches={branches} transferQty={transferQty} setTransferQty={setTransferQty}
                transferNotes={transferNotes} setTransferNotes={setTransferNotes}
                onCreateTransfer={handleCreateTransfer}
                onRespondTransfer={handleRespondTransfer}
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
