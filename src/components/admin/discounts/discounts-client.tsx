"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, Calendar as CalendarIcon, Clock, Percent, Search, Store, User, X } from "lucide-react";
import { getPriceOverrides } from "@/actions/discount-actions";
import { getBranchesList } from "@/actions/statistics-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PriceOverrideListItem } from "@/actions/discount-actions";

interface BranchOption {
    id: string;
    name: string;
}

function isBranchOption(value: unknown): value is BranchOption {
    return typeof value === "object" && value !== null && "id" in value && "name" in value;
}

export function AdminDiscountsClient() {
    const [overrides, setOverrides] = useState<PriceOverrideListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [branchId, setBranchId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadBranches = async () => {
            const branchesData = await getBranchesList();
            if (Array.isArray(branchesData)) {
                setBranches(branchesData.filter(isBranchOption));
            }
        };
        void loadBranches();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const res = await getPriceOverrides({ page, limit: 25, date: date || null, branchId });
            if (res.success && res.overrides) {
                setOverrides(res.overrides);
                setTotalPages(res.totalPages || 1);
                setTotal(res.total || 0);
            } else {
                toast.error(res.error || "Error al cargar historial de descuentos");
            }
            setLoading(false);
        };
        void loadData();
    }, [branchId, date, page]);

    const filteredItems = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return overrides;

        return overrides.filter((item) => [
            item.product?.name || "",
            item.repair?.deviceModel || "",
            item.name,
            item.sale.branch.name,
            item.sale.vendor.name,
            item.priceChangeReason || "",
        ].some((value) => value.toLowerCase().includes(query)));
    }, [overrides, searchTerm]);

    const summary = useMemo(() => {
        return filteredItems.reduce(
            (acc, item) => {
                const original = item.originalPrice || 0;
                const diff = item.price - original;
                if (diff < 0) acc.discounts += Math.abs(diff);
                if (diff > 0) acc.increases += diff;
                return acc;
            },
            { discounts: 0, increases: 0 }
        );
    }, [filteredItems]);

    const clearFilters = () => {
        setBranchId(null);
        setDate(new Date());
        setSearchTerm("");
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-400 to-red-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <Percent className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Historial de Descuentos</h1>
                            <p className="text-sm text-muted-foreground">Auditoría de modificaciones de precio por venta, sucursal y vendedor.</p>
                        </div>
                    </div>
                    <Badge variant="secondary">{total} registros</Badge>
                </div>
                <div className="grid gap-3 border-t bg-gradient-to-r from-rose-500/5 via-blue-500/5 to-emerald-500/5 p-4 md:grid-cols-[1fr_auto_auto_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar producto, vendedor, sucursal o motivo..." className="h-10 pl-9" />
                    </div>
                    <Select value={branchId || "all"} onValueChange={(value) => { setBranchId(value === "all" ? null : value); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full md:w-[220px]">
                            <Store className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las sucursales</SelectItem>
                            {branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal md:w-[230px]", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="single" selected={date} onSelect={(value) => { setDate(value); setPage(1); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" className="h-10 border-rose-500/30 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />Limpiar
                    </Button>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-3">
                <SummaryCard label="Registros visibles" value={filteredItems.length.toLocaleString()} meta="Según filtros activos" gradient="from-blue-500 to-indigo-600" text="text-blue-100" icon={<Search className="h-6 w-6 text-white" />} />
                <SummaryCard label="Descuentos aplicados" value={`$${summary.discounts.toLocaleString()}`} meta="Diferencia negativa" gradient="from-rose-500 to-red-700" text="text-rose-100" icon={<ArrowDown className="h-6 w-6 text-white" />} />
                <SummaryCard label="Aumentos aplicados" value={`$${summary.increases.toLocaleString()}`} meta="Diferencia positiva" gradient="from-emerald-500 to-emerald-700" text="text-emerald-100" icon={<ArrowUp className="h-6 w-6 text-white" />} />
            </div>

            <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Fecha</TableHead>
                                <TableHead>Sucursal / Vendedor</TableHead>
                                <TableHead>Producto / Servicio</TableHead>
                                <TableHead className="text-center">Precios</TableHead>
                                <TableHead className="text-center">Modificación</TableHead>
                                <TableHead className="text-center">Motivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}><TableCell colSpan={6} className="h-16 text-center"><div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-muted/50" /></TableCell></TableRow>
                                ))
                            ) : filteredItems.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No se encontraron registros para los filtros seleccionados.</TableCell></TableRow>
                            ) : (
                                filteredItems.map((item) => <DiscountRow key={item.id} item={item} />)
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious onClick={() => setPage((value) => Math.max(1, value - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                        </PaginationItem>
                        {Array.from({ length: totalPages }).map((_, index) => (
                            <PaginationItem key={index}>
                                <PaginationLink isActive={page === index + 1} onClick={() => setPage(index + 1)} className="cursor-pointer">{index + 1}</PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}

function SummaryCard({ label, value, meta, gradient, text, icon }: { label: string; value: string; meta: string; gradient: string; text: string; icon: ReactNode }) {
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

function DiscountRow({ item }: { item: PriceOverrideListItem }) {
    const original = item.originalPrice || 0;
    const diff = item.price - original;
    const percent = original ? Math.round((Math.abs(diff) / original) * 100) : 0;
    const isDiscount = diff < 0;
    const isRepair = Boolean(item.repair);

    return (
        <TableRow className="group border-b border-border/40 transition-colors hover:bg-muted/30">
            <TableCell className="py-4">
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 font-bold"><CalendarIcon className="h-3.5 w-3.5 text-primary/70" />{format(new Date(item.sale.createdAt), "dd MMM", { locale: es })}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{format(new Date(item.sale.createdAt), "HH:mm")}</span>
                </div>
            </TableCell>
            <TableCell className="py-4">
                <Badge variant="secondary" className="mb-1 gap-1"><Store className="h-3 w-3" />{item.sale.branch.name}</Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{item.sale.vendor.name}</div>
            </TableCell>
            <TableCell className="py-4">
                <Badge variant="outline" className={cn("mb-1 text-[10px] font-bold uppercase", isRepair ? "border-amber-500/20 bg-amber-500/10 text-amber-600" : "border-blue-500/20 bg-blue-500/10 text-blue-600")}>
                    {isRepair ? "Reparación" : "Producto"}
                </Badge>
                <div className="max-w-[260px] text-sm font-medium leading-tight">{item.product?.name || item.repair?.deviceModel || item.name}</div>
            </TableCell>
            <TableCell className="py-4 text-center">
                <span className="text-xs text-muted-foreground line-through">${original.toLocaleString()}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-bold">${item.price.toLocaleString()}</span>
            </TableCell>
            <TableCell className="py-4 text-center">
                <Badge variant="outline" className={cn("font-bold", isDiscount ? "border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/30" : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30")}>
                    {isDiscount ? <ArrowDown className="mr-1 h-3 w-3" /> : <ArrowUp className="mr-1 h-3 w-3" />}
                    {percent}%
                </Badge>
                <div className={cn("mt-1 text-xs font-medium tabular-nums", isDiscount ? "text-rose-600" : "text-emerald-600")}>
                    {isDiscount ? "-" : "+"}${Math.abs(diff).toLocaleString()}
                </div>
            </TableCell>
            <TableCell className="py-4 text-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="mx-auto max-w-[190px] cursor-help truncate rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs italic text-muted-foreground transition-colors hover:bg-muted/40">
                                {item.priceChangeReason || "Sin motivo especificado"}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs text-sm">{item.priceChangeReason || "Sin motivo"}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
        </TableRow>
    );
}
