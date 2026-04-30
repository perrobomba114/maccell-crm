"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { deleteRepairAction, getRepairByIdAction } from "@/lib/actions/repairs";
import { checkLatestRepairUpdate } from "@/actions/repair-check-actions";
import { toast } from "sonner";
import { RepairDetailsDialog } from "./repair-details-dialog";

// New modular components
import { AdminRepairsFilters } from "./components/AdminRepairsFilters";
import { AdminRepairsList } from "./components/AdminRepairsList";
import { AdminRepairsPagination } from "./components/AdminRepairsPagination";
import { AdminRepairsDeleteDialog } from "./components/AdminRepairsDeleteDialog";
import type { AdminRepairBranch, AdminRepairsResult } from "@/types/admin-repairs";
import type { RepairDetails } from "./repair-details-dialog";

export function AdminRepairsTable({ repairsData, branches }: { repairsData: AdminRepairsResult, branches: AdminRepairBranch[] }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const searchTerm = searchParams.get('q') || '';
    const selectedBranchId = searchParams.get('branch') || 'ALL';
    const currentPage = repairsData.page;
    const showOnlyWarranty = searchParams.get('warranty') === '1';

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewRepair, setViewRepair] = useState<RepairDetails | null>(null);
    const [loadingRepairId, setLoadingRepairId] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

    const updateParams = useCallback((updates: Record<string, string | null>) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === "ALL" || value === "") {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            });
            if (!updates.page) params.delete("page");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, pathname, router]);

    useEffect(() => {
        setLocalSearchTerm(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== searchTerm) {
                updateParams({ q: localSearchTerm });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearchTerm, searchTerm, updateParams]);

    const totalPages = Math.ceil(repairsData.total / repairsData.pageSize);
    const startIndex = (currentPage - 1) * repairsData.pageSize;

    const handleDelete = async () => {
        if (!deleteId) return;
        const result = await deleteRepairAction(deleteId);
        if (result.success) {
            toast.success("Reparación eliminada correctamente");
        } else {
            toast.error(result.error || "Error al eliminar la reparación");
        }
        setDeleteId(null);
        router.refresh();
    };

    const currencyFormatter = useMemo(() => new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }), []);

    const lastRefreshedRef = useRef<Date>(new Date());
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                const latestUpdate = await checkLatestRepairUpdate();
                if (latestUpdate && new Date(latestUpdate) > lastRefreshedRef.current) {
                    router.refresh();
                    lastRefreshedRef.current = new Date();
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 15000);
        return () => clearInterval(intervalId);
    }, [router]);

    return (
        <div className="space-y-6">
            <AdminRepairsFilters
                localSearchTerm={localSearchTerm}
                setLocalSearchTerm={setLocalSearchTerm}
                selectedBranchId={selectedBranchId}
                branches={branches}
                showOnlyWarranty={showOnlyWarranty}
                setShowOnlyWarranty={(show) => updateParams({ warranty: show ? "1" : null })}
                updateParams={updateParams}
                searchParams={searchParams}
            />

            <AdminRepairsList
                repairs={repairsData.repairs}
                isPending={isPending}
                loadingRepairId={loadingRepairId}
                setViewRepair={setViewRepair}
                setLoadingRepairId={setLoadingRepairId}
                setDeleteId={setDeleteId}
                getRepairByIdAction={getRepairByIdAction}
                currencyFormatter={currencyFormatter}
                router={router}
            />

            <AdminRepairsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                itemsPerPage={repairsData.pageSize}
                totalFiltered={repairsData.total}
                updateParams={updateParams}
            />

            <RepairDetailsDialog
                isOpen={!!viewRepair}
                onClose={() => setViewRepair(null)}
                repair={viewRepair}
            />

            <AdminRepairsDeleteDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
