"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
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
import type { AdminRepair, AdminRepairBranch } from "@/types/admin-repairs";

const ITEMS_PER_PAGE = 20;

export function AdminRepairsTable({ repairs, branches }: { repairs: AdminRepair[], branches: AdminRepairBranch[] }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const searchTerm = searchParams.get('q') || '';
    const selectedBranchId = searchParams.get('branch') || 'ALL';
    const currentPage = Number(searchParams.get('page')) || 1;

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewRepair, setViewRepair] = useState<unknown>(null);
    const [loadingRepairId, setLoadingRepairId] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
    const [showOnlyWarranty, setShowOnlyWarranty] = useState(false);

    const updateParams = useMemo(() => (updates: Record<string, string | null>) => {
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
        const timer = setTimeout(() => {
            if (localSearchTerm !== searchTerm) {
                updateParams({ q: localSearchTerm });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearchTerm, searchTerm, updateParams]);

    const filteredRepairs = useMemo(() => {
        return repairs.filter(repair => {
            const searchWords = localSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
            const searchableFields = [
                repair.ticketNumber,
                repair.customer.name,
                repair.customer.phone || "",
                repair.deviceBrand,
                repair.deviceModel,
                repair.branch?.name || "",
            ].map(f => f.toLowerCase());

            const matchesSearch = searchWords.length === 0 || searchWords.every(word =>
                searchableFields.some(field => field.includes(word))
            );

            const matchesBranch = selectedBranchId === "ALL" || repair.branchId === selectedBranchId;
            const matchesWarranty = showOnlyWarranty ? repair.isWarranty : true;

            const techParam = searchParams.get('tech');
            const dateParam = searchParams.get('date');
            const targetDate = dateParam ? new Date(dateParam) : (techParam ? new Date() : null);

            let matchesTech = !techParam || (repair.assignedTo?.name || "SIN ASIGNAR") === techParam;
            let matchesDate = true;

            if (targetDate) {
                const isSameDay = (dStr: string | Date | null) => {
                    if (!dStr) return false;
                    const d = new Date(dStr);
                    return targetDate.getFullYear() === d.getFullYear() &&
                        targetDate.getMonth() === d.getMonth() &&
                        targetDate.getDate() === d.getDate();
                };

                const isCreatedToday = isSameDay(repair.createdAt);
                const finishedEntries = repair.statusHistory?.filter((h) =>
                    [5, 6, 7].includes(h.toStatusId) && isSameDay(h.createdAt)
                ) || [];

                const isFinishedToday = finishedEntries.length > 0;
                const isKPIStatus = [5, 6, 7, 10].includes(repair.statusId);

                if (techParam) {
                    const isFinishedByTechToday = finishedEntries.some((h) => h.user?.name === techParam);
                    if (isFinishedByTechToday && isKPIStatus) {
                        matchesTech = true;
                        matchesDate = true;
                    } else if (matchesTech && isFinishedToday && isKPIStatus) {
                        matchesDate = true;
                    } else {
                        matchesDate = false;
                    }
                } else {
                    if (!isCreatedToday && !isFinishedToday) {
                        matchesDate = false;
                    }
                }
            }
            return matchesSearch && matchesBranch && matchesWarranty && matchesTech && matchesDate;
        });
    }, [repairs, localSearchTerm, selectedBranchId, showOnlyWarranty, searchParams]);

    const totalPages = Math.ceil(filteredRepairs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedRepairs = filteredRepairs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                const latestUpdate = await checkLatestRepairUpdate();
                if (latestUpdate && new Date(latestUpdate) > lastRefreshed) {
                    router.refresh();
                    setLastRefreshed(new Date());
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 15000);
        return () => clearInterval(intervalId);
    }, [router, lastRefreshed]);

    return (
        <div className="space-y-6">
            <AdminRepairsFilters
                localSearchTerm={localSearchTerm}
                setLocalSearchTerm={setLocalSearchTerm}
                selectedBranchId={selectedBranchId}
                branches={branches}
                showOnlyWarranty={showOnlyWarranty}
                setShowOnlyWarranty={setShowOnlyWarranty}
                updateParams={updateParams}
                searchParams={searchParams}
            />

            <AdminRepairsList
                repairs={paginatedRepairs}
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
                itemsPerPage={ITEMS_PER_PAGE}
                totalFiltered={filteredRepairs.length}
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
