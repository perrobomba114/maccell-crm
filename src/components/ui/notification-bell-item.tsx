"use client";

import type { Notification } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Check, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRepairEntryDisplay } from "@/lib/notification-display";
import { StockDiscrepancyNotificationDetails } from "./stock-discrepancy-notification-details";

type NotificationBellItemProps = {
    notification: Notification;
    loading: boolean;
    onMarkAsRead: (id: string, link?: string | null) => void;
    onResponse: (id: string, response: "ACCEPTED" | "REJECTED") => void;
};

export function NotificationBellItem({ notification, loading, onMarkAsRead, onResponse }: NotificationBellItemProps) {
    const repairEntryDisplay = notification.type === "REPAIR_ENTRY"
        ? getRepairEntryDisplay(notification.actionData)
        : null;

    return (
        <div
            className={cn(
                "p-4 hover:bg-muted/50 transition-colors",
                !notification.isRead && "bg-muted/20"
            )}
        >
            <div className="flex gap-3 items-start">
                <div className="mt-1">
                    {notification.type === "ACTION_REQUEST" ? (
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                    ) : notification.type === "REPAIR_ENTRY" ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                        <Info className="h-4 w-4 text-gray-500" />
                    )}
                </div>
                <div className="flex-1 space-y-1">
                    <div
                        className="cursor-pointer"
                        onClick={() => onMarkAsRead(notification.id, notification.link)}
                    >
                        {repairEntryDisplay ? (
                            <div className={cn("space-y-1", !notification.isRead && "font-bold")}>
                                <p className="text-sm font-medium leading-none">{notification.title}</p>
                                <div className="py-1">
                                    <p className="text-xs text-muted-foreground">
                                        Fecha Prometida: <span className="text-foreground">{repairEntryDisplay.promisedDate}</span>
                                    </p>
                                    <p className="text-xl font-bold text-primary mt-1">{repairEntryDisplay.promisedTime}</p>
                                </div>
                                <NotificationAge createdAt={notification.createdAt} />
                            </div>
                        ) : (
                            <>
                                <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-bold")}>
                                    {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                <StockDiscrepancyNotificationDetails actionData={notification.actionData} />
                                <NotificationAge createdAt={notification.createdAt} />
                            </>
                        )}
                    </div>

                    {notification.type === "ACTION_REQUEST" && notification.status === "PENDING" && (
                        <div className="flex gap-2 mt-3">
                            <Button
                                size="sm"
                                className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                                onClick={() => onResponse(notification.id, "ACCEPTED")}
                                disabled={loading}
                            >
                                <Check className="h-3 w-3 mr-1" /> Aceptar
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => onResponse(notification.id, "REJECTED")}
                                disabled={loading}
                            >
                                <X className="h-3 w-3 mr-1" /> Rechazar
                            </Button>
                        </div>
                    )}

                    {notification.type === "ACTION_REQUEST" && notification.status !== "PENDING" && notification.status && (
                        <div className="mt-2">
                            <Badge variant={notification.status === "ACCEPTED" ? "default" : "destructive"} className="text-[10px] h-5">
                                {notification.status === "ACCEPTED" ? "Aceptado" : "Rechazado"}
                            </Badge>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function NotificationAge({ createdAt }: { createdAt: Date }) {
    return (
        <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}
        </p>
    );
}
