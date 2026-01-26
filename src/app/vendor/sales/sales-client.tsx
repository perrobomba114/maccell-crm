"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getSales, SaleWithDetails } from "@/actions/sales-actions";
import { printSaleTicket } from "@/lib/print-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Printer, Search } from "lucide-react";
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
import { updateSalePaymentMethod, requestPaymentMethodChange } from "@/actions/sales-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";
import { toast } from "sonner";

export default function SalesClient({ branchData }: { branchData: any }) {
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState("");

    // Edit Payment State
    const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchSales();
    }, [date, searchTerm]);

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
                term: searchTerm
            });
            // @ts-ignore - mismatch in vendor type?
            setSales(data);
        } catch (error) {
            console.error("Error loading sales", error);
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
            // Vendors must request change
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

    return (
        <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Mis Ventas</h1>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar ticket..."
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
                                    "w-[240px] justify-start text-left font-normal",
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

            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Ticket</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Cargando ventas...
                                </TableCell>
                            </TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No se encontraron ventas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {sale.saleNumber.split('SALE-').pop()?.split('-')[0] || sale.saleNumber}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm" title={sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                                            {sale.items.length === 1
                                                ? <span className="text-muted-foreground">{sale.items[0].quantity}x {sale.items[0].name}</span>
                                                : <span className="font-medium text-muted-foreground">{sale.items.length} items</span>
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            const payments = (sale as any).payments || [];
                                            let method = sale.paymentMethod;
                                            let label = "MercadoPago";
                                            let color = "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"; // Default/MP

                                            if (payments.length > 1) {
                                                method = "MIXTO";
                                                label = "Mixto";
                                                color = "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
                                            } else if (payments.length === 1) {
                                                method = payments[0].method;
                                            }

                                            // Fallback or Single Payment Logic
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
                                                <Badge variant="secondary" className={cn("font-normal", color)}>
                                                    {label}
                                                </Badge>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ${sale.total.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
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
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

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
                            {isUpdating ? "Enviando..." : "Enviar Solicitud"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

}
