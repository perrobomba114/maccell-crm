"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, Trash2, DollarSign, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminSales } from "./use-admin-sales";

// Components
import { SalesMetricCard, SalesRankingCard } from "./components/metrics";
import { SalesTable } from "./components/sales-table";
import { SaleDetailDialog } from "./components/sale-detail-dialog";
import { EditPaymentDialog } from "./components/edit-payment-dialog";
import { DeleteSaleDialog } from "./components/delete-sale-dialog";
import type { EditablePaymentMethod, PaymentMethodLike } from "@/types/sales";

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
        handleConfirmDelete
    } = useAdminSales();

    return (
        <div className="p-4 md:p-6 w-full mx-auto space-y-6">
            <div className="flex flex-col gap-6">
                {/* Header Title */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
                    <p className="text-muted-foreground mt-1">Gestiona y consulta las ventas de todas las sucursales.</p>
                </div>

                {/* Toolbar: Branches + Search/Filter */}
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between w-full">
                    {/* Left: Branch Buttons */}
                    <div className="flex flex-col gap-1.5 w-full xl:w-auto">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sucursales</Label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedBranch("ALL")}
                                className={cn(
                                    "h-8 border-dashed",
                                    selectedBranch === "ALL"
                                        ? "!bg-amber-500 !text-black !border-amber-500 hover:!bg-amber-600 !border-solid"
                                        : "hover:border-slate-800/50 hover:bg-slate-50/50"
                                )}
                            >
                                Todas
                            </Button>
                            {branches.map((b, index) => {
                                const colors = [
                                    "!bg-orange-500 !border-orange-500 hover:!bg-orange-600 text-white",
                                    "!bg-blue-500 !border-blue-500 hover:!bg-blue-600 text-white",
                                    "!bg-green-500 !border-green-500 hover:!bg-green-600 text-white",
                                    "!bg-purple-500 !border-purple-500 hover:!bg-purple-600 text-white",
                                    "!bg-pink-500 !border-pink-500 hover:!bg-pink-600 text-white",
                                    "!bg-cyan-500 !border-cyan-500 hover:!bg-cyan-600 text-white",
                                    "!bg-red-500 !border-red-500 hover:!bg-red-600 text-white",
                                    "!bg-indigo-500 !border-indigo-500 hover:!bg-indigo-600 text-white",
                                ];
                                const colorClass = colors[index % colors.length];

                                return (
                                    <Button
                                        key={b.id ?? b.name}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedBranch(b.id ?? "ALL")}
                                        className={cn(
                                            "h-8 transition-colors duration-200",
                                            selectedBranch === b.id
                                                ? colorClass
                                                : "hover:bg-accent"
                                        )}
                                    >
                                        {b.name}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Search & Date */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full xl:w-auto xl:mt-5">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por ticket..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchTerm(val);
                                    if (val.length > 0) {
                                        setDate(undefined);
                                    } else {
                                        setDate(new Date());
                                    }
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[200px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Filtrar por fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {date && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDate(undefined)}
                                    title="Limpiar fecha"
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SalesMetricCard
                        title="Total Vendido (Selección)"
                        value={new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalRevenue)}
                        icon={DollarSign}
                        color="emerald"
                    />
                    <SalesMetricCard
                        title="Ventas Totales (Cantidad)"
                        value={`${totalSalesCount} operaciones`}
                        icon={ShoppingBag}
                        color="blue"
                    />
                    <SalesRankingCard rankingData={rankingData} />
                </div>
            </div>

            <Card>
                <CardHeader className="px-7">
                    <CardTitle>Historial de Ventas</CardTitle>
                    <CardDescription>Registro completo de transacciones de todas las sucursales.</CardDescription>
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

            <SaleDetailDialog
                sale={viewingSale}
                onClose={() => setViewingSale(null)}
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
