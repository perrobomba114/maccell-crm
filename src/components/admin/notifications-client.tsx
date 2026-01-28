"use strict";
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Bell, AlertCircle, Info, Filter } from "lucide-react";
import { respondToNotificationAction } from "@/lib/actions/notifications";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationClientProps {
    initialNotifications: any[];
}

export function AdminNotificationsClient({ initialNotifications }: NotificationClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get("status") || "ALL";

    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === "ALL") params.delete("status");
        else params.set("status", value);
        router.push(`?${params.toString()}`);
    };

    const handleResponse = async (id: string, response: "ACCEPTED" | "REJECTED") => {
        setLoadingId(id);
        try {
            const result = await respondToNotificationAction(id, response);
            if (result.success) {
                toast.success(response === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada");
                router.refresh(); // Refresh data
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
            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Tabs value={currentStatus} onValueChange={handleFilterChange} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="ALL">Todos</TabsTrigger>
                        <TabsTrigger value="PENDING">Pendientes</TabsTrigger>
                        <TabsTrigger value="ACCEPTED">Aceptados</TabsTrigger>
                        <TabsTrigger value="REJECTED">Rechazados</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {initialNotifications.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Bell className="h-12 w-12 mb-4 opacity-20" />
                            <p>No se encontraron notificaciones con este filtro.</p>
                        </CardContent>
                    </Card>
                ) : (
                    initialNotifications.map((notification) => (
                        <Card key={notification.id} className={cn("transition-all", notification.status === 'PENDING' ? "border-l-4 border-l-blue-500 shadow-md" : "opacity-80")}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {notification.type === 'ACTION_REQUEST' && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Solicitud</Badge>}
                                            {notification.type === 'WARNING' && <Badge variant="destructive">Alerta</Badge>}
                                            {notification.type === 'INFO' && <Badge variant="secondary">Info</Badge>}

                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(notification.createdAt), "PPP p", { locale: es })}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg font-bold">{notification.title}</CardTitle>
                                    </div>
                                    {notification.status && (
                                        <Badge variant={notification.status === 'PENDING' ? 'outline' : notification.status === 'ACCEPTED' ? 'default' : 'destructive'}>
                                            {notification.status === 'PENDING' ? 'Pendiente' : notification.status === 'ACCEPTED' ? 'Aceptado' : 'Rechazado'}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground/80">{notification.message}</p>

                                    {/* Action Data Details (Specific for Stock Discrepancy) */}
                                    {notification.actionData && notification.actionData.type === 'STOCK_DISCREPANCY' && (
                                        <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1 border">
                                            <p><span className="font-semibold">Producto:</span> {notification.actionData.productName} ({notification.actionData.sku})</p>
                                            <p><span className="font-semibold">Sucursal:</span> {notification.actionData.branchName}</p>
                                            <div className="flex gap-4 mt-2">
                                                <div className="bg-background border rounded px-2 py-1">
                                                    <span className="text-xs text-muted-foreground block">Actual</span>
                                                    <span className="font-mono font-bold">{notification.actionData.currentQuantity}</span>
                                                </div>
                                                <div className="bg-background border rounded px-2 py-1">
                                                    <span className="text-xs text-muted-foreground block">Propuesto</span>
                                                    <span className={cn("font-mono font-bold", notification.actionData.adjustment > 0 ? "text-green-600" : "text-red-600")}>
                                                        {notification.actionData.proposedQuantity} ({notification.actionData.adjustment > 0 ? "+" : ""}{notification.actionData.adjustment})
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
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {loadingId === notification.id ? "Procesando..." : <><Check className="mr-2 h-4 w-4" /> Aceptar</>}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleResponse(notification.id, "REJECTED")}
                                                disabled={loadingId === notification.id}
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
        </div>
    );
}
