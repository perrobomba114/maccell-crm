"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getSales, SaleWithDetails, requestPaymentMethodChange } from "@/actions/sales-actions";
import { printSaleTicket } from "@/lib/print-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    CalendarIcon,
    Printer,
    Search,
    FilterX,
    CreditCard,
    Banknote,
    Smartphone,
    ArrowRightLeft,
    MoreHorizontal,
    FileText,
    Loader2,
    Gift,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

const getPaymentBadge = (method: string, payments: any[], total: number) => {
    if (total === 0) {
        return (
            <Badge variant="secondary" className="font-bold shadow-sm px-2.5 py-0.5 bg-zinc-100 text-zinc-500 border-zinc-200">
                <Gift className="w-3 h-3 mr-1" />
                Sin Cargo
            </Badge>
        );
    }

    let label = method;
    let icon = <Banknote className="w-3 h-3 mr-1" />;
    let color = "bg-zinc-100 text-zinc-700 border-zinc-200";

    // Logic check
    if (payments && payments.length > 0) {
        // Get unique methods ignoring duplicates
        const uniqueMethods = Array.from(new Set(payments.map(p => p.method)));

        if (uniqueMethods.length > 1) {
            method = "MIXTO";
        } else if (uniqueMethods.length === 1) {
            // If only one method type exists among payments, use it
            method = uniqueMethods[0];
        }
    }

    switch (method) {
        case "CASH":
            label = "Efectivo";
            icon = <Banknote className="w-3 h-3 mr-1" />;
            color = "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
            break;
        case "CARD":
            label = "Tarjeta";
            icon = <CreditCard className="w-3 h-3 mr-1" />;
            color = "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
            break;
        case "TRANSFER":
            label = "Transferencia";
            icon = <ArrowRightLeft className="w-3 h-3 mr-1" />;
            color = "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200";
            break;
        case "MERCADOPAGO":
            label = "MercadoPago";
            icon = <Smartphone className="w-3 h-3 mr-1" />;
            color = "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200";
            break;
        case "MIXTO":
        case "SPLIT":
            label = "Dividido";
            icon = <ArrowRightLeft className="w-3 h-3 mr-1" />;
            color = "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200";
            break;
        default:
            // Fallback for any other string
            color = "bg-gray-100 text-gray-700 border-gray-200";
            break;
    }

    return (
        <Badge variant="secondary" className={cn("font-bold shadow-sm px-2.5 py-0.5", color)}>
            {icon}
            {label}
        </Badge>
    );
};

