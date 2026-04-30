import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    getAdminSales,
    getBranchRanking,
    deleteSale,
    updateSalePaymentMethod
} from "@/actions/sales-actions";
import { getAllBranches } from "@/actions/branch-actions";
import { printSaleTicket } from "@/lib/print-utils";
import type { BranchRankingItem, BranchSummary, EditablePaymentMethod, SaleWithDetails } from "@/types/sales";

export function useAdminSales() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("search") || "";

    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [rankingData, setRankingData] = useState<BranchRankingItem[]>([]);
    const [branches, setBranches] = useState<BranchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const [date, setDate] = useState<Date | undefined>(
        initialQuery ? undefined : new Date()
    );
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

    // View Sale State
    const [viewingSale, setViewingSale] = useState<SaleWithDetails | null>(null);

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<EditablePaymentMethod | "">("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Sale State
    const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Computed Totals
    const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalSalesCount = sales.length;

    // Handle search param updates (navigation while on page)
    useEffect(() => {
        const querySearch = searchParams.get("search");
        if (querySearch && querySearch !== searchTerm) {
            setSearchTerm(querySearch);
            setDate(undefined); // Clear date filter to search globally
        }
    }, [searchParams]);

    const loadBranches = useCallback(async () => {
        const res = await getAllBranches();
        if (res.success && res.branches) {
            setBranches(res.branches);
        }
    }, []);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const startStr = date ? new Date(date) : undefined;
            if (startStr) startStr.setHours(0, 0, 0, 0);

            const endStr = date ? new Date(date) : undefined;
            if (endStr) endStr.setHours(23, 59, 59, 999);

            const [salesData, rankingRes] = await Promise.all([
                getAdminSales({
                    startDate: startStr,
                    endDate: endStr,
                    term: searchTerm,
                    branchId: selectedBranch
                }),
                getBranchRanking({
                    startDate: startStr,
                    endDate: endStr
                })
            ]);

            setSales(salesData);
            setRankingData(rankingRes);
        } catch (error) {
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    }, [date, searchTerm, selectedBranch]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handlePrint = useCallback((sale: SaleWithDetails) => {
        const branchForPrint = sale.branch || { name: "", address: "", phone: "" };
        printSaleTicket({
            branch: {
                name: branchForPrint.name,
                address: branchForPrint.address || "",
                phone: branchForPrint.phone || "",
            },
            items: sale.items,
            total: sale.total,
            method: sale.paymentMethod,
            date: new Date(sale.createdAt),
            saleId: sale.saleNumber
        });
    }, []);

    const handleUpdatePayment = useCallback(async () => {
        if (!editingSale || !newPaymentMethod) return;
        setIsUpdating(true);
        try {
            const result = await updateSalePaymentMethod(editingSale.id, newPaymentMethod);
            if (result.success) {
                toast.success("Método de pago actualizado");
                setEditingSale(null);
                await fetchSales();
            } else {
                toast.error(result.error || "Error al actualizar");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    }, [editingSale, fetchSales, newPaymentMethod]);

    const handleConfirmDelete = useCallback(async () => {
        if (!saleToDelete) return;
        setIsDeleting(true);
        try {
            const result = await deleteSale(saleToDelete.id);
            if (result.success) {
                toast.success("Venta eliminada. Stock y Reparaciones restaurados.");
                setSaleToDelete(null);
                await fetchSales();
            } else {
                toast.error(result.error || "Error al eliminar venta");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsDeleting(false);
        }
    }, [fetchSales, saleToDelete]);

    return {
        sales,
        rankingData,
        branches,
        loading,
        date,
        setDate,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        totalRevenue,
        totalSalesCount,
        viewingSale,
        setViewingSale,
        editingSale,
        setEditingSale,
        newPaymentMethod,
        setNewPaymentMethod,
        isUpdating,
        saleToDelete,
        setSaleToDelete,
        isDeleting,
        handlePrint,
        handleUpdatePayment,
        handleConfirmDelete,
        fetchSales
    };
}
