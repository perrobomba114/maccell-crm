"use strict";
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Bell, AlertCircle, Info, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { respondToNotificationAction } from "@/lib/actions/notifications";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationClientProps {
    initialNotifications: any[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
}

export function AdminNotificationsClient({ initialNotifications, totalPages, currentPage, totalItems }: NotificationClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get("status") || "ALL";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === "ALL") params.delete("status");
        else params.set("status", value);
        params.set("page", "1"); // Reset pagination
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    const handleResponse = async (id: string, response: "ACCEPTED" | "REJECTED") => {
        setLoadingId(id);
        try {
            const result = await respondToNotificationAction(id, response);
            if (result.success) {
                toast.success(response === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada");
                router.refresh();
            } else {
                toast.error(result.error || "Error al responder");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-sm">
                <Tabs value={currentStatus} onValueChange={handleFilterChange} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-4 sm:w-[400px]">
                        <TabsTrigger value="ALL">Todos</TabsTrigger>
                        <TabsTrigger value="PENDING">Pendientes</TabsTrigger>
                        <TabsTrigger value="ACCEPTED">Aceptados</TabsTrigger>
                        <TabsTrigger value="REJECTED">Rechazados</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="text-sm text-muted-foreground font-medium px-2">
                    {totalItems} notificaciones encontradas
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {initialNotifications.length === 0 ? (
                    <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md border-0 shadow-lg">
                        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Bell className="h-16 w-16 mb-4 opacity-10" />
                            <p className="text-lg font-light">No se encontraron notificaciones.</p>
                        </CardContent>
                    </Card>
                ) : (
                    initialNotifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={cn(
                                "group border overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:border-blue-500/30",
                                notification.status === 'PENDING'
                                    ? "bg-white/80 dark:bg-zinc-900/80 border-l-4 border-l-blue-500 shadow-md"
                                    : "bg-white/40 dark:bg-zinc-900/40 opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0"
                            )}>
                            {/* Decorative gradient blob */}
                            {notification.status === 'PENDING' && (
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
                            )}

                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1.5 z-10">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {notification.type === 'ACTION_REQUEST' && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">Solicitud</Badge>}
                                            {notification.type === 'WARNING' && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300">Alerta</Badge>}
                                            {notification.type === 'INFO' && <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Info</Badge>}

                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-zinc-400" />
                                                {format(new Date(notification.createdAt), "PPP p", { locale: es })}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg font-bold text-foreground tracking-tight">{notification.title}</CardTitle>
                                    </div>
                                    <div className="z-10">
                                        {notification.status && (
                                            <Badge className={cn(
                                                "px-3 py-1 shadow-sm uppercase tracking-wider text-[10px] font-bold",
                                                notification.status === 'PENDING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    notification.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                                            )}>
                                                {notification.status === 'PENDING' ? 'Pendiente' : notification.status === 'ACCEPTED' ? 'Aceptado' : 'Rechazado'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="z-10 relative">
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">{notification.message}</p>

                                    {/* Action Data Details (Specific for Stock Discrepancy) */}
                                    {notification.actionData && notification.actionData.type === 'STOCK_DISCREPANCY' && (
                                        <div className="bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-sm p-4 rounded-xl text-sm space-y-3 border border-zinc-100 dark:border-zinc-700/50 shadow-inner">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-foreground">{notification.actionData.productName}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">SKU: {notification.actionData.sku}</p>
                                                </div>
                                                <Badge variant="outline" className="bg-background">{notification.actionData.branchName}</Badge>
                                            </div>

                                            <div className="flex gap-4 items-center">
                                                <div className="bg-background border rounded-lg px-3 py-2 flex-1 text-center shadow-sm">
                                                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider block mb-1">Actual</span>
                                                    <span className="font-mono text-lg font-bold">{notification.actionData.currentQuantity}</span>
                                                </div>
                                                <div className="text-muted-foreground">→</div>
                                                <div className="bg-background border rounded-lg px-3 py-2 flex-1 text-center shadow-sm border-b-2 border-b-blue-500/20">
                                                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider block mb-1">Propuesto</span>
                                                    <span className={cn("font-mono text-lg font-bold", notification.actionData.adjustment > 0 ? "text-green-600" : "text-red-600")}>
                                                        {notification.actionData.proposedQuantity}
                                                        <span className="text-xs ml-1 opacity-70">
                                                            ({notification.actionData.adjustment > 0 ? "+" : ""}{notification.actionData.adjustment})
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {notification.status === 'PENDING' && notification.type === 'ACTION_REQUEST' && (
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                onClick={() => handleResponse(notification.id, "ACCEPTED")}
                                                disabled={loadingId === notification.id}
                                                className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 active:scale-95 transition-all text-xsfont-bold flex-1"
                                            >
                                                {loadingId === notification.id ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                                                ) : (
                                                    <><Check className="mr-2 h-4 w-4" /> Aceptar Discrepancia</>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleResponse(notification.id, "REJECTED")}
                                                disabled={loadingId === notification.id}
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm flex-1"
                                            >
                                                <X className="mr-2 h-4 w-4" /> Rechazar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 py-6">
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="h-9 w-9 bg-background/50 backdrop-blur-sm"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground bg-background/50 px-3 py-1.5 rounded-md border">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="h-9 w-9 bg-background/50 backdrop-blur-sm"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
