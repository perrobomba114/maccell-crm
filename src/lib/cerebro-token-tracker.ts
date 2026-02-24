/**
 * MACCELL Cerebro — Tracker de Tokens Diarios
 *
 * Singleton en memoria que cuenta los tokens consumidos en Groq hoy.
 * Se resetea automáticamente cuando cambia el día.
 * Compatible con servidor Node.js persistente (Dokploy/Docker).
 */

const DAILY_LIMIT = 100_000; // Límite gratuito de Groq

interface DailyUsage {
    date: string;   // "Tue Feb 24 2026"
    used: number;
}

// Singleton global — persiste mientras el servidor esté corriendo
const state: DailyUsage = {
    date: new Date().toDateString(),
    used: 0,
};

/** Registra tokens consumidos en una request */
export function trackTokens(totalTokens: number): void {
    const today = new Date().toDateString();
    if (today !== state.date) {
        // Nuevo día → reset
        state.date = today;
        state.used = 0;
    }
    state.used = Math.max(0, state.used + totalTokens);
}

/** Retorna el estado actual del uso diario */
export function getTokenUsage(): {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    resetAt: string;
} {
    const today = new Date().toDateString();
    if (today !== state.date) {
        state.date = today;
        state.used = 0;
    }

    const used = state.used;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    const percentage = Math.round((used / DAILY_LIMIT) * 100);

    // Próximo reset: medianoche UTC
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
    ));
    const msLeft = tomorrow.getTime() - now.getTime();
    const hLeft = Math.floor(msLeft / 3_600_000);
    const mLeft = Math.floor((msLeft % 3_600_000) / 60_000);
    const resetAt = `${hLeft}h ${mLeft}m`;

    return { used, limit: DAILY_LIMIT, remaining, percentage, resetAt };
}
