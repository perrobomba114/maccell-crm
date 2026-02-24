/**
 * MACCELL Cerebro — Embeddings Locales via @xenova/transformers
 *
 * Modelo: Xenova/all-MiniLM-L6-v2
 * - Corre 100% en local/servidor Node.js (sin API key)
 * - 384 dimensiones, rápido y ligero
 * - El modelo se descarga una vez y queda en caché (~23MB)
 *
 * NOTA: Groq NO ofrece un endpoint de embeddings en su API.
 *       Por eso seguimos usando Xenova para los vectores RAG.
 *       El chat sí usa Groq exclusivamente.
 */

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — carga el modelo una sola vez en toda la vida del servidor
// ─────────────────────────────────────────────────────────────────────────────
class EmbeddingPipeline {
    private static instance: FeatureExtractionPipeline | null = null;
    private static loading: Promise<FeatureExtractionPipeline> | null = null;

    static async get(): Promise<FeatureExtractionPipeline> {
        if (this.instance) return this.instance;
        if (this.loading) return this.loading;

        this.loading = (async () => {
            try {
                // Usar caché local si ya fue descargado antes
                env.allowLocalModels = true;
                env.allowRemoteModels = true;

                // En Node.js, optimizar hilos del runtime WASM
                if (env.backends?.onnx?.wasm) {
                    env.backends.onnx.wasm.numThreads = 2;
                }

                console.log('[EMBEDDINGS] 🔄 Cargando modelo all-MiniLM-L6-v2...');
                const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                console.log('[EMBEDDINGS] ✅ Modelo listo.');
                this.instance = pipe;
                return pipe;
            } catch (err) {
                this.loading = null; // Permitir reintento
                throw err;
            }
        })();

        return this.loading;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un embedding de 384 dimensiones para el texto dado.
 * Retorna null si falla — el RAG simplemente no enriquece el prompt.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!text?.trim()) return null;

    try {
        const pipe = await EmbeddingPipeline.get();
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data as Float32Array);
    } catch (err: any) {
        console.error('[EMBEDDINGS] ❌ Error:', err.message);
        return null;
    }
}

/**
 * Similitud coseno entre dos vectores normalizados.
 * Como los vectores vienen normalizados (normalize: true),
 * el producto punto es equivalente a la similitud coseno.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot;
}

/** Alias semántico */
export const calculateSimilarity = cosineSimilarity;
