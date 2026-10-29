"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    markNotificationReadAction,
    markAllNotificationsReadAction,
    respondToNotificationAction
} from "@/lib/actions/notifications";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Notification } from "@prisma/client";
import { NotificationBellItem } from "./notification-bell-item";
import { usePolling } from "@/hooks/use-polling";

interface NotificationBellProps {
    userId: string;
}

// Local file from public folder
const NOTIFICATION_SOUND = "/notificacion.mp3";
const HEADER_NOTIFICATION_VOLUME = 0.6;
// Backup base64 just in case offline (Short Click)
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...

export function NotificationBell({ userId }: NotificationBellProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const previousUnreadCountRef = useRef(0);
    const requestVersionRef = useRef(0);
    const pendingReadsRef = useRef(0);
    const fetchInFlightRef = useRef(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const playSound = () => {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.volume = HEADER_NOTIFICATION_VOLUME;
        audio.play().catch(e => console.error("Audio play error", e));
    };

    // Sound effect with interaction fallback
    useEffect(() => {
        const triggerSound = async () => {
            const audio = new Audio(NOTIFICATION_SOUND);
            audio.volume = HEADER_NOTIFICATION_VOLUME;

            try {
                await audio.play();
            } catch {
                // Fallback: Play on next click
                const playOnInteraction = () => {
                    const audioRetry = new Audio(NOTIFICATION_SOUND);
                    audioRetry.volume = HEADER_NOTIFICATION_VOLUME;
                    audioRetry.play().catch(e => console.error(e));
                    document.removeEventListener("click", playOnInteraction);
                    document.removeEventListener("keydown", playOnInteraction);
                };

                document.addEventListener("click", playOnInteraction);
                document.addEventListener("keydown", playOnInteraction);
            }
        };

        // Play sound if there are ANY unread notifications on load (prev=0) OR if unread count increases
        if (unreadCount > 0 && (previousUnreadCountRef.current === 0 || unreadCount > previousUnreadCountRef.current)) {
            triggerSound();
        }
        previousUnreadCountRef.current = unreadCount;
    }, [unreadCount]);

    const fetchNotifications = useCallback(async () => {
        if (!userId || pendingReadsRef.current > 0) return;
        if (fetchInFlightRef.current) {
            return;
        }
        fetchInFlightRef.current = true;
        const version = requestVersionRef.current;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch("/api/notifications", {
                cache: "no-store",
                credentials: "same-origin",
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Notification refresh failed (${response.status})`);
            const data: Notification[] = await response.json();
            if (version !== requestVersionRef.current || pendingReadsRef.current > 0) return;
            if (Array.isArray(data)) {
                setNotifications(data);
                setSyncError(false);
            } else {
                setNotifications([]);
            }
        } catch (error: unknown) {
            setSyncError(true);
            console.error("Failed to fetch notifications", error);
        } finally {
            window.clearTimeout(timeout);
            fetchInFlightRef.current = false;
        }
    }, [userId]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    usePolling(fetchNotifications, 4000, Boolean(userId));

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") void fetchNotifications();
        };
        window.addEventListener("focus", refresh);
        window.addEventListener("online", refresh);
        window.addEventListener("pageshow", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("online", refresh);
            window.removeEventListener("pageshow", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id: string, link?: string | null) => {
        pendingReadsRef.current += 1;
        requestVersionRef.current += 1;
        try {
            const result = await markNotificationReadAction(id);
            if (!result.success) {
                toast.error("No se pudo marcar la notificación como leída. Volvé a intentarlo.");
                return;
            }
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (link) {
                setIsOpen(false);
                router.push(link);
            }
        } catch {
            toast.error("No se pudo guardar la lectura. Revisá tu conexión.");
        } finally {
            pendingReadsRef.current -= 1;
            void fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        pendingReadsRef.current += 1;
        requestVersionRef.current += 1;
        setLoading(true);
        try {
            const result = await markAllNotificationsReadAction(userId);
            if (!result.success) {
                toast.error("No se pudieron limpiar las notificaciones. Volvé a intentarlo.");
                return;
            }
            setNotifications([]);
            toast.success("Notificaciones limpiadas");
        } catch {
            toast.error("No se pudo guardar la limpieza. Revisá tu conexión.");
        } finally {
            pendingReadsRef.current -= 1;
            setLoading(false);
            void fetchNotifications();
        }
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
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) void fetchNotifications();
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-x-hidden p-0 sm:w-[28rem]"
                align="end"
                sideOffset={10}
            >
                <div className="flex max-w-full items-center justify-between gap-3 overflow-x-hidden border-b bg-muted/20 p-4">
                    <div className="flex min-w-0 items-center gap-2">
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
                            className="h-auto shrink-0 py-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllRead}
                            disabled={loading}
                        >
                            Limpiar todo
                        </Button>
                    )}
                </div>
                {syncError && (
                    <p role="status" className="border-b p-3 text-xs text-destructive">
                        No se pudo actualizar la lista. Los avisos pueden estar desactualizados; reintentando.
                    </p>
                )}
                <div className="max-h-[min(70dvh,520px)] max-w-full overflow-y-auto overflow-x-hidden overscroll-contain">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No tienes notificaciones
                        </div>
                    ) : (
                        <div className="max-w-full divide-y overflow-x-hidden">
                            {notifications.map((notification) => (
                                <NotificationBellItem
                                    key={notification.id}
                                    notification={notification}
                                    loading={loading}
                                    onMarkAsRead={handleMarkAsRead}
                                    onResponse={handleResponse}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
