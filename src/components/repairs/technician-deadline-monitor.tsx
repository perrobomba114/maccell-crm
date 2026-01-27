"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner"; // Assuming sonner is used as per context
import { checkUpcomingDeadlines, extendRepairTime } from "@/actions/repairs/deadline-actions";
import { AlertTriangle, Clock } from "lucide-react";

interface TechnicianDeadlineMonitorProps {
    userId: string | undefined;
}

export function TechnicianDeadlineMonitor({ userId }: TechnicianDeadlineMonitorProps) {
    const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio("/notificacion 2.mp3");
    }, []);

    useEffect(() => {
        if (!userId) return;

        const checkDeadlines = async () => {
            const repairs = await checkUpcomingDeadlines(userId);

            repairs.forEach(repair => {
                if (!notifiedIds.has(repair.id)) {
                    // Trigger Alert
                    triggerAlert(repair);

                    // Add to notified set to prevent spam
                    setNotifiedIds(prev => new Set(prev).add(repair.id));
                }
            });
        };

        // Initial check
        checkDeadlines();

        // Poll every 30 seconds
        const intervalId = setInterval(checkDeadlines, 30000);

        return () => clearInterval(intervalId);
    }, [userId, notifiedIds]);

    const triggerAlert = (repair: any) => {
        // Play Sound
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }

        // Show Toast
        toast.custom((t) => (
            <div className="bg-red-950/90 border border-red-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md w-full max-w-sm flex flex-col gap-3">
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
                        onClick={() => toast.dismiss(t)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-900/50 rounded-lg transition-colors"
                    >
                        Ignorar
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
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
            position: "top-center" // Prominent position
        });
    };

    const handleExtend = async (repairId: string) => {
        if (!userId) return;

        toast.promise(extendRepairTime(repairId, userId, 15), {
            loading: "Extendiendo tiempo...",
            success: "Tiempo extendido correctamente. Vendedor notificado.",
            error: "Error al extender tiempo."
        });
    };

    return null; // Logic only component
}