export default function SalesClient({ branchData }: { branchData: any }) {
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

    // Detail View State
    const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleWithDetails | null>(null);

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Debounce search term
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchSales();
    }, [date, debouncedSearch, paymentFilter]);

    async function fetchSales() {
        setLoading(true);
        try {
            const startStr = date ? new Date(date) : undefined;
            if (startStr) startStr.setHours(0, 0, 0, 0);

            const endStr = date ? new Date(date) : undefined;
            if (endStr) endStr.setHours(23, 59, 59, 999);

            const data = await getSales({
                startDate: startStr,
                endDate: endStr,
                term: debouncedSearch,
                // @ts-ignore - type definition updated in another file but typescript might complain strictly
                paymentMethod: paymentFilter
            });
            // @ts-ignore
            setSales(data);
        } catch (error) {
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    }

    const handlePrint = (sale: SaleWithDetails) => {
        printSaleTicket({
            branch: branchData,
            items: sale.items,
            total: sale.total,
            method: sale.paymentMethod,
            date: new Date(sale.createdAt),
            saleId: sale.saleNumber
        });
    };

    const handleUpdatePayment = async () => {
        if (!editingSale || !newPaymentMethod) return;
        setIsUpdating(true);
        try {
            const result = await requestPaymentMethodChange(editingSale.id, newPaymentMethod as any);
            if (result.success) {
                toast.success("Solicitud enviada al Administrador");
                setEditingSale(null);
            } else {
                toast.error(result.error || "Error al enviar solicitud");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setPaymentFilter("ALL");
        setDate(new Date());
    };

    const totalSales = useMemo(() => {
        return sales.reduce((acc, curr) => acc + curr.total, 0);
    }, [sales]);

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Mis Ventas</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Historial de transacciones y facturación diaria.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Filtrado:</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                        ${totalSales.toLocaleString()}
                    </span>
                </div>
            </div>

            <Card className="border-0 shadow-xl shadow-zinc-200/50 dark:shadow-black/20 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
                <CardHeader className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        {/* Filters ... (Keep same logic, just minor style fix if needed) */}
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Filtros de Búsqueda</CardTitle>
                            <CardDescription>Refina los resultados por ticket, fecha o método de pago.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Filter Controls */}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input
                                    name="search-ticket"
                                    id="search-ticket-input"
                                    aria-label="Buscar por número de ticket"
                                    placeholder="Buscar por #Ticket..."
                                    className="pl-9 h-10 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                                    >
                                        <FilterX className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger
                                    id="payment-filter-trigger"
                                    aria-label="Filtrar por método de pago"
                                    className="w-full sm:w-[180px] h-10 bg-zinc-50 border-zinc-200 font-medium"
                                >
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-zinc-500" />
                                        <SelectValue placeholder="Método de Pago" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="CASH">Efectivo</SelectItem>
                                    <SelectItem value="CARD">Tarjeta</SelectItem>
                                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                                    <SelectItem value="MERCADOPAGO">MercadoPago</SelectItem>
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
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        className="p-3 pointer-events-auto"
                                    />
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearFilters}
                                title="Limpiar Filtros"
                                className="h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                            >
                                <FilterX className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-blue-600 dark:bg-blue-900 border-none">
                            <TableRow className="hover:bg-blue-600">
                                <TableHead className="w-[180px] font-black text-white uppercase text-[11px] tracking-widest text-center pl-6">Fecha & Hora</TableHead>
                                <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Ticket</TableHead>
                                <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Detalle Items</TableHead>
                                <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-center">Método</TableHead>
                                <TableHead className="font-black text-white uppercase text-[11px] tracking-widest text-right pr-8">Total</TableHead>
                                <TableHead className="w-[100px] font-black text-white uppercase text-[11px] tracking-widest text-center">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                            <p className="font-medium animate-pulse">Cargando ventas...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-zinc-300">
                                            <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900">
                                                <FileText className="h-8 w-8" />
                                            </div>
                                            <p className="font-medium">No se encontraron ventas con estos filtros.</p>
                                            <Button variant="link" onClick={clearFilters} className="text-blue-500">
                                                Limpiar búsqueda
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => (
                                    <TableRow
                                        key={sale.id}
                                        className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors border-b border-zinc-100 dark:border-zinc-800 cursor-pointer"
                                        onClick={() => setSelectedSaleDetails(sale)}
                                    >
                                        <TableCell className="pl-6 text-center font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                                            <div className="flex flex-col items-center">
                                                <span>{format(new Date(sale.createdAt), "dd MMM yyyy", { locale: es })}</span>
                                                <span className="text-xs text-zinc-400">{format(new Date(sale.createdAt), "HH:mm")} hs</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-xs font-black font-mono text-violet-700 dark:text-violet-300 tracking-wide shadow-sm">
                                                {sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 max-w-[300px] mx-auto">
                                                {sale.items.map((item, idx) => (
                                                    <div key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 truncate text-center">
                                                        <span className="font-bold text-zinc-900 dark:text-white mr-1.5">{item.quantity}x</span>
                                                        {item.name}
                                                    </div>
                                                ))}
                                                {sale.items.length > 2 && (
                                                    <span className="text-[10px] text-zinc-400 italic font-medium text-center">+ {sale.items.length - 2} items más...</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {getPaymentBadge(sale.paymentMethod, (sale as any).payments || [], sale.total)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <span className="text-lg font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">
                                                ${sale.total.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePrint(sale);
                                                    }}
                                                    className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Imprimir Ticket"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setNewPaymentMethod(sale.paymentMethod);
                                                        setEditingSale(sale);
                                                    }}
                                                    className="h-8 w-8 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                                    title="Modificar Pago"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Sale Details Dialog */}
            <Dialog open={!!selectedSaleDetails} onOpenChange={(open) => !open && setSelectedSaleDetails(null)}>
                <DialogContent className="sm:max-w-[600px] h-[85vh] bg-zinc-950 border-zinc-800 text-zinc-50 p-0 overflow-hidden gap-0 flex flex-col">
                    <DialogHeader className="p-6 pb-2 shrink-0">
                        <DialogTitle className="flex items-center gap-3 text-xl font-medium tracking-tight">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span>Ticket #{selectedSaleDetails?.saleNumber.split('SALE-').pop()?.split('-')[0]}</span>
                                <span className="text-sm font-normal text-zinc-400">
                                    {selectedSaleDetails && format(new Date(selectedSaleDetails.createdAt), "PPP", { locale: es })}
                                </span>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Detalles de la venta
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSaleDetails && (
                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            {/* Items List - Scrollable Area */}
                            <ScrollArea className="flex-1 px-6">
                                <div className="py-4 space-y-4">
                                    {selectedSaleDetails.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start py-3 border-b border-zinc-900 last:border-0 group/item hover:bg-zinc-900/50 -mx-4 px-4 rounded-lg transition-colors">
                                            <div className="flex gap-4">
                                                <div className="h-10 w-10 rounded-md bg-zinc-900 flex items-center justify-center text-sm font-bold text-zinc-500">
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-zinc-200">{item.name}</span>
                                                    <span className="text-xs text-zinc-500">Código: {item.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-zinc-200 tabular-nums">
                                                    ${(item.price * item.quantity).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-zinc-500 tabular-nums">
                                                    ${item.price.toLocaleString()} un.
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Summary Footer - Fixed at bottom */}
                            <div className="bg-zinc-900/50 p-6 border-t border-zinc-900 space-y-6 shrink-0 z-10">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm text-zinc-500 font-medium">Método de Pago</p>
                                        <div>
                                            {getPaymentBadge(selectedSaleDetails.paymentMethod, (selectedSaleDetails as any).payments || [], selectedSaleDetails.total)}
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-sm text-zinc-500 font-medium">Total de Venta</p>
                                        <p className="text-3xl font-bold tracking-tighter text-white tabular-nums">
                                            ${selectedSaleDetails.total.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 [&>button]:flex-1">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedSaleDetails(null)}
                                        className="bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    >
                                        Cerrar
                                    </Button>
                                    <Button
                                        onClick={() => selectedSaleDetails && handlePrint(selectedSaleDetails)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-900/20"
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Reimprimir Comprobante
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Payment Method Dialog */}
            <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Modificar Método de Pago</DialogTitle>
                        <DialogDescription>
                            Esta acción enviará una solicitud al administrador para aprobar el cambio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-col items-center">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Venta</span>
                            <span className="text-3xl font-black text-zinc-900">${editingSale?.total.toLocaleString()}</span>
                            <span className="text-xs text-zinc-500 mt-2 font-mono bg-white px-2 py-1 rounded border">
                                {editingSale?.saleNumber}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-method-trigger" className="text-sm font-medium">Nuevo Método de Pago</Label>
                            <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                <SelectTrigger id="payment-method-trigger" className="w-full h-11">
                                    <SelectValue placeholder="Seleccionar método" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">
                                        <div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Efectivo</div>
                                    </SelectItem>
                                    <SelectItem value="CARD">
                                        <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Tarjeta</div>
                                    </SelectItem>
                                    <SelectItem value="MERCADOPAGO">
                                        <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> MercadoPago</div>
                                    </SelectItem>
                                    <SelectItem value="TRANSFER">
                                        <div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Transferencia</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSale(null)}>Cancelar</Button>
                        <Button onClick={handleUpdatePayment} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {isUpdating ? "Enviando..." : "Confirmar Solicitud"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
