"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { syncRepairHistoryAction, toggleHistoryChecked } from "@/actions/spare-parts";
import type { SparePartHistoryListItem } from "@/actions/spare-parts/history";
import { updateHistoryChecked } from "@/lib/spare-parts-history-state";

export function useSparePartsHistory(data: SparePartHistoryListItem[]) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlDate = searchParams.get("date");
    const [rows, setRows] = useState(data);
    const [date, setDate] = useState<Date | undefined>(
        urlDate ? new Date(`${urlDate}T12:00:00`) : new Date(),
    );
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [checkingIds, setCheckingIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        setRows(data);
    }, [data]);

    const pendingCount = rows.filter((item) => !item.isChecked).length;
    const checkedCount = rows.length - pendingCount;
    const visibleData = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return rows;

        return rows.filter((item) => {
            const searchableValues = [
                item.sparePart.name,
                item.sparePart.sku,
                item.user.name,
                item.user.email,
                item.branch.name,
                item.branch.code,
                item.reason || "",
            ];
            return searchableValues.some((value) => value.toLowerCase().includes(query));
        });
    }, [rows, searchTerm]);

    const handleDateSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        const params = new URLSearchParams(searchParams.toString());
        if (newDate) params.set("date", format(newDate, "yyyy-MM-dd"));
        else params.delete("date");
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncRepairHistoryAction();
            if (!result.success) {
                toast.error(result.error || "Error al sincronizar");
                return;
            }
            toast.success(`Sincronización completada. Se añadieron ${result.count} registros.`);
            router.refresh();
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleCheck = async (id: string) => {
        if (checkingIds.has(id)) return;
        setCheckingIds((current) => new Set(current).add(id));

        try {
            const res = await toggleHistoryChecked(id);
            if (!res.success || typeof res.isChecked !== "boolean") {
                toast.error(res.error || "Error al actualizar");
                return;
            }
            setRows((currentRows) => updateHistoryChecked(currentRows, id, res.isChecked));
            toast.success(res.isChecked ? "Controlado correctamente" : "Marcado como pendiente");
        } catch {
            toast.error("Error al actualizar");
        } finally {
            setCheckingIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
        }
    };

    return {
        checkedCount,
        checkingIds,
        date,
        handleDateSelect,
        handlePageChange,
        handleSync,
        handleToggleCheck,
        isSyncing,
        pendingCount,
        searchTerm,
        setSearchTerm,
        visibleData,
    };
}
