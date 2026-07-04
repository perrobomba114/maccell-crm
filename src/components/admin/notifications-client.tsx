"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Bell,
    Building2,
    ChevronLeft,
    ChevronRight,
    Inbox,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationRow } from "@/components/admin/notification-row";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { respondToNotificationAction } from "@/lib/actions/notifications";
import {
    normalizeNotificationBranchFilter,
    normalizeNotificationStatusFilter,
    type NotificationCenterBranchOption,
    type NotificationCenterCounts,
    type NotificationCenterStatusFilter,
    type NotificationCenterViewItem,
} from "@/lib/notification-center";

interface NotificationClientProps {
    initialNotifications: NotificationCenterViewItem[];
    branches: NotificationCenterBranchOption[];
    counts: NotificationCenterCounts;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    totalItems: number;
    from: number;
    to: number;
}

const statusTabs: Array<{ value: NotificationCenterStatusFilter; label: string; countKey: keyof NotificationCenterCounts }> = [
    { value: "PENDING", label: "Pendientes", countKey: "pending" },
    { value: "ALL", label: "Todas", countKey: "total" },
    { value: "ACCEPTED", label: "Aceptadas", countKey: "accepted" },
    { value: "REJECTED", label: "Rechazadas", countKey: "rejected" },
];

export function AdminNotificationsClient({
    initialNotifications,
    branches,
    counts,
    totalPages,
    currentPage,
    pageSize,
    totalItems,
    from,
    to,
}: NotificationClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStatus = normalizeNotificationStatusFilter(searchParams.get("status"));
    const currentBranch = normalizeNotificationBranchFilter(searchParams.get("branch"));
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const selectedBranchName = currentBranch === "ALL"
        ? "Todas las sucursales"
        : branches.find((branch) => branch.id === currentBranch)?.name ?? "Sucursal";

    const hasActiveFilters = currentStatus !== "PENDING" || currentBranch !== "ALL";

    const updateQueryParam = (key: "status" | "branch" | "page", value: string | null) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        if (key !== "page") params.set("page", "1");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleStatusChange = (value: string) => {
        updateQueryParam("status", value === "PENDING" ? null : value);
    };

    const handleBranchChange = (value: string) => {
        updateQueryParam("branch", value === "ALL" ? null : value);
    };

    const handlePageChange = (page: number) => {
        updateQueryParam("page", page.toString());
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("status");
        params.delete("branch");
        params.set("page", "1");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleResponse = async (id: string, response: "ACCEPTED" | "REJECTED") => {
        setLoadingId(id);
        try {
            const result = await respondToNotificationAction(id, response);
            if (result.success) {
                toast.success(response === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada");
                router.refresh();
            } else {
                toast.error(result.error || "Error al responder");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoadingId(null);
        }
    };

    const openNotificationLink = (href: string) => {
        router.push(href);
    };

    return (
        <div className="space-y-5">
            <section className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Inbox className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Bandeja operativa</p>
                            <p className="truncate text-sm text-muted-foreground">
                                {selectedBranchName} · {counts.pending} pendientes · {counts.unread} sin leer
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={currentBranch} onValueChange={handleBranchChange}>
                            <SelectTrigger className="h-10 min-w-[220px] rounded-lg font-semibold">
                                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Todas las sucursales" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="outline" className="h-10 rounded-lg" onClick={handleClearFilters}>
                                <X className="mr-2 h-4 w-4" />
                                Limpiar
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                    <Tabs value={currentStatus} onValueChange={handleStatusChange} className="w-full xl:w-auto">
                        <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/60 p-1 sm:grid-cols-4 xl:w-[620px]">
                            {statusTabs.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-md py-2 text-xs font-bold sm:text-sm">
                                    {tab.label}
                                    <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                        {counts[tab.countKey]}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground xl:justify-end">
                        <span>
                            {totalItems === 0
                                ? "Sin resultados"
                                : `Mostrando ${from}-${to} de ${totalItems}`}
                        </span>
                        <span className="hidden rounded-md border px-2 py-1 text-xs font-semibold sm:inline">
                            {pageSize} por página
                        </span>
                    </div>
                </div>
            </section>

            <div className="grid gap-3">
                {initialNotifications.length === 0 ? (
                    <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
                        <Bell className="mb-3 h-10 w-10 opacity-30" />
                        <p className="text-base font-semibold text-foreground">No hay notificaciones para este filtro.</p>
                        <p className="mt-1 text-sm">Probá otra sucursal o cambiá el estado.</p>
                    </section>
                ) : (
                    initialNotifications.map((notification) => (
                        <NotificationRow
                            key={notification.id}
                            notification={notification}
                            loading={loadingId === notification.id}
                            onResponse={handleResponse}
                            onOpenLink={openNotificationLink}
                        />
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Siguiente
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
