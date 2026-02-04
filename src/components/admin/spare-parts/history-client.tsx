"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import { toggleHistoryChecked } from "@/actions/spare-parts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoryItem {
    id: string;
    sparePart: { name: string; sku: string };
    user: { name: string; email: string };
    branch: { name: string; code: string };
    quantity: number;
    reason: string | null;
    isChecked: boolean;
    createdAt: Date;
}

interface HistoryClientProps {
    data: HistoryItem[];
    totalPages: number;
    currentPage: number;
    total: number;
}

export function HistoryClient({ data, totalPages, currentPage, total }: HistoryClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Date from URL or default to today (although Page handles default fetch, UI needs to reflect it)
    const urlDate = searchParams.get("date");
    const [date, setDate] = useState<Date | undefined>(
        urlDate ? new Date(urlDate) : new Date()
    );

    const handleDateSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        const params = new URLSearchParams(searchParams.toString());
        if (newDate) {
            params.set("date", format(newDate, "yyyy-MM-dd"));
        } else {
            params.delete("date");
        }
        params.set("page", "1"); // Reset to page 1
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    const handleToggleCheck = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update? Or just wait.
            const res = await toggleHistoryChecked(id);
            if (res.success) {
                toast.success(currentStatus ? "Marcado como pendiente" : "Controlado correctamente");
                router.refresh(); // This should reload the data
            } else {
                toast.error(res.error);
            }
        } catch (e) {
            toast.error("Error al actualizar");
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Movimientos de Stock (Bajas)</CardTitle>
                <div className="flex items-center space-x-2">
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
                                {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha / Hora</TableHead>
                                <TableHead>Repuesto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-center">Controlado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No hay movimientos registrados para esta fecha.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.id} className={item.isChecked ? "bg-muted/30" : ""}>
                                        <TableCell className="font-medium">
                                            {format(new Date(item.createdAt), "HH:mm")}
                                            <span className="text-xs text-muted-foreground block">
                                                {format(new Date(item.createdAt), "dd/MM/yyyy")}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.sparePart.name}</TableCell>
                                        <TableCell>{item.sparePart.sku}</TableCell>
                                        <TableCell className={cn("font-bold text-center", item.quantity < 0 ? "text-red-500" : "text-green-500")}>
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
                                        <TableCell className="max-w-[150px] truncate" title={item.reason || ""}>
                                            {item.reason || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant={item.isChecked ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handleToggleCheck(item.id, item.isChecked)}
                                                className={cn("h-8 w-8 p-0", item.isChecked ? "bg-green-600 hover:bg-green-700" : "")}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-4">
                        <Pagination>
                            <PaginationContent>
                                {currentPage > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                        />
                                    </PaginationItem>
                                )}

                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const page = i + 1;
                                    // Simple logic to show limited pages if too many
                                    if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 2) {
                                        if (page === 2 || page === totalPages - 1) return <PaginationItem key={page}>...</PaginationItem>;
                                        return null;
                                    }
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                isActive={currentPage === page}
                                                onClick={(e) => { e.preventDefault(); handlePageChange(page); }}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {currentPage < totalPages && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                        />
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
