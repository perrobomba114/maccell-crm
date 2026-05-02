"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    CalendarIcon,
    Search,
    X,
    DollarSign,
    ShoppingBag,
    Receipt,
    Building2,
    History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminSales } from "./use-admin-sales";

import { SalesMetricCard } from "./components/metrics";
import { BranchRanking } from "./components/branch-ranking";
import { SalesTable } from "./components/sales-table";
import { SaleDetailDialog } from "./components/sale-detail-dialog";
import { EditPaymentDialog } from "./components/edit-payment-dialog";
import { DeleteSaleDialog } from "./components/delete-sale-dialog";
import type { EditablePaymentMethod, PaymentMethodLike } from "@/types/sales";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
});

function toEditablePaymentMethod(method: PaymentMethodLike): EditablePaymentMethod | "" {
    return method === "CASH" || method === "CARD" || method === "MERCADOPAGO" ? method : "";
}

export default function AdminSalesClient() {
    const {
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
    } = useAdminSales();

    const selectedBranchName =
        selectedBranch === "ALL"
            ? "Todas las sucursales"
            : branches.find((b) => b.id === selectedBranch)?.name ?? "Todas las sucursales";

    const periodLabel = date ? format(date, "PPP", { locale: es }) : "Histórico completo";
    const hasActiveFilters = searchTerm.trim().length > 0 || date !== undefined || selectedBranch !== "ALL";

    const handleClearFilters = () => {
        setSearchTerm("");
        setDate(new Date());
        setSelectedBranch("ALL");
    };

    return (
        <div className="flex w-full flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Ventas</h2>
                                <p className="text-sm text-muted-foreground">
                                    Auditoría de operaciones por sucursal, vendedor, método de pago y período.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden sm:inline">Mostrando</span>
                            <Badge variant="secondary" className="rounded-md font-semibold">
                                {totalSalesCount.toLocaleString("es-AR")} operaciones
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Toolbar de filtros */}
                <div className="border-t bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                        {/* Buscador hero — full width primero */}
                        <div className="group relative flex-1">
                            <div
                                className={cn(
                                    "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition-opacity duration-300",
                                    searchTerm ? "opacity-25" : "group-focus-within:opacity-20"
                                )}
                            />
                            <div className="relative">
                                <Search
                                    className={cn(
                                        "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors",
                                        searchTerm ? "text-blue-500" : "text-muted-foreground"
                                    )}
                                />
                                <Input
                                    placeholder="Buscar ticket, cliente o producto…"
                                    className={cn(
                                        "h-12 w-full rounded-xl border-2 pl-12 pr-10 text-base font-medium shadow-sm transition-all",
                                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                                        searchTerm
                                            ? "border-blue-500 bg-blue-500/5"
                                            : "border-border bg-background hover:border-blue-500/40"
                                    )}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-stretch gap-2">
                            {/* Sucursal — emerald */}
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                <SelectTrigger
                                    className={cn(
                                        "group h-12 min-w-[180px] gap-2.5 rounded-xl border-2 px-4 font-semibold shadow-sm transition-all hover:shadow-md",
                                        selectedBranch !== "ALL"
                                            ? "border-emerald-500 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700 [&>svg]:text-white/80"
                                            : "border-border bg-background hover:border-emerald-500/50"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                            selectedBranch !== "ALL"
                                                ? "bg-white/20"
                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        )}
                                    >
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <SelectValue placeholder="Todas las sucursales" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id ?? b.name} value={b.id ?? "ALL"}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Fecha — amber */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        className={cn(
                                            "h-12 min-w-[200px] justify-start gap-2.5 rounded-xl border-2 px-4 font-semibold shadow-sm transition-all hover:shadow-md",
                                            date
                                                ? "border-amber-500 bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:from-amber-400 hover:to-orange-600"
                                                : "border-border bg-background text-foreground hover:border-amber-500/50 hover:bg-background"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                                date
                                                    ? "bg-white/20"
                                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            )}
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                        </div>
                                        <span className="flex-1 truncate text-left">
                                            {date ? format(date, "PPP", { locale: es }) : "Histórico completo"}
                                        </span>
                                        {date && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDate(undefined);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setDate(undefined);
                                                    }
                                                }}
                                                className="rounded-md p-0.5 hover:bg-white/20"
                                                title="Ver histórico completo"
                                            >
                                                <X className="h-4 w-4" />
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>

                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    onClick={handleClearFilters}
                                    className="h-12 gap-2 rounded-xl border-2 border-rose-500/30 bg-rose-500/5 px-4 font-semibold text-rose-600 shadow-sm transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-700 hover:shadow-md dark:text-rose-400 dark:hover:text-rose-300"
                                >
                                    <X className="h-4 w-4" />
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-4">
                    <SalesMetricCard
                        title="Total vendido"
                        value={currencyFormatter.format(totalRevenue)}
                        metadata={periodLabel}
                        icon={DollarSign}
                        color="emerald"
                    />
                    <SalesMetricCard
                        title="Operaciones"
                        value={totalSalesCount.toLocaleString("es-AR")}
                        metadata={`${selectedBranchName}`}
                        icon={ShoppingBag}
                        color="blue"
                    />
                    <SalesMetricCard
                        title="Ticket promedio"
                        value={currencyFormatter.format(avgTicket)}
                        metadata="Por operación filtrada"
                        icon={Receipt}
                        color="amber"
                    />
                    <SalesMetricCard
                        title="Sucursal líder"
                        value={topBranch ? currencyFormatter.format(topBranch.total) : "Sin datos"}
                        metadata={topBranch ? topBranch.branchName : "Sin ventas en el período"}
                        icon={Building2}
                        color="purple"
                    />
                </div>
            </section>

            {/* Ranking */}
            <BranchRanking
                rankingData={rankingData}
                selectedBranchId={selectedBranch}
                onSelectBranch={setSelectedBranch}
            />

            {/* Tabla */}
            <Card className="border bg-card shadow-sm">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <History className="h-5 w-5 text-emerald-600" />
                            Historial de ventas
                        </CardTitle>
                        <CardDescription>
                            Movimientos del más reciente al más antiguo
                            {selectedBranch !== "ALL" ? ` en ${selectedBranchName}` : ""}.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <SalesTable
                        sales={sales}
                        loading={loading}
                        onView={setViewingSale}
                        onEdit={(sale) => {
                            setNewPaymentMethod(toEditablePaymentMethod(sale.paymentMethod));
                            setEditingSale(sale);
                        }}
                        onPrint={handlePrint}
                        onDelete={setSaleToDelete}
                    />
                </CardContent>
            </Card>

            <SaleDetailDialog sale={viewingSale} onClose={() => setViewingSale(null)} />

            <EditPaymentDialog
                sale={editingSale}
                newPaymentMethod={newPaymentMethod}
                setNewPaymentMethod={setNewPaymentMethod}
                onClose={() => setEditingSale(null)}
                onUpdate={handleUpdatePayment}
                isUpdating={isUpdating}
            />

            <DeleteSaleDialog
                sale={saleToDelete}
                onClose={() => setSaleToDelete(null)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
