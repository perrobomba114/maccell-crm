"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner"; // Assuming sonner is used as per context
import { checkUpcomingDeadlines, extendRepairTime } from "@/actions/repairs/deadline-actions";
import { AlertTriangle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface TechnicianDeadlineMonitorProps {
    userId: string | undefined;
}

export function TechnicianDeadlineMonitor({ userId }: TechnicianDeadlineMonitorProps) {
    const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
    const [activeAlerts, setActiveAlerts] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio("/notificacion 2.mp3");
    }, []);

    // Sound Loop for Active Alerts
    useEffect(() => {
        if (activeAlerts.size === 0) return;

        const playSound = () => {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.error("Audio loop failed:", e));
            }
        };

        // Start loop (plays every 60s)
        const intervalId = setInterval(playSound, 60000);

        return () => clearInterval(intervalId);
    }, [activeAlerts.size]);

    useEffect(() => {
        if (!userId) return;

        const checkDeadlines = async () => {
            const repairs = await checkUpcomingDeadlines(userId);

            repairs.forEach(repair => {
                const isNew = !notifiedIds.has(repair.id);
                // If we already alerted but it's still active (user hasn't dismissed loop), we don't re-toast but loop continues.
                // If user dismissed loop (removeAlert), activeAlerts won't have it.
                // notifiedIds prevents RE-TOASTING.

                if (isNew) {
                    // Trigger Alert
                    triggerAlert(repair);

                    // Add to tracking sets
                    setNotifiedIds(prev => new Set(prev).add(repair.id));
                    setActiveAlerts(prev => new Set(prev).add(repair.id));
                }
            });
        };

        // Initial check
        checkDeadlines();

        // Poll every 30 seconds
        const intervalId = setInterval(checkDeadlines, 30000);

        return () => clearInterval(intervalId);
    }, [userId, notifiedIds]);

    const removeAlert = (id: string) => {
        setActiveAlerts(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };

    const triggerAlert = (repair: any) => {
        // Play Sound Immediately
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }

        // Show Toast
        toast.custom((t) => (
            <div className="bg-red-950/90 border border-red-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md w-full max-w-sm flex flex-col gap-3 animate-in slide-in-from-top-5 duration-300">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500/20 rounded-full shrink-0 animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-base">¡Atención! Vencimiento Próximo</h4>
                        <p className="text-red-200 text-sm mt-1">
                            La reparación <span className="font-bold text-white">#{repair.ticketNumber}</span> ({repair.deviceBrand} {repair.deviceModel}) vence en menos de 15 minutos.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => {
                            toast.dismiss(t);
                            removeAlert(repair.id);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-900/50 rounded-lg transition-colors"
                    >
                        Ignorar
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
                            removeAlert(repair.id);
                            await handleExtend(repair.id);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Clock className="w-4 h-4" />
                        +15 Minutos
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity, // Require manual interaction
            position: "top-center",
            id: `deadline-${repair.id}` // Unique ID to prevent duplicates if library doesn't handle custom component unicity
        });
    };

    const handleExtend = async (repairId: string) => {
        if (!userId) return;

        toast.promise(
            (async () => {
                const result = await extendRepairTime(repairId, userId, 15);
                if (result.success) {
                    router.refresh(); // Refresh UI to show new time
                } else {
                    throw new Error(result.error || "Error desconocido");
                }
                return result;
            })(),
            {
                loading: "Extendiendo tiempo...",
                success: "Tiempo extendido correctamente. Vendedor notificado.",
                error: (err) => `Error: ${err.message}`
            }
        );
    };

    return null; // Logic only component
}
