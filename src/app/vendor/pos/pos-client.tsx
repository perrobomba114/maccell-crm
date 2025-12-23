"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Search, ShoppingCart, Smartphone, Monitor, CheckCircle2, PackageSearch, CreditCard, X, Lock, Unlock, DollarSign, Printer, Store, MapPin, Phone, Banknote, ArrowRight, TrendingDown, ArrowRightLeft, Truck, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    searchProductsForPos,
    searchRepairsForPos,
    processPosSale,
    type PosProduct,
    type PosRepair
} from "@/lib/actions/pos";
import { createExpense } from "@/actions/expenses-actions";
import {
    getOpenShift,
    openRegister,
    closeRegister,
    getShiftSummary,
    registerExpense,
    type CashShiftResult,
    type ShiftSummary
} from "@/lib/actions/cash-register";
import { getAllBranches } from "@/actions/branch-actions";
import { createStockTransfer, getPendingTransfers, respondToTransfer } from "@/actions/transfer-actions";

import { printSaleTicket, printCashShiftClosureTicket } from "../../../lib/print-utils";


// ... existing imports


import { cn } from "@/lib/utils";

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
};

interface BranchData {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    imageUrl: string | null;
}

interface PosClientProps {
    vendorId: string;
    vendorName: string;
    branchId: string;
    branchData: BranchData;
}

