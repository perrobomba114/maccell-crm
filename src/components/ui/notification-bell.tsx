"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X, Info, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    getNotificationsAction,
    markNotificationReadAction,
    markAllNotificationsReadAction,
    respondToNotificationAction
} from "@/lib/actions/notifications";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationBellProps {
    userId: string;
}

// Local file from public folder
const NOTIFICATION_SOUND = "/notificacion.mp3";
// Backup base64 just in case offline (Short Click)
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...

export function NotificationBell({ userId }: NotificationBellProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const playSound = () => {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.volume = 0.6;
        audio.play().catch(e => console.error("Audio play error", e));
    };

    // Sound effect with interaction fallback
    useEffect(() => {
        const triggerSound = async () => {
            const audio = new Audio(NOTIFICATION_SOUND);
            audio.volume = 0.6;

            try {
                await audio.play();
            } catch (error) {
                console.log("Audio notify blocked. Waiting for interaction.");

                // Fallback: Play on next click
                const playOnInteraction = () => {
                    const audioRetry = new Audio(NOTIFICATION_SOUND);
                    audioRetry.volume = 0.6;
                    audioRetry.play().catch(e => console.error(e));
                    document.removeEventListener("click", playOnInteraction);
                    document.removeEventListener("keydown", playOnInteraction);
                };

                document.addEventListener("click", playOnInteraction);
                document.addEventListener("keydown", playOnInteraction);
            }
        };

        // Play sound if there are ANY unread notifications on load (prev=0) OR if unread count increases
        if (unreadCount > 0 && (previousUnreadCount === 0 || unreadCount > previousUnreadCount)) {
            triggerSound();
        }
        setPreviousUnreadCount(unreadCount);
    }, [unreadCount]);

    const fetchNotifications = async () => {
        if (!userId) return;
        try {
            const data = await getNotificationsAction(userId);
            if (Array.isArray(data)) {
                setNotifications(data);
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 4000); // Poll every 4s for near real-time
        return () => clearInterval(interval);
    }, [userId]);

    const handleMarkAsRead = async (id: string, link?: string | null) => {
        // Optimistically update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

        await markNotificationReadAction(id);

        if (link) {
            setIsOpen(false);
            router.push(link);
        }
    };

    const handleMarkAllRead = async () => {
        // Optimistic clear
        setNotifications([]);

        await markAllNotificationsReadAction(userId);
        toast.success("Notificaciones limpiadas");
    };

    const handleResponse = async (id: string, response: "ACCEPTED" | "REJECTED") => {
        setLoading(true);
        try {
            const result = await respondToNotificationAction(id, response);
            if (result.success) {
                toast.success(response === "ACCEPTED" ? "Solicitud aceptada" : "Solicitud rechazada");
                // Refresh to update status UI
                fetchNotifications();
            } else {
                toast.error(result.error || "Error al responder");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold leading-none">Notificaciones</h4>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={playSound}
                            title="Probar sonido"
                        >
                            <Bell className="h-3 w-3" />
                        </Button>
                    </div>
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1 text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllRead}
                        >
                            Limpiar todo
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No tienes notificaciones
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
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
                                                onClick={() => handleMarkAsRead(notification.id, notification.link)}
                                            >
                                                {notification.type === "REPAIR_ENTRY" && notification.actionData ? (
                                                    // Custom Rendering for Repair Entry
                                                    <div className={cn("space-y-1", !notification.isRead && "font-bold")}>
                                                        <p className="text-sm font-medium leading-none">
                                                            {notification.title}
                                                        </p>
                                                        <div className="py-1">
                                                            <p className="text-xs text-muted-foreground">
                                                                Fecha Prometida: <span className="text-foreground">{notification.actionData.promisedDate}</span>
                                                            </p>
                                                            <p className="text-xl font-bold text-primary mt-1">
                                                                {notification.actionData.promisedTime}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es }) : ''}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    // Default Rendering
                                                    <>
                                                        <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-bold")}>
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                                                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es }) : ''}
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            {/* ACTION BUTTONS */}
                                            {notification.type === "ACTION_REQUEST" && notification.status === "PENDING" && (
                                                <div className="flex gap-2 mt-3">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                                                        onClick={() => handleResponse(notification.id, "ACCEPTED")}
                                                        disabled={loading}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" /> Aceptar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => handleResponse(notification.id, "REJECTED")}
                                                        disabled={loading}
                                                    >
                                                        <X className="h-3 w-3 mr-1" /> Rechazar
                                                    </Button>
                                                </div>
                                            )}

                                            {/* STATUS BADGE IF PROCESSED */}
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
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
