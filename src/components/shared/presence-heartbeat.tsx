"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos

/**
 * PresenceHeartbeat — invisible, va en el layout global de cada rol.
 * Hace POST a /api/presence/heartbeat cada 3 minutos para mantener
 * lastActiveAt actualizado y que el técnico figure como "En Línea".
 *
 * También envía un heartbeat al montar (carga de página) y hace
 * visibilitychange para re-enviar cuando el usuario vuelve a la pestaña.
 */
export function PresenceHeartbeat() {
    useEffect(() => {
        const ping = () => {
            fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => { });
        };

        // Ping inmediato al cargar
        ping();

        // Ping periódico cada 3 minutos
        const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);

        // Ping al volver a la pestaña (evita falsos negativos por inactividad de pestaña)
        const handleVisibility = () => {
            if (document.visibilityState === "visible") ping();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    return null; // Invisible, no renderiza nada
}
