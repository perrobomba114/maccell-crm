"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    getNotificationsAction,
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
// Backup base64 just in case offline (Short Click)
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...
// const NOTIFICATION_SOUND_BACKUP = "data:audio/wav;base64,UklGRiGCCABXQVZFbW...

export function NotificationBell({ userId }: NotificationBellProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
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
            } catch {
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

    const fetchNotifications = useCallback(async () => {
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
    }, [userId]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    usePolling(fetchNotifications, 4000, Boolean(userId));

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
