/**
 * MACCELL Cerebro — Tracker de Tokens Diarios (persistido en DB)
 *
 * Guarda el contador en la tabla `cerebro_daily_tokens` de PostgreSQL.
 * Ventajas vs. in-memory:
 *  - Sobrevive reinicios del servidor
 *  - Sobrevive redeploys en Dokploy
 *  - Preciso por día (se resetea automáticamente al cambiar de fecha)
 *
 * NOTA: El 100% exacto de la cuenta de Groq solo lo ves en console.groq.com
 * Este tracker mide los tokens usados DESDE que se instaló (no retroactivo).
 */

import { db } from '@/lib/db';

const DAILY_LIMIT = 100_000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna la fecha de hoy en formato ISO "YYYY-MM-DD" (UTC) */
function todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Crea la tabla si no existe (idempotente) */
async function ensureTable(): Promise<void> {
    await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS cerebro_daily_tokens (
            date         TEXT    PRIMARY KEY,
            tokens_used  INTEGER NOT NULL DEFAULT 0
        )
    `);
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra tokens consumidos en la DB.
 * Fire-and-forget — nunca bloquea la respuesta al usuario.
 */
export async function trackTokens(totalTokens: number): Promise<void> {
    if (!totalTokens || totalTokens <= 0) return;
    try {
        await ensureTable();
        const today = todayUTC();
        await db.$executeRawUnsafe(`
            INSERT INTO cerebro_daily_tokens (date, tokens_used)
            VALUES ($1, $2)
            ON CONFLICT (date) DO UPDATE
              SET tokens_used = cerebro_daily_tokens.tokens_used + EXCLUDED.tokens_used
        `, today, totalTokens);
    } catch (err: any) {
        // No bloquear nunca el flujo del chat por un error de tracking
        console.warn('[TOKEN_TRACKER] ⚠️ No se pudo registrar tokens:', err.message);
    }
}

/**
 * Retorna el uso del día atual desde la DB.
 */
export async function getTokenUsage(): Promise<{
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    resetAt: string;
    source: 'db' | 'fallback';
}> {
    // Calcular tiempo hasta próximo reset (medianoche UTC)
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

    try {
        await ensureTable();
        const today = todayUTC();
        const rows = await db.$queryRawUnsafe<{ tokens_used: number }[]>(
            `SELECT tokens_used FROM cerebro_daily_tokens WHERE date = $1`,
            today
        );

        const used = rows[0]?.tokens_used ?? 0;
        const remaining = Math.max(0, DAILY_LIMIT - used);
        const percentage = Math.min(100, Math.round((used / DAILY_LIMIT) * 100));

        return { used, limit: DAILY_LIMIT, remaining, percentage, resetAt, source: 'db' };
    } catch (err: any) {
        console.warn('[TOKEN_TRACKER] ⚠️ Error leyendo DB, usando fallback:', err.message);
        // Fallback: si la DB falla, mostrar sin datos
        return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, percentage: 0, resetAt, source: 'fallback' };
    }
}
