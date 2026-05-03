import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    getAdminSalesPage,
    getBranchRanking,
    deleteSale,
    updateSalePaymentMethod
} from "@/actions/sales-actions";
import { getAllBranches } from "@/actions/branch-actions";
import { printSaleTicket } from "@/lib/print-utils";
import type { BranchRankingItem, BranchSummary, EditablePaymentMethod, SaleWithDetails } from "@/types/sales";

const ADMIN_SALES_PAGE_SIZE = 25;

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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(ADMIN_SALES_PAGE_SIZE);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSalesCount, setTotalSalesCount] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // View Sale State
    const [viewingSale, setViewingSale] = useState<SaleWithDetails | null>(null);

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<EditablePaymentMethod | "">("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Sale State
    const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    const topBranch = rankingData[0];

    const updateDate = useCallback((value: Date | undefined) => {
        setPage(1);
        setDate(value);
    }, []);

    const updateSearchTerm = useCallback((value: string) => {
        setPage(1);
        setSearchTerm(value);
    }, []);

    const updateSelectedBranch = useCallback((value: string) => {
        setPage(1);
        setSelectedBranch(value);
    }, []);

    // Handle search param updates (navigation while on page)
    useEffect(() => {
        const querySearch = searchParams.get("search");
        if (querySearch && querySearch !== searchTerm) {
            updateSearchTerm(querySearch);
            updateDate(undefined); // Clear date filter to search globally
        }
    }, [searchParams, searchTerm, updateDate, updateSearchTerm]);

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
                getAdminSalesPage({
                    startDate: startStr,
                    endDate: endStr,
                    term: searchTerm,
                    branchId: selectedBranch,
                    page,
                    limit: ADMIN_SALES_PAGE_SIZE,
                }),
                getBranchRanking({
                    startDate: startStr,
                    endDate: endStr
                })
            ]);

            setSales(salesData.sales);
            setTotalSalesCount(salesData.totalSalesCount);
            setTotalRevenue(salesData.totalRevenue);
            setTotalPages(salesData.totalPages);
            setPageSize(salesData.pageSize);
            if (salesData.totalSalesCount > 0 && page > salesData.totalPages) {
                setPage(salesData.totalPages);
            }
            setRankingData(rankingRes);
        } catch (error) {
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    }, [date, page, searchTerm, selectedBranch]);

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
        setDate: updateDate,
        searchTerm,
        setSearchTerm: updateSearchTerm,
        selectedBranch,
        setSelectedBranch: updateSelectedBranch,
        page,
        setPage,
        pageSize,
        totalPages,
        totalRevenue,
        totalSalesCount,
        avgTicket,
        topBranch,
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
