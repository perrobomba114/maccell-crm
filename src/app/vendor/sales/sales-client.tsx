"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    CalendarIcon,
    Search,
    FilterX,
    CreditCard,
    Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useVendorSales } from "./use-vendor-sales";

// Components
import { SalesTable } from "./components/sales-table";
import { SaleDetailsDialog } from "./components/sale-details-dialog";
import { EditPaymentDialog } from "./components/edit-payment-dialog";
import type { BranchSummary, EditablePaymentMethod, PaymentMethodLike } from "@/types/sales";

function toEditablePaymentMethod(method: PaymentMethodLike): EditablePaymentMethod | "" {
    return method === "CASH" || method === "CARD" || method === "MERCADOPAGO" ? method : "";
}

export default function SalesClient({ branchData }: { branchData: BranchSummary }) {
    const {
        sales,
        loading,
        date,
        setDate,
        searchTerm,
        setSearchTerm,
        paymentFilter,
        setPaymentFilter,
        selectedSaleDetails,
        setSelectedSaleDetails,
        editingSale,
        setEditingSale,
        newPaymentMethod,
        setNewPaymentMethod,
        isUpdating,
        totalSales,
        handlePrint,
        handleUpdatePayment,
        clearFilters
    } = useVendorSales(branchData);

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                <Banknote className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Mis Ventas</h2>
                                <p className="text-sm text-muted-foreground">
                                    Historial de transacciones y facturación diaria.
                                </p>
                            </div>
                        </div>

                        {/* Total Filtrado Header Pill */}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Total Filtrado:</span>
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-500 tabular-nums tracking-tighter">
                                ${totalSales.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-0 sm:p-6">
                    <div className="bg-card rounded-xl border-0 sm:border shadow-none sm:shadow-sm overflow-hidden">
                        <div className="bg-muted/30 border-b border-border/60 p-4 sm:p-6">
                            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold">Filtros de Búsqueda</h3>
                                    <p className="text-sm text-muted-foreground">Refina los resultados por ticket, fecha o método de pago.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por #Ticket..."
                                    className="pl-9 h-10 bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:ring-4 transition-all duration-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentMethodLike | "ALL")}>
                                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-border/50 font-medium focus:ring-primary/20 focus:ring-4 transition-all duration-300">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Método de Pago" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="CASH">Efectivo</SelectItem>
                                    <SelectItem value="CARD">Tarjeta</SelectItem>
                                    <SelectItem value="MERCADOPAGO">MercadoPago / Transferencia</SelectItem>
                                    <SelectItem value="MIXTO">Mixto</SelectItem>
                                </SelectContent>
                            </Select>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[200px] justify-start text-left font-medium h-10 bg-background border-border/50",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>

                                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar Filtros" className="h-10 w-10 text-muted-foreground hover:text-red-500"><FilterX className="h-5 w-5" /></Button>
                            </div>
                        </div>
                        </div>

                        <div className="p-0">
                            <SalesTable
                                sales={sales}
                                loading={loading}
                                onView={setSelectedSaleDetails}
                                onPrint={handlePrint}
                                onEdit={(sale) => {
                                    setNewPaymentMethod(toEditablePaymentMethod(sale.paymentMethod));
                                    setEditingSale(sale);
                                }}
                                clearFilters={clearFilters}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <SaleDetailsDialog
                sale={selectedSaleDetails}
                onClose={() => setSelectedSaleDetails(null)}
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
        </div>
    );
}
