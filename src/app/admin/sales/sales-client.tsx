"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getAdminSales } from "@/actions/sales-actions";
import { printSaleTicket } from "@/lib/print-utils";
import { getAllBranches } from "@/actions/branch-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Printer, Search, Building2, Edit, Eye, Trash2, DollarSign, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { updateSalePaymentMethod, deleteSale } from "@/actions/sales-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

// Simplified Metric Card for Sales
function SalesMetricCard({ title, value, icon: Icon, color }: any) {
    const colorStyles: any = {
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    };

    return (
        <Card className="border-zinc-800 bg-[#18181b]">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
                </div>
                <div className={cn("p-3 rounded-xl", colorStyles[color] || colorStyles.blue)}>
                    <Icon size={24} strokeWidth={2} />
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminSalesClient() {
    const searchParams = useSearchParams();

    // Initialize state directly from URL params to avoid race conditions
    const initialQuery = searchParams.get("search") || "";

    const [sales, setSales] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // If we have an initial search, we clear the date. Otherwise default to Today.
    const [date, setDate] = useState<Date | undefined>(
        initialQuery ? undefined : new Date()
    );
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

    // Handle search param updates (navigation while on page)
    useEffect(() => {
        const querySearch = searchParams.get("search");
        if (querySearch && querySearch !== searchTerm) {
            setSearchTerm(querySearch);
            setDate(undefined); // Clear date filter to search globally
        }
    }, [searchParams]);

    // Computed Totals
    const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalSalesCount = sales.length;

    // View Sale State
    const [viewingSale, setViewingSale] = useState<any>(null);

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<any>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Sale State
    const [saleToDelete, setSaleToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!saleToDelete) return;
        setIsDeleting(true);
        try {
            const result = await deleteSale(saleToDelete.id);
            if (result.success) {
                toast.success("Venta eliminada. Stock y Reparaciones restaurados.");
                setSaleToDelete(null);
                fetchSales();
            } else {
                toast.error(result.error || "Error al eliminar venta");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        fetchSales();
    }, [date, searchTerm, selectedBranch]);

    async function loadBranches() {
        const res = await getAllBranches();
        if (res.success && res.branches) {
            setBranches(res.branches);
        }
    }

    async function fetchSales() {
        setLoading(true);
        try {
            const startStr = date ? new Date(date) : undefined;
            if (startStr) startStr.setHours(0, 0, 0, 0);

            const endStr = date ? new Date(date) : undefined;
            if (endStr) endStr.setHours(23, 59, 59, 999);

            const data = await getAdminSales({
                startDate: startStr,
                endDate: endStr,
                term: searchTerm,
                branchId: selectedBranch
            });
            setSales(data);
        } catch (error) {
            console.error("Error loading sales", error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    }

    const handlePrint = (sale: any) => {
        const branchForPrint = sale.branch || {};

        printSaleTicket({
            branch: {
                name: branchForPrint.name,
                address: branchForPrint.address || "",
                phone: branchForPrint.phone || "",
            },
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
            const result = await updateSalePaymentMethod(editingSale.id, newPaymentMethod as any);
            if (result.success) {
                toast.success("Método de pago actualizado");
                setEditingSale(null);
                fetchSales();
            } else {
                toast.error(result.error || "Error al actualizar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
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
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedBranch(b.id)}
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
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

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
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
            </div>

            <Card>
                <CardHeader className="px-7">
                    <CardTitle>Historial de Ventas</CardTitle>
                    <CardDescription>Registro completo de transacciones de todas las sucursales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Fecha</TableHead>
                                <TableHead className="text-center">Sucursal</TableHead>
                                <TableHead className="text-center">Ticket</TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Método</TableHead>
                                <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No se encontraron ventas con los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium text-center">
                                            {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-sm text-center">
                                            <Badge variant="outline">{sale.branch?.name || "N/A"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs text-center">
                                            {sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="text-sm flex justify-center" title={sale.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}>
                                                {sale.items.length === 1
                                                    ? <span className="text-muted-foreground">{sale.items[0].quantity}x {sale.items[0].name}</span>
                                                    : <span className="font-medium text-muted-foreground">{sale.items.length} items</span>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            ${sale.total.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {(() => {
                                                const payments = (sale as any).payments || [];
                                                let method = sale.paymentMethod;
                                                let label = "MercadoPago";
                                                let color = "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400";

                                                if (payments.length > 1) {
                                                    method = "MIXTO";
                                                    label = "Mixto";
                                                    color = "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
                                                } else if (payments.length === 1) {
                                                    method = payments[0].method;
                                                }

                                                if (method === "CASH") {
                                                    label = "Efectivo";
                                                    color = "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400";
                                                } else if (method === "CARD") {
                                                    label = "Tarjeta";
                                                    color = "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                                                } else if (method === "TRANSFER") {
                                                    label = "Transferencia";
                                                    color = "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400";
                                                } else if (method === "MERCADOPAGO") {
                                                    label = "MercadoPago";
                                                    color = "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
                                                }

                                                return (
                                                    <Badge variant="secondary" className={cn("font-normal mx-auto", color)}>
                                                        {label}
                                                    </Badge>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => setViewingSale(sale)}
                                                    title="Ver Detalle"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                        setNewPaymentMethod(sale.paymentMethod);
                                                        setEditingSale(sale);
                                                    }}
                                                    title="Cambiar método de pago"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 px-0"
                                                    onClick={() => handlePrint(sale)}
                                                    title="Imprimir Ticket"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setSaleToDelete(sale)}
                                                    title="Eliminar Venta"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            {/* View Details Dialog */}
            <Dialog open={!!viewingSale} onOpenChange={(open) => !open && setViewingSale(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Detalle de Venta</span>
                            {viewingSale && (
                                <Badge variant="outline" className="font-mono">
                                    {viewingSale.saleNumber.split('SALE-').pop()?.split('-')[0]}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Información detallada de la transacción.
                        </DialogDescription>
                    </DialogHeader>

                    {viewingSale && (
                        <div className="py-4 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Fecha</Label>
                                    <div className="font-medium">{format(new Date(viewingSale.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Sucursal</Label>
                                    <div className="font-medium">{viewingSale.branch?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Vendedor</Label>
                                    <div className="font-medium">{viewingSale.vendor?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Método de Pago</Label>
                                    <div className="font-medium flex items-center gap-2">
                                        {(() => {
                                            const payments = (viewingSale as any).payments || [];
                                            let label = "MercadoPago";
                                            let method = viewingSale.paymentMethod;

                                            if (payments.length > 1) {
                                                label = `Mixto (${payments.map((p: any) => p.method === "CASH" ? "Efvo" : p.method === "CARD" ? "Tarj" : "MP").join(" + ")})`;
                                            } else if (payments.length === 1) {
                                                method = payments[0].method;
                                            }

                                            if (method === "CASH") label = "Efectivo";
                                            else if (method === "CARD") label = "Tarjeta";
                                            else if (method === "TRANSFER") label = "Transferencia";
                                            else if (method === "MERCADOPAGO") label = "MercadoPago";

                                            return label;
                                        })()}
                                        {viewingSale.wasPaymentModified && (
                                            <Badge variant="destructive" className="text-[10px] px-1 h-5">Modificado</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[80px]">Cant.</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewingSale.items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.quantity}x</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell className="text-right">${(item.quantity * item.price).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/20 font-bold">
                                            <TableCell colSpan={2} className="text-right">TOTAL</TableCell>
                                            <TableCell className="text-right text-lg">${viewingSale.total.toLocaleString()}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="sm:justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                            {viewingSale?.id && <span className="font-mono text-[10px] opacity-70">ID: {viewingSale.id}</span>}
                        </div>
                        <Button onClick={() => setViewingSale(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Payment Method Dialog */}
            <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Modificar Método de Pago</DialogTitle>
                        <DialogDescription>
                            Cambiar el método de pago para el ticket <span className="font-mono font-bold text-primary">{editingSale?.saleNumber.split('SALE-').pop()?.split('-')[0]}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Label className="text-sm font-medium">Nuevo Método de Pago</Label>
                        <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                            <SelectTrigger className="mt-2 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Efectivo</SelectItem>
                                <SelectItem value="CARD">Tarjeta (Débito/Crédito)</SelectItem>
                                <SelectItem value="MERCADOPAGO">MercadoPago / Transferencia</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSale(null)}>Cancelar</Button>
                        <Button onClick={handleUpdatePayment} disabled={isUpdating}>
                            {isUpdating ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro de eliminar esta venta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es irreversible. Se realizarán las siguientes acciones:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>El stock de los productos será devuelto a la sucursal <strong>{saleToDelete?.branch?.name}</strong>.</li>
                                <li>Si hay reparaciones vinculadas, volverán al estado <strong>Reparado</strong>.</li>
                                <li>La venta y su registro de pago se eliminarán permanentemente.</li>
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar Venta"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
