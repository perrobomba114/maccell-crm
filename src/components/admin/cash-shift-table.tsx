"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Eye,
    Store,
    User,
    Calendar as CalendarIcon,
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Clock,
    CheckCircle2,
    XCircle,
    Pencil,
    Trash2,
    AlertCircle
} from "lucide-react";
import { CashShiftWithDetails, updateCashShiftDate, deleteCashShift } from "@/actions/cash-shift-actions";
import { CashShiftDetailsModal } from "./cash-shift-details-modal";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface CashShiftTableProps {
    shifts: CashShiftWithDetails[];
}

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("es-AR", {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export function CashShiftTable({ shifts }: CashShiftTableProps) {
    const [selectedShift, setSelectedShift] = useState<CashShiftWithDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);

    // Edit State
    const [editingShift, setEditingShift] = useState<CashShiftWithDetails | null>(null);
    const [newDate, setNewDate] = useState<Date | undefined>(undefined);
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete State
    const [deletingShift, setDeletingShift] = useState<CashShiftWithDetails | null>(null);

    const handleViewDetails = (shift: CashShiftWithDetails) => {
        setSelectedShift(shift);
        setIsModalOpen(true);
    };

    const handleEditClick = (shift: CashShiftWithDetails) => {
        setEditingShift(shift);
        setNewDate(new Date(shift.startTime));
    };

    const handleDeleteClick = (shift: CashShiftWithDetails) => {
        setDeletingShift(shift);
    };

    const handleUpdateDate = async () => {
        if (!editingShift || !newDate) return;

        setIsUpdating(true);
        try {
            const res = await updateCashShiftDate(editingShift.id, newDate);
            if (res.success) {
                toast.success("Fecha actualizada correctamente");
                setEditingShift(null);
            } else {
                toast.error(res.error || "Error al actualizar fecha");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingShift) return;

        setIsUpdating(true);
        try {
            const res = await deleteCashShift(deletingShift.id);
            if (res.success) {
                toast.success("Cierre eliminado correctamente");
                setDeletingShift(null);
            } else {
                toast.error(res.error || "Error al eliminar");
            }
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setIsUpdating(false);
        }
    };


    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedShift(null);
    };

    // Filter shifts based on selected date
    const filteredShifts = shifts.filter(shift => {
        if (!date) return true;

        const shiftDate = new Date(shift.startTime);
        return (
            shiftDate.getDate() === date.getDate() &&
            shiftDate.getMonth() === date.getMonth() &&
            shiftDate.getFullYear() === date.getFullYear()
        );
    });

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex justify-end">
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
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                        {/* Clear Filter Button */}
                        <div className="p-2 border-t">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => setDate(undefined)}
                            >
                                Limpiar Filtro
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-muted/50">
                            <TableHead className="w-[100px] text-center">Estado</TableHead>
                            <TableHead className="text-center">Sucursal / Usuario</TableHead>
                            <TableHead className="text-center">Horario</TableHead>
                            <TableHead className="text-center text-green-600 dark:text-green-400">Ventas ($)</TableHead>
                            <TableHead className="text-center text-orange-600 dark:text-orange-400 font-bold">Ventas (#)</TableHead>
                            <TableHead className="text-center text-red-600 dark:text-red-400">Gastos</TableHead>
                            <TableHead className="text-center text-blue-600 dark:text-blue-400 font-bold">Neto Caja</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredShifts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Wallet className="h-8 w-8 opacity-20" />
                                        <p>No se encontraron cierres de caja {date ? "para esta fecha" : ""}.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredShifts.map((shift) => (
                                <TableRow key={shift.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-center">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                            shift.status === "OPEN"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                                : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"
                                        )}>
                                            {shift.status === "OPEN" ? (
                                                <>
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                    ABIERTA
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    CERRADA
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-2 font-medium text-foreground">
                                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                                {shift.branch.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="h-3.5 w-3.5" />
                                                {shift.user.name}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5 text-green-600/70" />
                                                <span className="font-mono text-xs">{formatDate(shift.startTime)}</span>
                                            </div>
                                            {shift.endTime && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-red-600/70" />
                                                    <span className="font-mono text-xs">{formatDate(shift.endTime)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="font-medium tabular-nums">{formatMoney(shift.totals.totalSales)}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                                            {shift.counts.sales}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {shift.totals.expenses > 0 ? (
                                            <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">
                                                - {formatMoney(shift.totals.expenses)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/30">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="font-bold text-blue-600 dark:text-blue-400 tabular-nums text-lg">
                                            {formatMoney(shift.totals.netTotal)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewDetails(shift)}
                                                className="opacity-100 transition-opacity hover:bg-primary/5 hover:text-primary"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditClick(shift)}
                                                className="opacity-100 transition-opacity hover:bg-orange-500/10 hover:text-orange-600"
                                                title="Editar fecha"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteClick(shift)}
                                                className="opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-600"
                                                title="Eliminar cierre"
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
            </div>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!deletingShift} onOpenChange={(open) => !open && setDeletingShift(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Eliminar Cierre de Caja
                        </DialogTitle>
                        <div className="text-sm text-muted-foreground pt-2">
                            ¿Estás seguro de que querés eliminar el cierre <b>#{deletingShift?.id.slice(-6).toUpperCase()}</b> de <b>{deletingShift?.branch.name}</b>?
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-3 text-red-800 text-xs">
                                <strong>Advertencia:</strong> Si este cierre fue importado históricamente, también se eliminarán las ventas asociadas ("H-...").
                                Si es un cierre real, las ventas quedarán sin asignar.
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setDeletingShift(null)} disabled={isUpdating}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isUpdating}
                        >
                            {isUpdating ? "Eliminando..." : "Confirmar Eliminación"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <CashShiftDetailsModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                shift={selectedShift}
            />

            {/* Edit Date Modal */}
            <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modificar Fecha de Cierre</DialogTitle>
                        <div className="text-sm text-muted-foreground">
                            Selecciona la nueva fecha para este cierre de caja.
                            <br />
                            <span className="font-mono text-xs">ID: {editingShift?.id.slice(-6).toUpperCase()}</span>
                        </div>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <Calendar
                            mode="single"
                            selected={newDate}
                            onSelect={setNewDate}
                            initialFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingShift(null)} disabled={isUpdating}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateDate}
                            disabled={!newDate || isUpdating}
                        >
                            {isUpdating ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
