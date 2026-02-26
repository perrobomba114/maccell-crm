/**
 * MACCELL Cerebro — Tracker de Tokens Diarios (persistido en DB)
 *
 * Guarda el contador en la tabla `cerebro_daily_tokens` de PostgreSQL.
 */

import { db } from '@/lib/db';

const DAILY_LIMIT = 100_000;

/** Retorna la fecha de hoy en formato ISO "YYYY-MM-DD" (UTC) */
function todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Crea la tabla si no existe (idempotente) */
async function ensureTable(): Promise<void> {
    try {
        await db.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "cerebro_daily_tokens" (
                "date"         TEXT    PRIMARY KEY,
                "tokens_used"  INTEGER NOT NULL DEFAULT 0
            )
        `);
    } catch (e) {
        console.error('[TOKEN_TRACKER] Error creando tabla:', e);
    }
}

/**
 * Registra tokens consumidos en la DB.
 * Fire-and-forget — nunca bloquea la respuesta al usuario.
 */
export async function trackTokens(totalTokens: any): Promise<void> {
    const tokens = Number(totalTokens);
    if (isNaN(tokens) || tokens <= 0) return;

    try {
        await ensureTable();
        const today = todayUTC();

        console.log(`[TOKEN_TRACKER] 🪙 Registrando ${tokens} tokens para ${today}`);

        // Usamos $executeRaw (template literal) para máxima seguridad y evitar errores con "date"
        await db.$executeRaw`
            INSERT INTO "cerebro_daily_tokens" ("date", "tokens_used")
            VALUES (${today}, ${tokens})
            ON CONFLICT ("date") DO UPDATE
              SET "tokens_used" = "cerebro_daily_tokens"."tokens_used" + EXCLUDED."tokens_used"
        `;
    } catch (err: any) {
        console.warn('[TOKEN_TRACKER] ⚠️ Fallo al registrar tokens:', err.message);
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
            `SELECT "tokens_used" FROM "cerebro_daily_tokens" WHERE "date" = $1`,
            today
        );

        const used = rows[0]?.tokens_used ?? 0;
        const remaining = Math.max(0, DAILY_LIMIT - used);
        const percentage = Math.min(100, Math.round((used / DAILY_LIMIT) * 100));

        return { used, limit: DAILY_LIMIT, remaining, percentage, resetAt, source: 'db' };
    } catch (err: any) {
        console.warn('[TOKEN_TRACKER] ⚠️ Error leyendo DB:', err.message);
        return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, percentage: 0, resetAt, source: 'fallback' };
    }
}
