"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatArgentinaDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign,
    ShoppingBag,
    Receipt,
    Building2,
    History,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminSales } from "./use-admin-sales";

import { SalesMetricCard } from "./components/metrics";
import { BranchRanking } from "./components/branch-ranking";
import { SalesTable } from "./components/sales-table";
import { SalesPagination } from "./components/sales-pagination";
import { SaleDetailDialog } from "./components/sale-detail-dialog";
import { EditPaymentDialog } from "./components/edit-payment-dialog";
import { DeleteSaleDialog } from "./components/delete-sale-dialog";
import type { EditablePaymentMethod, PaymentMethodLike, SaleWithDetails } from "@/types/sales";

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
        month, date,
        day, setDay, setMonth, clear, back,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
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
    } = useAdminSales();

    const selectedBranchName =
        selectedBranch === "ALL"
            ? "Todas las sucursales"
            : branches.find((b) => b.id === selectedBranch)?.name ?? "Todas las sucursales";

    const periodLabel = date ? format(date, "PPP", { locale: es }) : month ? format(month, "MMMM yyyy", { locale: es }) : "Histórico completo";
    const field = "mt-1 block h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-base font-normal";
    const mode = month ? "month" : date ? "day" : "history";

    const handleViewSale = (sale: SaleWithDetails) => {
        setViewingSale(sale);
    };

    return (
        <div className="flex w-full flex-col gap-6 p-4 md:p-6">
            {back && <Link href={back} className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline">Volver al Dashboard</Link>}
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

                <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="min-w-0 text-sm font-medium">Buscar venta
                        <Input type="search" className={field} placeholder="Ticket, cliente o producto" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </label>
                    <label className="min-w-0 text-sm font-medium">Sucursal
                        <select className={field} value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                            <option value="ALL">Todas las sucursales</option>
                            {branches.filter(b => b.id).map(b => <option key={b.id} value={b.id!}>{b.name}</option>)}
                        </select>
                    </label>
                    <label className="min-w-0 text-sm font-medium">Período
                        <select className={field} value={mode} onChange={e => {
                            if (e.target.value === "month") setMonth((day || formatArgentinaDate()).slice(0, 7));
                            else setDay(e.target.value === "day" ? month?.toISOString().slice(0, 10) || formatArgentinaDate() : "");
                        }}>
                            <option value="day">Por día</option><option value="month">Por mes</option><option value="history">Histórico completo</option>
                        </select>
                    </label>
                    <label className="min-w-0 text-sm font-medium">{mode === "month" ? "Mes" : "Fecha"}
                        {month ? <input className={field} type="month" value={month.toISOString().slice(0, 7)} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /> :
                            <input className={field} type="date" disabled={!day} value={day || ""} onChange={e => setDay(e.target.value)} />}
                    </label>
                    <Button variant="outline" className="h-11 w-fit" onClick={clear}>Limpiar filtros</Button>
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
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-white">
                                Historial de Ventas
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Movimientos del más reciente al más antiguo
                                {selectedBranch !== "ALL" ? ` en ${selectedBranchName}` : ""}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-300 font-mono font-bold text-xs px-3 py-1 rounded-xl">
                            {totalSalesCount.toLocaleString("es-AR")} registros
                        </Badge>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                    <SalesTable
                        sales={sales}
                        loading={loading}
                        onView={handleViewSale}
                        onEdit={(sale) => {
                            setNewPaymentMethod(toEditablePaymentMethod(sale.paymentMethod));
                            setEditingSale(sale);
                        }}
                        onPrint={handlePrint}
                        onDelete={setSaleToDelete}
                    />
                    <SalesPagination
                        page={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={totalSalesCount}
                        visibleItems={sales.length}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            <SaleDetailDialog 
                sale={viewingSale} 
                onClose={() => setViewingSale(null)} 
                onPrint={handlePrint}
            />

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
