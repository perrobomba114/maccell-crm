
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Phone, ShoppingBag, Wrench } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ReadyForPickupTableProps {
    data: {
        id: string;
        ticket: string;
        device: string;
        customer: string;
        phone: string;
        amount: number;
    }[];
}

export function ReadyForPickupTable({ data }: ReadyForPickupTableProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Card className="col-span-4 lg:col-span-2 border border-zinc-800/50 shadow-sm bg-[#18181b] overflow-hidden flex flex-col h-full rounded-2xl">
            <CardHeader className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="h-32 w-32 -mr-10 -mt-10" />
                </div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                            <CheckCircle2 className="h-7 w-7 text-white/90" />
                            Listos para Retirar
                        </CardTitle>
                        <CardDescription className="text-amber-100/90 mt-2 font-medium">
                            {data.length} equipos finalizados y esperando entrega
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 md:static">
                        <TableRow className="border-b border-border/50">
                            <TableHead className="pl-6 w-[40%] text-xs uppercase tracking-wider font-semibold text-muted-foreground">Cliente</TableHead>
                            <TableHead className="w-[35%] text-xs uppercase tracking-wider font-semibold text-muted-foreground">Equipo</TableHead>
                            <TableHead className="text-right pr-6 w-[25%] text-xs uppercase tracking-wider font-semibold text-muted-foreground">A Cobrar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/30 transition-all duration-200 border-b border-border/40 last:border-0 group cursor-default">
                                <TableCell className="pl-6 py-5 align-top">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-amber-100 dark:ring-amber-900/50 mt-1">
                                            <AvatarFallback className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold text-xs">
                                                {getInitials(item.customer)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-sm text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                                {item.customer}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                <span>{item.phone || "Sin teléfono"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 align-top">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-foreground leading-snug">
                                            {item.device}
                                        </span>
                                        <Badge variant="outline" className="w-fit text-[10px] px-2 h-5 bg-background text-muted-foreground border-border font-mono tracking-wide">
                                            #{item.ticket}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6 py-5 align-middle">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
                                    <div className="bg-muted/50 p-4 rounded-full">
                                        <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <p className="font-medium text-sm">¡Excelente! Todo entregado.</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

interface RecentActivityProps {
    data: {
        id: string;
        action: string;
        details: string;
        date: string;
        time: string;
    }[];
}

export function RecentActivityTable({ data }: RecentActivityProps) {
    return (
        <Card className="col-span-4 lg:col-span-2 border border-zinc-800/50 shadow-sm bg-[#18181b] h-full rounded-2xl">
            <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Ultimos movimientos de la sucursal</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${item.action.includes('Venta') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {item.action.includes('Venta') ? <ShoppingBag className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{item.action}</p>
                                    <p className="text-xs text-muted-foreground">{item.details}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-foreground">{item.time}</span>
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">Sin actividad reciente</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
