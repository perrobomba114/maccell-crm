import { formatArgentinaDate, getDailyRange, getMonthlyRange, reportMonth } from "@/lib/date-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dashboardReturnHref } from "@/lib/dashboard-navigation";
import { normalizeRepairDateFilter } from "@/lib/repair-date-filter";
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


    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [rankingData, setRankingData] = useState<BranchRankingItem[]>([]);
    const [branches, setBranches] = useState<BranchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const searchTerm = searchParams.get("search") || "";
    const selectedBranch = searchParams.get("branchId") || "ALL";
    const month = searchParams.has("month") ? reportMonth(searchParams.get("month"), searchParams.get("year")) : undefined;
    const monthKey = month?.toISOString();
    const explicitDay = normalizeRepairDateFilter(searchParams.get("day"));
    const day = explicitDay.length === 10 ? explicitDay : !month && !searchTerm && !searchParams.has("history") ? formatArgentinaDate() : undefined;
    const date = day ? new Date(day + "T12:00:00") : undefined;
    const back = dashboardReturnHref(searchParams.get("fromMonth"), searchParams.get("fromBranch"));
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const request = useRef(0);
    const change = useCallback((updates: Record<string, string | null>) => {
        const url = new URL(window.location.href);
        if (!("page" in updates)) url.searchParams.delete("page");
        for (const [key, value] of Object.entries(updates)) {
            if (value) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        }
        window.history.replaceState(null, "", url.pathname + url.search);
    }, []);
    const setPage = useCallback((n: number) => change({ page: String(n) }), [change]);
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

    const setDay = (value: string) => change({ day: value || null, history: value ? null : "1", month: null, year: null });
    const setMonth = (value: string) => {
        if (!value) return setDay("");
        const [year, monthNumber] = value.split("-");
        change({ year, month: String(Number(monthNumber) - 1), day: null, history: null });
    };
    const updateSearchTerm = (value: string) => change({ search: value || null, day: day || null, history: !day && !month ? "1" : null });
    const updateSelectedBranch = (value: string) => change({ branchId: value === "ALL" ? null : value });
    const clear = () => change({ search: null, branchId: null, year: null, month: null, day: null, history: "1" });

    const loadBranches = useCallback(async () => {
        const res = await getAllBranches();
        if (res.success && res.branches) {
            setBranches(res.branches);
        }
    }, []);

    const fetchSales = useCallback(async () => {
        const id = ++request.current;
        setLoading(true);
        try {
            const range = monthKey ? getMonthlyRange(monthKey) : day ? getDailyRange(day) : undefined;
            const [salesData, rankingRes] = await Promise.all([
                getAdminSalesPage({
                    startDate: range?.start,
                    endDate: range?.end,
                    term: searchTerm,
                    branchId: selectedBranch,
                    page,
                    limit: ADMIN_SALES_PAGE_SIZE,
                }),
                getBranchRanking({
                    startDate: range?.start,
                    endDate: range?.end
                })
            ]);

            if (id !== request.current) return;
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
            if (id !== request.current) return;
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            if (id === request.current) setLoading(false);
        }
    }, [monthKey, day, page, searchTerm, selectedBranch, setPage]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        void fetchSales();
        return () => { request.current++; };
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
        month,
        date,
        day, setDay, setMonth, clear, back,
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
