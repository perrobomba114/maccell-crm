"use client";

import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check, ClipboardCheck, PackageMinus, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toggleHistoryChecked, syncRepairHistoryAction } from "@/actions/spare-parts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { useRouter, useSearchParams } from "next/navigation";
import type { SparePartHistoryListItem } from "@/actions/spare-parts/history";

interface HistoryClientProps {
    data: SparePartHistoryListItem[];
    totalPages: number;
    currentPage: number;
    total: number;
}

export function HistoryClient({ data, totalPages, currentPage, total }: HistoryClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlDate = searchParams.get("date");
    const [date, setDate] = useState<Date | undefined>(
        urlDate ? new Date(`${urlDate}T12:00:00`) : new Date()
    );
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const pendingCount = data.filter((item) => !item.isChecked).length;
    const checkedCount = data.length - pendingCount;
    const visibleData = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return data;

        return data.filter((item) => {
            const searchableValues = [
                item.sparePart.name,
                item.sparePart.sku,
                item.user.name,
                item.user.email,
                item.branch.name,
                item.branch.code,
                item.reason || "",
            ];
            return searchableValues.some((value) => value.toLowerCase().includes(query));
        });
    }, [data, searchTerm]);

    const handleDateSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        const params = new URLSearchParams(searchParams.toString());
        if (newDate) {
            params.set("date", format(newDate, "yyyy-MM-dd"));
        } else {
            params.delete("date");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const res = await syncRepairHistoryAction();
            if (res.success) {
                toast.success(`Sincronización completada. Se añadieron ${res.count} registros.`);
                router.refresh();
            } else {
                toast.error(res.error || "Error al sincronizar");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleCheck = async (id: string, currentStatus: boolean) => {
        try {
            const res = await toggleHistoryChecked(id);
            if (res.success) {
                toast.success(currentStatus ? "Marcado como pendiente" : "Controlado correctamente");
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Error al actualizar");
        }
    };

    return (
        <Card className="w-full overflow-hidden">
            <CardHeader className="space-y-4 border-b bg-gradient-to-r from-amber-500/5 via-blue-500/5 to-emerald-500/5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">Movimientos de Stock</CardTitle>
                        <p className="text-sm text-muted-foreground">{total} registros en el período seleccionado.</p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    <HistoryKpi label="Visibles" value={data.length} meta="En esta página" gradient="from-amber-400 to-orange-600" text="text-amber-100" icon={<PackageMinus className="h-6 w-6 text-white" />} />
                    <HistoryKpi label="Controlados" value={checkedCount} meta="Marcados por admin" gradient="from-emerald-500 to-emerald-700" text="text-emerald-100" icon={<ClipboardCheck className="h-6 w-6 text-white" />} />
                    <HistoryKpi label="Pendientes" value={pendingCount} meta="Requieren revisión" gradient="from-rose-500 to-red-700" text="text-rose-100" icon={<Check className="h-6 w-6 text-white" />} />
                </div>

                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar por repuesto, SKU, usuario, sucursal o motivo..."
                            className="h-10 pl-9"
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                            {isSyncing ? "Sincronizando..." : "Sincronizar Reparaciones"}
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal sm:w-[240px]",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-hidden">
                    {/* Mobile View */}
                    <div className="sm:hidden flex flex-col divide-y divide-border/60">
                        {visibleData.length === 0 ? (
                            <div className="h-24 flex items-center justify-center text-muted-foreground p-4">
                                No hay movimientos que coincidan con los filtros.
                            </div>
                        ) : (
                            visibleData.map((item) => (
                                <div key={item.id} className={cn(
                                    "p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors",
                                    item.isChecked && "bg-muted/20"
                                )}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                    {item.sparePart.sku}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {format(new Date(item.createdAt), "HH:mm")}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-sm leading-tight break-words">{item.sparePart.name}</h3>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className={cn(
                                                "text-lg font-black tabular-nums tracking-tighter",
                                                item.quantity < 0 ? "text-rose-600" : "text-emerald-600"
                                            )}>
                                                {item.quantity}
                                            </span>
                                            <Button
                                                variant={item.isChecked ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handleToggleCheck(item.id, item.isChecked)}
                                                className={cn("h-7 w-7 p-0 rounded-full", item.isChecked && "bg-emerald-600 hover:bg-emerald-700")}
                                            >
                                                {item.isChecked ? <Check className="h-3 w-3" /> : <ClipboardCheck className="h-3 w-3 opacity-50" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-2 border-t border-border/40">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Usuario</span>
                                            <span className="text-[11px] font-bold truncate">{item.user.name}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 border-l border-border/40 pl-4">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sucursal</span>
                                            <span className="text-[11px] font-bold truncate">{item.branch.name}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 pt-2 border-t border-border/40 bg-muted/30 p-2 rounded-md">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Motivo</span>
                                        <p className="text-xs text-muted-foreground break-words">{item.reason || "-"}</p>
                                    </div>
                                    
                                    <div className="text-[9px] text-muted-foreground font-medium text-right italic">
                                        {format(new Date(item.createdAt), "PPP", { locale: es })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[110px]">Fecha / Hora</TableHead>
                                    <TableHead className="w-[220px]">Repuesto</TableHead>
                                    <TableHead className="w-[100px]">SKU</TableHead>
                                    <TableHead className="w-[70px] text-center">Cant.</TableHead>
                                    <TableHead className="w-[160px]">Usuario</TableHead>
                                    <TableHead className="w-[140px]">Sucursal</TableHead>
                                    <TableHead className="min-w-[260px]">Motivo</TableHead>
                                    <TableHead className="w-[90px] text-center">Control</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No hay movimientos que coincidan con los filtros.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleData.map((item) => (
                                        <TableRow key={item.id} className={item.isChecked ? "bg-muted/30" : ""}>
                                            <TableCell className="font-medium">
                                                {format(new Date(item.createdAt), "HH:mm")}
                                                <span className="block text-xs text-muted-foreground">
                                                    {format(new Date(item.createdAt), "dd/MM/yyyy")}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[220px] truncate font-medium" title={item.sparePart.name}>
                                                    {item.sparePart.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{item.sparePart.sku}</TableCell>
                                            <TableCell className={cn("text-center font-bold", item.quantity < 0 ? "text-rose-600" : "text-emerald-600")}>
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{item.user.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{item.branch.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.branch.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-normal text-sm text-muted-foreground">
                                                {item.reason || "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant={item.isChecked ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleToggleCheck(item.id, item.isChecked)}
                                                    className={cn("h-8 w-8 p-0", item.isChecked && "bg-emerald-600 hover:bg-emerald-700")}
                                                    aria-label={item.isChecked ? "Marcar como pendiente" : "Marcar como controlado"}
                                                >
                                                    {item.isChecked && <Check className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="border-t p-4">
                        <Pagination>
                            <PaginationContent>
                                {currentPage > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); handlePageChange(currentPage - 1); }} />
                                    </PaginationItem>
                                )}
                                {Array.from({ length: totalPages }).map((_, index) => {
                                    const page = index + 1;
                                    if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 2) {
                                        if (page === 2 || page === totalPages - 1) return <PaginationItem key={page}>...</PaginationItem>;
                                        return null;
                                    }
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationLink href="#" isActive={currentPage === page} onClick={(event) => { event.preventDefault(); handlePageChange(page); }}>
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}
                                {currentPage < totalPages && (
                                    <PaginationItem>
                                        <PaginationNext href="#" onClick={(event) => { event.preventDefault(); handlePageChange(currentPage + 1); }} />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function HistoryKpi({ label, value, meta, gradient, text, icon }: { label: string; value: number; meta: string; gradient: string; text: string; icon: ReactNode }) {
    return (
        <Card className={cn("relative overflow-hidden border-none bg-gradient-to-br text-white shadow-lg", gradient)}>
            <CardContent className="flex min-h-[180px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <p className={cn("line-clamp-2 min-h-[2.5rem] text-sm font-medium", text)}>{label}</p>
                    <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">{icon}</div>
                </div>
                <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</h3>
                <div className={cn("mt-auto pt-4 text-sm", text)}>{meta}</div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}