export function PosClient({ vendorId, vendorName, branchId, branchData }: PosClientProps) {
    // State
    const [cart, setCart] = useState<CartItem[]>([]);


    // Cash Register State
    const [cashShift, setCashShift] = useState<CashShiftResult | null>(null);
    const [isLoadingShift, setIsLoadingShift] = useState(true);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<"OPEN" | "CLOSE">("OPEN");
    const [amountInput, setAmountInput] = useState("");
    const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);

    // Expense State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);



    // Product Search
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<PosProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Repair Search
    const [repairQuery, setRepairQuery] = useState("");
    const [repairs, setRepairs] = useState<PosRepair[]>([]);
    const [isSearchingRepairs, setIsSearchingRepairs] = useState(false);
    const [showRepairResults, setShowRepairResults] = useState(false);

    // Checkout Modal State
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [lastSaleId, setLastSaleId] = useState<string | null>(null);
    const [lastSale, setLastSale] = useState<any>(null); // Store last sale for auto-printing
    const [targetBranchId, setTargetBranchId] = useState("");
    const [transferSearchQuery, setTransferSearchQuery] = useState("");
    const [branches, setBranches] = useState<any[]>([]);
    const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
    const [selectedTransferProduct, setSelectedTransferProduct] = useState<PosProduct | null>(null);
    const [transferQty, setTransferQty] = useState("");
    const [transferNotes, setTransferNotes] = useState("");
    const [transferTab, setTransferTab] = useState<"NEW" | "INCOMING">("NEW");
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferProducts, setTransferProducts] = useState<PosProduct[]>([]);
    const [isSearchingTransfer, setIsSearchingTransfer] = useState(false);

    // Price Override State
    const [isPriceOverrideModalOpen, setIsPriceOverrideModalOpen] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
    const [overridePrice, setOverridePrice] = useState("");

    const [overrideReason, setOverrideReason] = useState("");

    // Split Payment State
    const [partialPayments, setPartialPayments] = useState<{ method: "CASH" | "CARD" | "MERCADOPAGO", amount: number }[]>([]);
    const [editableTotal, setEditableTotal] = useState("");
    const [paymentAmountInput, setPaymentAmountInput] = useState(""); // Amount to pay in current transaction step




    // Bill Counting State
    const [billCounts, setBillCounts] = useState<Record<number, number>>({});
    const [employeeCount, setEmployeeCount] = useState(1);

    // Best Sellers State
    const [bestSellers, setBestSellers] = useState<any[]>([]);

    useEffect(() => {
        if (branchId) {
            import("@/actions/analytics-actions").then(({ getBestSellingProducts }) => {
                getBestSellingProducts(branchId).then(setBestSellers);
            });
        }
    }, [branchId]);

    const handleBillChange = (denom: number, count: number) => {
        setBillCounts(prev => {
            const next = { ...prev, [denom]: count };

            // Recalculate total immediately
            let total = 0;
            // Iterate known denoms or just entries
            for (const [d, c] of Object.entries(next)) {
                total += Number(d) * Number(c);
            }
            setAmountInput(total.toString());

            return next;
        });
    };

    // Initial Load: Check Register
    useEffect(() => {
        checkRegister();
    }, [vendorId]);

    const checkRegister = async () => {
        setIsLoadingShift(true);
        const shift = await getOpenShift(vendorId);
        setCashShift(shift);
        setIsLoadingShift(false);

        // Also fetch summary if shift is open
        if (shift) {
            updateShiftSummary(shift.id);
        }
    }

    const updateShiftSummary = async (shiftId: string) => {
        const result = await getShiftSummary(shiftId);
        if (result.success && result.summary) {
            setShiftSummary(result.summary);
        }
    }

    const handleRegisterClick = async () => {
        if (cashShift) {
            // Prepare to close
            const result = await getShiftSummary(cashShift.id);
            if (result.success && result.summary) {
                setShiftSummary(result.summary);
                setModalAction("CLOSE");
                setAmountInput("");
                setIsRegisterModalOpen(true);
            } else {
                toast.error("Error obteniendo resumen de caja");
            }
        } else {
            // Prepare to open
            setModalAction("OPEN");
            setAmountInput("");
            setIsRegisterModalOpen(true);
        }
    };

    const confirmRegisterAction = async () => {
        const val = parseFloat(amountInput) || 0;

        if (modalAction === "OPEN") {
            const res = await openRegister(vendorId, branchId, val);
            if (res.success) {
                toast.success("Caja abierta correctamente.");
                checkRegister();
                setIsRegisterModalOpen(false);
            } else {
                toast.error(res.error || "Error al abrir caja.");
            }
        } else {
            if (!cashShift) return;
            if (!shiftSummary) return;

            const res = await closeRegister(cashShift.id, val, employeeCount);
            if (res.success) {
                printCashShiftClosureTicket({
                    branch: branchData,
                    user: { name: "Cajero" },
                    shift: {
                        startAmount: cashShift.startAmount,
                        startTime: cashShift.startTime
                    },
                    summary: shiftSummary,
                    billCounts: billCounts,
                    finalCount: val,
                    employeeCount: employeeCount
                });

                toast.success("Caja cerrada correctamente.");
                checkRegister();
                setIsRegisterModalOpen(false);
            } else {
                toast.error(res.error || "Error al cerrar caja.");
            }
        }
    };

    const handleAddExpense = () => {
        if (!cashShift) {
            toast.error("Debe abrir la caja para registrar gastos.");
            return;
        }
        setExpenseAmount("");
        setExpenseDescription("");
        setIsExpenseModalOpen(true);
    };

    const submitExpense = async () => {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Monto inválido");
            return;
        }
        if (!expenseDescription || expenseDescription.trim().length < 3) {
            toast.error("Ingrese una descripción válida");
            return;
        }

        setIsSubmittingExpense(true);
        const res = await registerExpense(branchId, vendorId, amount, expenseDescription);
        setIsSubmittingExpense(false);

        if (res.success) {
            toast.success("Gasto registrado");
            setIsExpenseModalOpen(false);
            setExpenseAmount("");
            setExpenseDescription("");
        } else {
            toast.error(res.error || "Error al registrar gasto");
        }
    };

    const handleCreateTransfer = async () => {
        if (!selectedTransferProduct || !targetBranchId || !transferQty) {
            toast.error("Complete todos los campos.");
            return;
        }
        const qty = parseInt(transferQty);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Cantidad inválida.");
            return;
        }
        if (selectedTransferProduct.stock < qty) {
            toast.error("Stock insuficiente.");
            return;
        }

        const res = await createStockTransfer({
            sourceBranchId: branchId,
            targetBranchId: targetBranchId,
            productId: selectedTransferProduct.id,
            quantity: qty,
            notes: transferNotes || undefined,
            userId: vendorId
        });

        if (res.success) {
            toast.success("Transferencia enviada.");
            setIsTransferModalOpen(false);
            setTransferQty("");
            setTransferNotes("");
            setSelectedTransferProduct(null);
            setTransferSearchQuery("");
        } else {
            toast.error(res.error || "Error al crear transferencia.");
        }
    };

    const loadTransferData = async () => {
        try {
            const [allBranches, pending] = await Promise.all([
                getAllBranches(),
                getPendingTransfers(branchId)
            ]);

            if (allBranches.success && allBranches.branches) {
                // Filter out current branch
                setBranches(allBranches.branches.filter((b: any) => b.id !== branchId));
            }
            if (pending.success && pending.transfers) {
                setPendingTransfers(pending.transfers);
            }
        } catch (error) {
            console.error("Error loading transfer data", error);
            toast.error("Error cargando datos de transferencia");
        }
    };

    useEffect(() => {
        if (isTransferModalOpen) {
            loadTransferData();
        }
    }, [isTransferModalOpen]);

    // Independent Search for Transfer Modal
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (transferSearchQuery.trim().length >= 2) {
                setIsSearchingTransfer(true);
                try {
                    const results = await searchProductsForPos(transferSearchQuery, branchId);
                    setTransferProducts(results);
                } catch (error) {
                    console.error("[PosClient] Transfer search error:", error);
                }
                setIsSearchingTransfer(false);
            } else {
                setTransferProducts([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [transferSearchQuery, branchId]);

    const handleRespondTransfer = async (transferId: string, action: "ACCEPT" | "REJECT") => {
        const res = await respondToTransfer(transferId, action, vendorId);
        if (res.success) {
            toast.success(`Transferencia ${action === "ACCEPT" ? "aceptada" : "rechazada"}`);
            loadTransferData(); // Refresh list
        } else {
            toast.error(res.error || "Error al responder transferencia");
        }
    };


    // Handlers
    const addToCartProduct = (product: PosProduct) => {
        if (!cashShift) {
            toast.error("Debe abrir la caja para operar.");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.type === "PRODUCT");
            if (existing) {
                if (existing.quantity >= product.stock) {
                    toast.error("Stock insuficiente");
                    return prev;
                }
                return prev.map(item =>
                    item.uniqueId === existing.uniqueId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                uniqueId: `prod-${product.id}`,
                type: "PRODUCT",
                id: product.id,
                name: product.name,
                details: product.sku,
                price: product.price,
                quantity: 1,
                maxStock: product.stock
            }];
        });
        toast.success("Producto agregado");
    };

    const addRepairToCart = (repair: PosRepair) => {
        if (!cashShift) {
            toast.error("Debe abrir la caja para operar.");
            return;
        }

        if (cart.some(item => item.id === repair.id && item.type === "REPAIR")) {
            toast.error("Esta reparación ya está en el carrito");
            return;
        }

        setCart(prev => [...prev, {
            uniqueId: `rep-${repair.id}`,
            type: "REPAIR",
            id: repair.id,
            name: `Ticket #${repair.ticketNumber}`,
            details: `${repair.device} - ${repair.customerName}`,
            price: repair.price,
            quantity: 1
        }]);

        setRepairQuery("");
        setShowRepairResults(false);
        toast.success("Reparación agregada");
    };

    const removeFromCart = (uniqueId: string) => {
        setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
    };

    const updateQuantity = (uniqueId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.uniqueId !== uniqueId) return item;
            if (item.type === "REPAIR") return item;
            const newQty = item.quantity + delta;
            if (newQty < 1) return item;
            if (item.maxStock && newQty > item.maxStock) {
                toast.error("Stock máximo alcanzado");
                return item;
            }
            return { ...item, quantity: newQty };
        }));
    };

    const handleItemClick = (item: CartItem) => {
        setSelectedCartItem(item);
        setOverridePrice(item.price.toString());
        setOverrideReason(item.priceChangeReason || "");
        setIsPriceOverrideModalOpen(true);
    };

    const confirmPriceOverride = () => {
        if (!selectedCartItem) return;
        const newPrice = parseFloat(overridePrice);
        if (isNaN(newPrice) || newPrice < 0) {
            toast.error("Precio inválido");
            return;
        }

        // If price changed, require reason
        const originalPrice = selectedCartItem.originalPrice || selectedCartItem.price;
        if (newPrice !== originalPrice && (!overrideReason || overrideReason.trim().length < 3)) {
            toast.error("Debe ingresar un motivo para el cambio de precio");
            return;
        }

        setCart(prev => prev.map(item => {
            if (item.uniqueId !== selectedCartItem.uniqueId) return item;
            return {
                ...item,
                price: newPrice,
                originalPrice: item.originalPrice || item.price, // Keep original if exists, or set first time
                priceChangeReason: overrideReason
            };
        }));

        setIsPriceOverrideModalOpen(false);
        toast.success("Precio actualizado");
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal;

    // Debounce Product Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const results = await searchProductsForPos(searchQuery, branchId);
                    setProducts(results);

                    const match = results.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
                    if (match) {
                        if (cashShift) {
                            addToCartProduct(match);
                            setSearchQuery("");
                            setProducts([]);
                        } else {
                            toast.error("Caja cerrada. Abra la caja para agregar items.");
                        }
                    }

                } catch (error) {
                    console.error("[PosClient] Product search error:", error);
                }
                setIsSearching(false);
            } else {
                setProducts([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, branchId, cashShift]);

    // Debounce Repair Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (repairQuery.trim().length >= 2) {
                setIsSearchingRepairs(true);
                setShowRepairResults(true);
                try {
                    const results = await searchRepairsForPos(repairQuery, branchId);
                    setRepairs(results);
                } catch (error) {
                    console.error("[PosClient] Repair search error:", error);
                }
                setIsSearchingRepairs(false);
            } else {
                setRepairs([]);
                setShowRepairResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [repairQuery, branchId]);


    const handleCheckoutClick = () => {
        if (!cashShift) {
            toast.error("Caja cerrada.");
            return;
        }
        if (cart.length === 0) return;

        // Initialize Split Payment State
        const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setEditableTotal(currentTotal.toString());
        setPaymentAmountInput(currentTotal.toString());
        setPartialPayments([]);

        setIsCheckoutModalOpen(true);
    };

    const handleAddPayment = (method: "CASH" | "CARD" | "MERCADOPAGO") => {
        const totalToPay = parseFloat(editableTotal);
        const amountToPay = parseFloat(paymentAmountInput);

        if (isNaN(totalToPay) || totalToPay <= 0) {
            toast.error("Total a cobrar inválido");
            return;
        }

        if (isNaN(amountToPay) || amountToPay <= 0) {
            // If user just clicks the button without editing amount, assume full remaining
            // BUT logic below handles "amountToPay" from input. 
            // If input is empty or invalid, block? 
            toast.error("Ingrese un monto válido a pagar");
            return;
        }

        const paidSoFar = partialPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = totalToPay - paidSoFar;

        if (amountToPay > remaining + 0.01) { // small epsilon
            toast.error(`El monto excede el restante ($${remaining.toLocaleString()})`);
            return;
        }

        // Add payment
        const newPayments = [...partialPayments, { method, amount: amountToPay }];
        setPartialPayments(newPayments);

        // Update input for next payment (Remaining - just paid)
        const newPaidSoFar = newPayments.reduce((acc, p) => acc + p.amount, 0);
        const newRemaining = totalToPay - newPaidSoFar;

        setPaymentAmountInput(newRemaining > 0 ? newRemaining.toString() : "0");

        if (newRemaining <= 0.01) {
            // Auto complete? No, let user confirm final sale
        }
    };

    const removePayment = (index: number) => {
        const newPayments = [...partialPayments];
        newPayments.splice(index, 1);
        setPartialPayments(newPayments);

        // Update remaining to pay input
        const totalToPay = parseFloat(editableTotal) || 0;
        const paidSoFar = newPayments.reduce((acc, p) => acc + p.amount, 0);
        setPaymentAmountInput((totalToPay - paidSoFar).toString());
    };


    const processingRef = useRef(false);

    const confirmSplitSale = async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessingSale(true);

        try {
            const totalToPay = parseFloat(editableTotal);
            const paidSoFar = partialPayments.reduce((acc, p) => acc + p.amount, 0);

            if (Math.abs(paidSoFar - totalToPay) > 1) {
                toast.error(`Falta cubrir el total. Pagado: $${paidSoFar}, Total: $${totalToPay}`);
                processingRef.current = false;
                setIsProcessingSale(false);
                return;
            }

            const result = await processPosSale({
                vendorId,
                branchId,
                items: cart.map(i => ({
                    id: i.id,
                    type: i.type,
                    quantity: i.quantity,
                    price: i.price,
                    name: i.name,
                    originalPrice: i.originalPrice,
                    priceChangeReason: i.priceChangeReason
                })),
                total: totalToPay,
                paymentMethod: "SPLIT",
                payments: partialPayments
            });

            if (result.success) {
                toast.success("¡Venta completada!", { icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> });

                if (cashShift) {
                    await updateShiftSummary(cashShift.id);
                }

                // 1. Close modal and reset state FIRST to remove Focus Trap
                setCart([]);
                setSearchQuery("");
                setProducts([]);
                setRepairQuery("");
                setIsCheckoutModalOpen(false);

                // 2. Wait for modal to unmount (Instant unmount now enabled)
                // Short delay (150ms) just to ensure DOM is clear before Print.
                setTimeout(() => {
                    try {
                        printSaleTicket({
                            branch: branchData,
                            items: cart,
                            total: totalToPay,
                            method: partialPayments.length === 1 ? partialPayments[0].method : "SPLIT",
                            date: new Date(),
                            saleId: result.saleId,
                            vendorName: vendorName
                        });
                    } catch (err) {
                        console.error("Print error:", err);
                    }
                }, 150);

            } else {
                toast.error(result.error || "Error al procesar venta");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error al procesar venta");
        } finally {
            processingRef.current = false;
            setIsProcessingSale(false);
        }
    };



    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] gap-6 p-4">

            {/* LEFT COLUMN: Search & Catalog */}
            <div className="w-full md:w-2/3 flex flex-col gap-6">

                {/* CASH REGISTER CONTROL */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Punto de Venta</h2>
                        {cashShift ? (
                            <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                                <Unlock className="w-4 h-4" />
                                <span>Caja Abierta ({new Date(cashShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                <Lock className="w-4 h-4" />
                                <span>Caja Cerrada</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">


                        {/* 1. Total Sales Indicator (Inline - First) */}
                        {shiftSummary && (
                            <div className="flex flex-col items-center justify-center px-4 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg mr-2 shadow-sm min-w-[100px]">
                                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider leading-none mb-1">Total</span>
                                <span className="text-xl font-black text-green-500 font-mono leading-none tracking-tight">
                                    ${Math.floor(shiftSummary.totalSales).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setIsTransferModalOpen(true); loadTransferData(); }}
                            className={cn(
                                "relative overflow-hidden transition-all duration-300 shadow-lg group",
                                "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
                                "text-white border-0 hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
                            )}
                            disabled={!cashShift}
                        >
                            <ArrowRightLeft className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="relative font-bold tracking-wide">Transferencias</span>
                            {pendingTransfers.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                    {pendingTransfers.length}
                                </span>
                            )}
                        </Button>



                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddExpense}
                            className={cn(
                                "relative overflow-hidden transition-all duration-300 shadow-lg group",
                                "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
                                "text-white border-0 hover:shadow-orange-500/25 hover:scale-105 active:scale-95"
                            )}
                            disabled={!cashShift}
                        >
                            <TrendingDown className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                            <span className="relative font-bold tracking-wide">Gasto</span>
                        </Button>

                        <Button
                            onClick={handleRegisterClick}
                            disabled={isLoadingShift}
                            size="sm"
                            className={cn(
                                "relative overflow-hidden transition-all duration-300 font-bold shadow-lg hover:scale-105 active:scale-95",
                                cashShift
                                    ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border border-red-400/20 shadow-red-500/20"
                                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border border-green-400/20 shadow-green-500/20"
                            )}
                        >
                            {isLoadingShift ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full mr-2" />
                            ) : cashShift ? (
                                <Lock className="w-4 h-4 mr-2" />
                            ) : (
                                <Unlock className="w-4 h-4 mr-2" />
                            )}
                            {isLoadingShift ? "Cargando..." : cashShift ? "Cerrar Caja" : "Abrir Caja"}

                        </Button>
                    </div>


                </div>


                {/* Search Bar Row */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {/* Product Search */}
                    <div className="md:col-span-2 relative group z-20">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                        <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-secondary/20 p-4 shadow-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
                                    <Search className="w-3 h-3" /> Catálogo
                                </h3>
                                {isSearching && <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />}
                            </div>
                            <Input
                                placeholder="Buscar producto (Nombre, SKU)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-background/50 border-primary/20 focus:border-primary/50 text-lg h-12 transition-all hover:bg-background/80"
                                autoFocus
                                disabled={!cashShift}
                            />
                        </div>
                    </div>

                    {/* Repair Search Input - Cleaned up to just be an input */}
                    <div className="relative group z-20">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                        <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-secondary/20 p-4 shadow-lg h-full flex flex-col justify-start">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
                                    <Smartphone className="w-3 h-3" /> Buscar Reparación
                                </h3>
                                {isSearchingRepairs && <span className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />}
                            </div>
                            <Input
                                placeholder="Ticket, Nombre, Teléfono..."
                                value={repairQuery}
                                onChange={(e) => {
                                    setRepairQuery(e.target.value);
                                    if (e.target.value.length >= 2) {
                                        setSearchQuery(""); // Clear product search to switch context
                                        setProducts([]);
                                    }
                                }}
                                className="bg-background/50 border-primary/20 h-10 transition-all hover:bg-background/80"
                                onFocus={() => {
                                    if (repairQuery.length >= 2) {
                                        // Logic to ensure grid switch could go here if needed
                                    }
                                }}
                                disabled={!cashShift}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Products & Repairs Grid */}
                <div className="flex-1 overflow-auto rounded-2xl p-2 -m-2">
                    {/* CASE 1: REPAIR SEARCH ACTIVE */}
                    {repairQuery.length >= 2 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            <AnimatePresence>
                                {repairs.length === 0 && !isSearchingRepairs ? (
                                    <div className="col-span-full flex flex-col items-center justify-center p-10 text-muted-foreground opacity-50">
                                        <Search className="w-12 h-12 mb-2" />
                                        <p>No se encontraron reparaciones</p>
                                    </div>
                                ) : (
                                    repairs.map((repair, i) => (
                                        <motion.div
                                            key={repair.id}
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => addRepairToCart(repair)}
                                        >
                                            <Card className="h-full cursor-pointer group hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                                <CardContent className="p-4 flex flex-col h-full gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <Badge variant="outline" className="text-[10px] tracking-tight backdrop-blur-md bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                            #{repair.ticketNumber}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1 rounded truncate max-w-[80px]">
                                                            {repair.status}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-medium text-sm text-foreground/90 mt-2 group-hover:text-blue-500 transition-colors line-clamp-1">
                                                        {repair.device}
                                                    </h3>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                        {repair.customerName}
                                                    </p>

                                                    <div className="pt-2 mt-auto flex items-end justify-between border-t border-border/30">
                                                        <span className="text-xs text-muted-foreground">Total</span>
                                                        <span className="text-lg font-bold text-foreground">
                                                            ${repair.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        // CASE 2: NO REPAIR SEARCH -> SHOW PRODUCTS OR EMPTY STATE (BEST SELLERS)
                        searchQuery.length === 0 && products.length === 0 ? (
                            <>
                                {bestSellers.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-8 w-1 bg-gradient-to-b from-primary to-purple-500 rounded-full" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Más Vendidos</h3>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                            <AnimatePresence>
                                                {bestSellers.map((product, i) => (
                                                    <motion.div
                                                        key={`best-${product.id}`}
                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        onClick={() => addToCartProduct(product)}
                                                    >
                                                        <Card className="h-full cursor-pointer group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                                            <div className="absolute top-0 right-0 p-2">
                                                                <Badge variant="secondary" className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border-amber-500/20">HOT</Badge>
                                                            </div>
                                                            <CardContent className="p-4 flex flex-col h-full gap-2">
                                                                <div className="flex justify-between items-start mt-4">
                                                                    <Badge variant="outline" className={cn(
                                                                        "text-[10px] tracking-tight backdrop-blur-md",
                                                                        product.stock > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                                    )}>
                                                                        STOCK: {product.stock}
                                                                    </Badge>
                                                                </div>
                                                                <h3 className="font-medium text-sm line-clamp-2 flex-grow mt-2 group-hover:text-primary transition-colors">
                                                                    {product.name}
                                                                </h3>
                                                                <div className="pt-2 flex items-end justify-between">
                                                                    <span className="text-xs text-muted-foreground">Precio</span>
                                                                    <span className="text-lg font-bold text-foreground">
                                                                        ${product.price.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30"
                                    >
                                        <PackageSearch className="w-24 h-24 mb-4" />
                                        <p className="text-xl font-light">
                                            {!cashShift ? "Abra la caja para comenzar" : "Explora el catálogo o busca productos"}
                                        </p>
                                    </motion.div>
                                )}
                            </>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                <AnimatePresence>
                                    {products.map((product, i) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            layoutId={product.id}
                                            onClick={() => addToCartProduct(product)}
                                        >
                                            <Card className="h-full cursor-pointer group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                                <CardContent className="p-4 flex flex-col h-full gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] tracking-tight backdrop-blur-md",
                                                            product.stock > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                        )}>
                                                            STOCK: {product.stock}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1 rounded">{product.sku}</span>
                                                    </div>

                                                    <h3 className="font-medium text-sm line-clamp-2 flex-grow mt-2 group-hover:text-primary transition-colors">
                                                        {product.name}
                                                    </h3>

                                                    <div className="pt-2 flex items-end justify-between">
                                                        <span className="text-xs text-muted-foreground">Precio</span>
                                                        <span className="text-lg font-bold text-foreground">
                                                            ${product.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )
                    )}
                </div>
            </div >

            {/* RIGHT COLUMN: Cart */}
            < motion.div
                initial={{ x: 20, opacity: 0 }
                }
                animate={{ x: 0, opacity: 1 }}
                className="w-full md:w-1/3 flex flex-col"
            >
                <div className="relative h-full flex flex-col rounded-3xl overflow-hidden glass-panel border border-white/5 shadow-2xl bg-card/60 backdrop-blur-xl">
                    {/* Cart Header */}
                    <div className="p-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent border-b border-border/50">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-primary" />
                                Ticket
                            </h2>
                            <Badge variant="secondary" className="text-sm px-3 py-1 bg-background/50">
                                {cart.length} Items
                            </Badge>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
                                <div className="p-6 rounded-full bg-muted/10 border border-white/5">
                                    <ShoppingCart className="w-12 h-12 opacity-50" />
                                </div>
                                <p className="text-sm">Carrito vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {cart.map(item => (
                                        <motion.div
                                            key={item.uniqueId}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="group relative flex gap-3 p-3 rounded-xl bg-background/40 border border-white/5 hover:border-primary/20 hover:bg-background/60 transition-all hover:shadow-lg hover:shadow-black/5 cursor-pointer"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm",
                                                item.type === "PRODUCT" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                                            )}>
                                                {item.type === "PRODUCT" ? <Monitor className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <h4 className="font-medium text-sm truncate pr-6 text-foreground/90">{item.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground truncate">{item.details}</p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    {item.type === "PRODUCT" ? (
                                                        <div className="flex items-center bg-background/50 rounded-md border border-white/10 h-6">
                                                            <button
                                                                className="w-6 flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                                onClick={() => updateQuantity(item.uniqueId, -1)}
                                                            >-</button>
                                                            <span className="w-8 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                                                            <button
                                                                className="w-6 flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                                onClick={() => updateQuantity(item.uniqueId, 1)}
                                                            >+</button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded border border-purple-500/20">Servicio</span>
                                                    )}
                                                    <span className="font-bold text-sm tabular-nums">
                                                        ${(item.price * item.quantity).toFixed(0)}
                                                    </span>
                                                </div>
                                                {item.originalPrice && item.originalPrice !== item.price && (
                                                    <div className="mt-1 text-[10px] text-amber-500 flex items-center gap-1">
                                                        <Edit className="w-3 h-3" />
                                                        <span>Modificado: {item.priceChangeReason}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromCart(item.uniqueId);
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Footer Totals */}
                    <div className="p-6 bg-background/40 border-t border-white/5 backdrop-blur-md">
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="tabular-nums">${subtotal.toLocaleString()}</span>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex justify-between items-end">
                                <span className="text-base font-semibold">Total a Cobrar</span>
                                <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">
                                    ${total.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border-0"
                            size="lg"
                            onClick={handleCheckoutClick}
                            disabled={cart.length === 0 || !cashShift}
                        >
                            <CreditCard className="mr-2 w-5 h-5" />
                            Confirmar Cobro
                        </Button>
                    </div>
                </div>
            </motion.div >

            {/* REGISTER MODAL (Open/Close Logic) */}
            <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogContent className={cn("transition-all duration-300", modalAction === "CLOSE" ? "sm:max-w-3xl" : "sm:max-w-md")}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {modalAction === "OPEN" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 text-primary" />}
                            {modalAction === "OPEN" ? "Apertura de Caja" : "Arqueo de Caja"}
                        </DialogTitle>
                        <DialogDescription>
                            {modalAction === "OPEN"
                                ? "Ingrese el monto inicial para abrir la caja."
                                : "Ingrese la cantidad de billetes por denominación para calcular el total."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {modalAction === "CLOSE" ? (
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left: Bill Counter */}
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                        {[20000, 10000, 2000, 1000, 500, 200, 100].map((denom) => {
                                            const count = billCounts[denom] || 0;
                                            return (
                                                <div key={denom} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/50 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-[100px]">
                                                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-xs ring-1 ring-green-500/20">
                                                            $
                                                        </div>
                                                        <span className="font-mono font-bold text-sm">${denom.toLocaleString()}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                                                            onClick={() => handleBillChange(denom, Math.max(0, count - 1))}
                                                        >
                                                            -
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={count === 0 ? "" : count}
                                                            placeholder="0"
                                                            className="h-8 w-16 text-center tabular-nums bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                handleBillChange(denom, val);
                                                            }}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                                                            onClick={() => handleBillChange(denom, count + 1)}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>

                                                    <div className="w-24 text-right font-mono text-sm text-muted-foreground">
                                                        ${(count * denom).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Additional input manually? */}
                                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-2">
                                        <div className="flex items-center gap-2">
                                            <span>Ajuste manual:</span>
                                            <Input
                                                className="h-6 w-24 text-right"
                                                placeholder="Otros..."
                                                onChange={(e) => {
                                                    // Optional: Handling manual adjustments if needed, 
                                                    // but simpler to stick to bills for now or add a 'coins' field?
                                                    // For now let's stick to bills to keep it clean.
                                                }}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Summary */}
                                <div className="w-full md:w-96 flex flex-col gap-4">
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Resumen del Turno</h3>

                                        {shiftSummary && (
                                            <div className="space-y-2 text-sm pb-2 border-b border-border/50">
                                                <div className="flex justify-between font-bold text-base pb-2 text-foreground">
                                                    <span>Venta Total</span>
                                                    <span>${shiftSummary.totalSales.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Ventas Efectivo</span>
                                                    <span className="font-medium">${(shiftSummary.cashSales || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Ventas Tarjeta</span>
                                                    <span className="font-medium">${(shiftSummary.cardSales || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Ventas MP</span>
                                                    <span className="font-medium">${(shiftSummary.mpSales || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-red-500/80">
                                                    <span>Gastos</span>
                                                    <span>-${(shiftSummary.expenses || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bonus Logic */}
                                        <div className="space-y-2 py-2 bg-secondary/20 rounded-lg p-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                    Premios ({shiftSummary && shiftSummary.totalSales > 1000000 ? "2%" : "1%"})
                                                </Label>
                                                {shiftSummary && shiftSummary.totalSales > 1000000 && (
                                                    <Badge variant="default" className="text-[10px] h-4 px-1 bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 border-yellow-500/50">
                                                        BONUS 2%
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-muted-foreground mb-1">Cant. Empleados</div>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="h-8 text-center bg-background"
                                                        value={employeeCount}
                                                        onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                </div>
                                                <div className="flex-1 text-right">
                                                    <div className="text-[10px] text-muted-foreground mb-1">Premio p/emp</div>
                                                    <div className="font-mono text-sm font-bold">
                                                        ${shiftSummary ? (Math.round((shiftSummary.totalSales * (shiftSummary.totalSales > 1000000 ? 0.02 : 0.01)) / 500) * 500).toLocaleString() : 0}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-sm pt-1 border-t border-border/10">
                                                <span className="text-muted-foreground">Total Premios:</span>
                                                <span className="font-bold text-orange-500">
                                                    -${shiftSummary ? ((Math.round((shiftSummary.totalSales * (shiftSummary.totalSales > 1000000 ? 0.02 : 0.01)) / 500) * 500) * employeeCount).toLocaleString() : 0}
                                                </span>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Esperado en Caja</span>
                                            </div>
                                            <div className="flex justify-between text-base font-medium">
                                                <span>Sistema (Neto)</span>
                                                <span>
                                                    ${shiftSummary ? (
                                                        shiftSummary.expectedCash - ((Math.round((shiftSummary.totalSales * (shiftSummary.totalSales > 1000000 ? 0.02 : 0.01)) / 500) * 500) * employeeCount)
                                                    ).toLocaleString() : 0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Contado Real</span>
                                            </div>
                                            <div className="flex justify-between text-2xl font-bold text-primary">
                                                <span>Total</span>
                                                <span>${parseFloat(amountInput || "0").toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>

                                        <div className={cn("p-3 rounded-lg flex items-center justify-between text-sm border",
                                            (() => {
                                                const bonusRate = shiftSummary && shiftSummary.totalSales > 1000000 ? 0.02 : 0.01;
                                                const expected = shiftSummary ? (shiftSummary.expectedCash - ((Math.round((shiftSummary.totalSales * bonusRate) / 500) * 500) * employeeCount)) : 0;
                                                const diff = parseFloat(amountInput || "0") - expected;
                                                return diff === 0
                                                    ? "bg-green-500/10 border-green-500/20 text-green-600"
                                                    : diff > 0
                                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-600"
                                                        : "bg-red-500/10 border-red-500/20 text-red-600"
                                            })()
                                        )}>
                                            <span className="font-semibold">Diferencia:</span>
                                            <span className="font-mono font-bold">
                                                ${(() => {
                                                    const bonusRate = shiftSummary && shiftSummary.totalSales > 1000000 ? 0.02 : 0.01;
                                                    const expected = shiftSummary ? (shiftSummary.expectedCash - ((Math.round((shiftSummary.totalSales * bonusRate) / 500) * 500) * employeeCount)) : 0;
                                                    const diff = parseFloat(amountInput || "0") - expected;
                                                    return diff.toLocaleString('es-AR');
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 p-4">
                                <div className="space-y-2">
                                    <Label className="text-base">Monto Inicial en Efectivo</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="pl-8 text-2xl h-14 font-bold tracking-tight bg-secondary/20"
                                            value={amountInput}
                                            onChange={(e) => setAmountInput(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Ingrese el dinero con el que comienza el turno.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-between px-4 pb-4">
                        {modalAction === "CLOSE" && (
                            <div className="text-xs text-muted-foreground flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                                <span>Verifique los billetes antes de confirmar</span>
                            </div>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setIsRegisterModalOpen(false)} className="flex-1 sm:flex-none">Cancelar</Button>
                            <Button onClick={confirmRegisterAction} className={cn("flex-1 sm:flex-none font-bold", modalAction === "CLOSE" ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" : "")}>
                                {modalAction === "OPEN" ? "Abrir Caja" : "Confirmar Cierre"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* CHECKOUT MODAL (Payment Method Selection) - Modern Glassmorphism */}
            < Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen} >
                <DialogContent className="sm:max-w-xl border-zinc-800 bg-zinc-950 text-white shadow-2xl p-0 gap-0 overflow-hidden">
                    <div className="p-6 bg-zinc-900 border-b border-zinc-800">
                        <DialogTitle className="text-xl font-medium text-center tracking-tight mb-1">Confirmar Cobro</DialogTitle>
                        <DialogDescription className="text-center text-zinc-400 text-sm">
                            Configure el total y agregue los pagos
                        </DialogDescription>
                    </div>

                    <div className="p-6 flex flex-col gap-6">

                        {/* 1. TOTAL SECTION - Clean & Big */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end px-1">
                                <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Total a Cobrar</Label>

                            </div>
                            <div className="relative group">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 text-zinc-500 group-focus-within:text-white transition-colors" />
                                <Input
                                    type="number"
                                    value={editableTotal}
                                    readOnly
                                    disabled
                                    className="pl-14 !text-6xl font-black bg-zinc-900/50 border-zinc-800 h-28 text-green-500 cursor-not-allowed opacity-100 rounded-xl"
                                />

                            </div>
                        </div>

                        {/* 2. PAYMENT PROGRESS */}
                        {(() => {
                            const totalVal = parseFloat(editableTotal) || 0;
                            const paidVal = partialPayments.reduce((a, b) => a + b.amount, 0);
                            const remaining = totalVal - paidVal;
                            const progress = totalVal > 0 ? (paidVal / totalVal) * 100 : 0;
                            const isComplete = remaining <= 0.5;

                            return (
                                <div className="flex flex-col gap-4">
                                    {/* Progress Bar */}
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ease-out ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>

                                    {/* Status Text */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-500 font-medium uppercase">Pagado</span>
                                            <span className={`text-lg font-bold ${paidVal > 0 ? "text-green-400" : "text-zinc-600"}`}>
                                                ${paidVal.toLocaleString()}
                                            </span>
                                        </div>

                                        {!isComplete ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-red-400 font-bold uppercase animate-pulse">Falta Pagar</span>
                                                <span className="text-2xl font-bold text-red-500">
                                                    ${remaining.toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm font-bold text-green-400">Cubierto</span>
                                                </div>
                                                {/* Allow reset if needed */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setPartialPayments([]); setPaymentAmountInput(editableTotal); }}
                                                    className="h-8 text-[10px] text-zinc-500 hover:text-white"
                                                >
                                                    Reiniciar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 3. PAYMENT ACTIONS */}
                        {(() => {
                            const totalVal = parseFloat(editableTotal) || 0;
                            const paidVal = partialPayments.reduce((a, b) => a + b.amount, 0);
                            const remaining = totalVal - paidVal;

                            if (remaining > 0.5) {
                                return (
                                    <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50 flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs uppercase text-zinc-400 font-bold tracking-wider">Agregar Pago</Label>
                                            <span className="text-xs text-zinc-600">Monto a imputar:</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                                <Input
                                                    type="number"
                                                    value={paymentAmountInput}
                                                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                                                    className="pl-8 bg-zinc-950 border-zinc-700 text-green-400 font-bold font-mono h-12 !text-3xl"
                                                    placeholder="Monto..."
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setPaymentAmountInput(remaining.toString())}
                                                className="h-10 w-10 border-zinc-700 hover:bg-zinc-800"
                                                title="Usar Restante"
                                            >
                                                <ArrowRight className="w-4 h-4 text-zinc-400" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: "CASH", label: "Efectivo", icon: Banknote, color: "emerald" },
                                                { id: "CARD", label: "Tarjeta", icon: CreditCard, color: "blue" },
                                                { id: "MERCADOPAGO", label: "MP / QR", icon: Smartphone, color: "sky" }
                                            ].map((m) => (
                                                <Button
                                                    key={m.id}
                                                    onClick={() => handleAddPayment(m.id as any)}
                                                    className={`h-12 border border-zinc-800 bg-zinc-900 hover:bg-${m.color}-500/10 hover:border-${m.color}-500/50 hover:text-${m.color}-400 transition-all flex flex-col items-center justify-center gap-1`}
                                                >
                                                    <m.icon className="w-4 h-4 opacity-70" />
                                                    <span className="text-xs font-bold">{m.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* 4. PAYMENT LIST */}
                        {partialPayments.length > 0 && (
                            <div className="space-y-2 bg-zinc-900/30 rounded-lg p-2">
                                {partialPayments.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 text-sm border-b border-zinc-800/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded bg-zinc-800 text-zinc-400`}>
                                                {p.method === "CASH" && <Banknote className="w-3 h-3" />}
                                                {p.method === "CARD" && <CreditCard className="w-3 h-3" />}
                                                {p.method === "MERCADOPAGO" && <Smartphone className="w-3 h-3" />}
                                            </div>
                                            <span className="font-medium text-zinc-300">{p.method}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-zinc-200">${p.amount.toLocaleString()}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removePayment(i)}
                                                className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-transparent"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                    <DialogFooter className="p-6 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCheckoutModalOpen(false)}
                            className="text-zinc-500 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-black font-bold px-8 shadow-lg shadow-primary/20"
                            size="lg"
                            disabled={isProcessingSale || (parseFloat(editableTotal) || 0) - partialPayments.reduce((a, b) => a + b.amount, 0) > 1}
                            onClick={confirmSplitSale}
                        >
                            {isProcessingSale ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    Procesando...
                                </span>
                            ) : "Confirmar Venta"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* EXPENSE MODAL */}
            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-6 gap-6">
                    <DialogHeader>
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 mx-auto mb-4 border border-orange-500/20">
                            <TrendingDown className="w-6 h-6 text-orange-500" />
                        </div>
                        <DialogTitle className="text-2xl font-medium text-center tracking-tight">Registrar Salida</DialogTitle>
                        <DialogDescription className="text-center text-zinc-400 text-base">
                            Registre un gasto en efectivo. Esto se descontará del total en caja.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Monto del Gasto</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-orange-500/70 group-focus-within:text-orange-500 transition-colors" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white text-lg font-medium focus:border-orange-500/50 focus:ring-orange-500/20 transition-all placeholder:text-zinc-600"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Concepto / Descripción</Label>
                            <Input
                                placeholder="Ej: Compra de insumos limpieza..."
                                className="h-12 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-700 focus:ring-zinc-700/50 transition-all placeholder:text-zinc-600"
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsExpenseModalOpen(false)}
                            className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={submitExpense}
                            disabled={isSubmittingExpense}
                            className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20 rounded-xl font-medium tracking-wide"
                        >
                            {isSubmittingExpense ? (
                                <>
                                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                    Guardando...
                                </>
                            ) : (
                                <>Guardar Gasto <ArrowRight className="ml-2 w-4 h-4 opacity-70" /></>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* TRANSFER MODAL */}
            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                <DialogContent className="sm:max-w-2xl border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-0 gap-0 overflow-hidden">
                    <div className="p-6 pb-2 border-b border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                                Transferencias de Stock
                            </DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Gestione el envío y recepción de mercadería entre sucursales.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-2 mt-4">
                            <Button
                                variant={transferTab === "NEW" ? "default" : "ghost"}
                                onClick={() => setTransferTab("NEW")}
                                className={cn("flex-1", transferTab === "NEW" ? "bg-blue-600 hover:bg-blue-500" : "text-zinc-400 hover:text-white")}
                            >
                                Nueva Transferencia
                            </Button>
                            <Button
                                variant={transferTab === "INCOMING" ? "default" : "ghost"}
                                onClick={() => setTransferTab("INCOMING")}
                                className={cn("flex-1 relative", transferTab === "INCOMING" ? "bg-blue-600 hover:bg-blue-500" : "text-zinc-400 hover:text-white")}
                            >
                                Solicitudes Recibidas
                                {pendingTransfers.length > 0 && (
                                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                        {pendingTransfers.length}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 min-h-[400px]">
                        {transferTab === "NEW" ? (
                            <div className="space-y-4">
                                {/* Step 1: Search Product */}
                                {!selectedTransferProduct ? (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                            <Input
                                                placeholder="Buscar producto a transferir..."
                                                value={transferSearchQuery}
                                                onChange={(e) => setTransferSearchQuery(e.target.value)}
                                                className="pl-9 bg-zinc-900 border-zinc-800"
                                            />
                                        </div>
                                        <div className="h-[300px] overflow-y-auto space-y-2 pr-2">
                                            {transferProducts.map(product => (
                                                <div
                                                    key={product.id}
                                                    className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition-colors"
                                                    onClick={() => setSelectedTransferProduct(product)}
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm">{product.name}</div>
                                                        <div className="text-xs text-zinc-500">SKU: {product.sku}</div>
                                                    </div>
                                                    <Badge variant="outline" className={product.stock > 0 ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"}>
                                                        Stock: {product.stock}
                                                    </Badge>
                                                </div>
                                            ))}
                                            {transferSearchQuery && transferProducts.length === 0 && (
                                                <div className="text-center text-zinc-500 py-10">No se encontraron productos</div>
                                            )}
                                            {!transferSearchQuery && (
                                                <div className="text-center text-zinc-500 py-10">Escriba para buscar...</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex justify-between items-center">
                                            <div>
                                                <div className="text-xs text-blue-400 font-bold uppercase mb-1">Producto Seleccionado</div>
                                                <div className="font-medium">{selectedTransferProduct.name}</div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedTransferProduct(null)}>
                                                Cambiar
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Sucursal Destino</Label>
                                                <select
                                                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={targetBranchId}
                                                    onChange={(e) => setTargetBranchId(e.target.value)}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Cantidad (Max: {selectedTransferProduct.stock})</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max={selectedTransferProduct.stock}
                                                    value={transferQty}
                                                    onChange={(e) => setTransferQty(e.target.value)}
                                                    className="bg-zinc-900 border-zinc-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Motivo / Notas</Label>
                                            <textarea
                                                className="w-full min-h-[80px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-600 resize-none"
                                                placeholder="Razón de la transferencia..."
                                                value={transferNotes}
                                                onChange={(e) => setTransferNotes(e.target.value)}
                                            />
                                        </div>

                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 mt-4"
                                            onClick={handleCreateTransfer}
                                            disabled={!targetBranchId || !transferQty}
                                        >
                                            <Truck className="w-4 h-4 mr-2" /> Enviar Transferencia
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 h-[400px] overflow-y-auto pr-2">
                                {pendingTransfers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                        <PackageSearch className="w-12 h-12 mb-2 opacity-50" />
                                        <p>No hay solicitudes pendientes</p>
                                    </div>
                                ) : (
                                    pendingTransfers.map(t => (
                                        <div key={t.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-lg">{t.product.name}</div>
                                                    <div className="text-sm text-zinc-400">
                                                        De: <span className="text-white font-medium">{t.sourceBranch?.name}</span> •
                                                        Por: <span className="text-white font-medium">{t.createdBy?.name}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10 px-3 py-1 text-sm">
                                                    Cant: {t.quantity}
                                                </Badge>
                                            </div>

                                            {t.notes && (
                                                <div className="p-2 bg-zinc-950/50 rounded text-sm text-zinc-300 italic border border-white/5">
                                                    "{t.notes}"
                                                </div>
                                            )}

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-500 border border-green-600/50"
                                                    size="sm"
                                                    onClick={() => handleRespondTransfer(t.id, "ACCEPT")}
                                                >
                                                    Aceptar
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/50"
                                                    size="sm"
                                                    onClick={() => handleRespondTransfer(t.id, "REJECT")}
                                                >
                                                    Rechazar
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PRICE OVERRIDE MODAL */}
            <Dialog open={isPriceOverrideModalOpen} onOpenChange={setIsPriceOverrideModalOpen}>
                <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-6 gap-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-amber-500" />
                            Modificar Precio
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {selectedCartItem?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Nuevo Precio Unitario</Label>
                            <div className="relative group">
                                <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-amber-500/70 group-focus-within:text-amber-500 transition-colors" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white text-lg font-medium focus:border-amber-500/50 focus:ring-amber-500/20 transition-all placeholder:text-zinc-600"
                                    value={overridePrice}
                                    onChange={(e) => setOverridePrice(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Motivo del Cambio</Label>
                            <Input
                                placeholder="Ej: Descuento por detalle, Amigo de la casa..."
                                className="h-12 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-700 focus:ring-zinc-700/50 transition-all placeholder:text-zinc-600"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsPriceOverrideModalOpen(false)}
                            className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmPriceOverride}
                            className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20 rounded-xl font-medium tracking-wide"
                        >
                            Confirmar Cambio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
