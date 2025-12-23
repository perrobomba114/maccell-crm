"use client";

import { useState, useEffect } from "react";
import { getPriceOverrides } from "@/actions/discount-actions";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar,
    Store,
    User,
    Tag,
    ArrowDown,
    ArrowUp,
    Search,
    Package,
    Wrench,
    Clock,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

export default function AdminDiscountsPage() {
    const [overrides, setOverrides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getPriceOverrides(100);
        if (res.success && res.overrides) {
            setOverrides(res.overrides);
        }
        setLoading(false);
    };

    const filteredItems = overrides.filter(item =>
        item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sale.branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sale.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 p-1">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        Historial de Descuentos
                    </h2>
                    <p className="text-muted-foreground">
                        Registro y auditoría de modificaciones de precio.
                    </p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 focus:bg-background transition-all"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="w-[120px] text-center font-semibold text-muted-foreground h-12">FECHA</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">SUCURSAL / VENDEDOR</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">PRODUCTO / SERVICIO</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">PRECIOS</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">MODIFICACIÓN</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">MOTIVO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
                                        <Package className="h-8 w-8 opacity-50" />
                                        <p>Cargando datos...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No se encontraron registros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => {
                                const original = item.originalPrice || 0;
                                const price = item.price;
                                const diff = price - original;
                                const percent = original ? Math.round((Math.abs(diff) / original) * 100) : 0;
                                const isDiscount = diff < 0;
                                const isRepair = !!item.repair;

                                return (
                                    <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors border-b border-border/40">
                                        {/* Fecha */}
                                        <TableCell className="text-center py-4">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="flex items-center gap-1.5 font-bold text-foreground">
                                                    <Calendar className="h-3.5 w-3.5 text-primary/70" />
                                                    {format(new Date(item.sale.createdAt), "dd MMM", { locale: es })}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(item.sale.createdAt), "HH:mm")}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Contexto */}
                                        <TableCell className="text-center py-4">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <Badge variant="secondary" className="font-normal text-xs bg-muted/60 hover:bg-muted text-foreground border-border/50">
                                                    <Store className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    {item.sale.branch.name}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <User className="h-3 w-3" />
                                                    {item.sale.vendor.name}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Producto */}
                                        <TableCell className="text-center py-4">
                                            <div className="flex flex-col items-center justify-center gap-1 max-w-[250px] mx-auto">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                                                    isRepair
                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                                        : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
                                                )}>
                                                    {isRepair ? "Reparación" : "Producto"}
                                                </span>
                                                <span className="text-sm font-medium leading-tight text-foreground">
                                                    {item.product?.name || item.repair?.deviceModel || item.name}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Precios */}
                                        <TableCell className="text-center py-4">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs text-muted-foreground line-through decoration-destructive/30">
                                                        ${original.toLocaleString()}
                                                    </span>
                                                    <ArrowDown className="h-3 w-3 text-muted-foreground/50 rotate-[-90deg]" />
                                                    <span className="text-sm font-bold text-foreground">
                                                        ${price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Ajuste */}
                                        <TableCell className="text-center py-4">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs font-bold px-2.5 py-0.5 border",
                                                        isDiscount
                                                            ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900"
                                                            : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                                                    )}
                                                >
                                                    {isDiscount ? <ArrowDown className="h-3 w-3 mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
                                                    {percent}%
                                                </Badge>
                                                <span className={cn(
                                                    "text-xs font-medium tabular-nums",
                                                    isDiscount ? "text-rose-600" : "text-emerald-600"
                                                )}>
                                                    {isDiscount ? "-" : "+"}${Math.abs(diff).toLocaleString()}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Motivo */}
                                        <TableCell className="text-center py-4">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="mx-auto max-w-[180px] px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 text-xs italic text-muted-foreground truncate cursor-help hover:bg-muted/40 transition-colors group-hover:border-border/60">
                                                            {item.priceChangeReason || "Sin motivo especificado"}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs text-sm">{item.priceChangeReason || "Sin motivo"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
