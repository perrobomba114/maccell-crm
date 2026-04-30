import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getSales, requestPaymentMethodChange } from "@/actions/sales-actions";
import { printSaleTicket } from "@/lib/print-utils";
import type { BranchSummary, EditablePaymentMethod, PaymentMethodLike, SaleWithDetails } from "@/types/sales";

type PaymentFilter = PaymentMethodLike | "ALL";

export function useVendorSales(branchData: BranchSummary) {
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");

    // Detail View State
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<EditablePaymentMethod | "">("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Debounce search term
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const startStr = date ? new Date(date) : undefined;
            if (startStr) startStr.setHours(0, 0, 0, 0);

            const endStr = date ? new Date(date) : undefined;
            if (endStr) endStr.setHours(23, 59, 59, 999);

            const data = await getSales({
                startDate: startStr,
                endDate: endStr,
                term: debouncedSearch,
                paymentMethod: paymentFilter
            });
            setSales(data);
        } catch (error) {
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    }, [date, debouncedSearch, paymentFilter]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handlePrint = useCallback((sale: SaleWithDetails) => {
        printSaleTicket({
            branch: branchData,
            items: sale.items,
            total: sale.total,
            method: sale.paymentMethod,
            date: new Date(sale.createdAt),
            saleId: sale.saleNumber
        });
    }, [branchData]);

    const handleUpdatePayment = useCallback(async () => {
        if (!editingSale || !newPaymentMethod) return;
        setIsUpdating(true);
        try {
            const result = await requestPaymentMethodChange(editingSale.id, newPaymentMethod);
            if (result.success) {
                toast.success("Solicitud enviada al Administrador");
                setEditingSale(null);
            } else {
                toast.error(result.error || "Error al enviar solicitud");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    }, [editingSale, newPaymentMethod]);

    const clearFilters = () => {
        setSearchTerm("");
        setPaymentFilter("ALL");
        setDate(new Date());
    };

    const totalSales = useMemo(() => {
        return sales.reduce((acc, curr) => acc + curr.total, 0);
    }, [sales]);

    return {
        sales,
        loading,
        date,
        setDate,
        searchTerm,
        setSearchTerm,
        paymentFilter,
        setPaymentFilter,
        selectedSaleDetails,
        setSelectedSaleDetails,
        editingSale,
        setEditingSale,
        newPaymentMethod,
        setNewPaymentMethod,
        isUpdating,
        totalSales,
        fetchSales,
        handlePrint,
        handleUpdatePayment,
        clearFilters
    };
}
