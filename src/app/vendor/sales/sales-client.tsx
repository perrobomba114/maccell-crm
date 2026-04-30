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
    CreditCard
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
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Mis Ventas</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Historial de transacciones y facturación diaria.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Filtrado:</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">${totalSales.toLocaleString()}</span>
                </div>
            </div>

            <Card className="border-0 shadow-xl shadow-zinc-200/50 dark:shadow-black/20 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
                <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Filtros de Búsqueda</CardTitle>
                            <CardDescription>Refina los resultados por ticket, fecha o método de pago.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input
                                    placeholder="Buscar por #Ticket..."
                                    className="pl-9 h-10 bg-zinc-50 border-zinc-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentMethodLike | "ALL")}>
                                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-zinc-50 border-zinc-200 font-medium">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-zinc-500" />
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
                                            "w-full sm:w-[200px] justify-start text-left font-medium h-10 border-zinc-200 bg-zinc-50",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>

                            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar Filtros" className="h-10 w-10 text-zinc-400 hover:text-red-500"><FilterX className="h-5 w-5" /></Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
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
                </CardContent>
            </Card>

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
