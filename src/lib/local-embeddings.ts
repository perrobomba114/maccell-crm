/**
 * MACCELL Cerebro — Optimizado
 * 
 * Generación de embeddings locales usando Transformers.js.
 */
import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

/**
 * MACCELL Cerebro — Singleton para gestión de IA local
 */
class MaccellCerebro {
    private static instance: FeatureExtractionPipeline | null = null;
    private static loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

    static async getPipeline(): Promise<FeatureExtractionPipeline> {
        if (this.instance) return this.instance;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                // Configuración de entorno
                env.allowLocalModels = false; // Forzar descarga si no está en cache
                env.remoteHost = 'https://huggingface.co/';

                // Optimización de hilos en Node.js
                if (env.backends?.onnx?.wasm) {
                    const threads = process.env.CPU_THREADS ? parseInt(process.env.CPU_THREADS) : 2;
                    env.backends.onnx.wasm.numThreads = Math.max(1, threads);
                }

                console.log('[EMBEDDINGS] 🔄 Cargando modelo all-MiniLM-L6-v2...');
                const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                console.log('[EMBEDDINGS] ✅ Modelo cargado y listo.');

                this.instance = pipe;
                return pipe;
            } catch (err) {
                this.loadingPromise = null;
                throw err;
            }
        })();

        return this.loadingPromise;
    }
}

/**
 * Genera el embedding optimizado
 * El modelo 'all-MiniLM-L6-v2' tiene un max_seq_length de 256 o 512 tokens.
 * Dejamos que el pipeline trunque internamente para mayor precisión.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!text?.trim()) return null;

    try {
        const pipe = await MaccellCerebro.getPipeline();

        const output = await pipe(text, {
            pooling: 'mean',
            normalize: true,
        });

        // Convertir tensor → array plano (Float32Array)
        return Array.from(output.data as Float32Array);
    } catch (err: any) {
        console.error('[CEREBRO_ERROR]:', err.message);
        return null;
    }
}

/**
 * Similitud por Producto Punto
 * Como los vectores vienen normalizados de 'generateEmbedding' (normalize: true),
 * el producto punto es idéntico a la similitud coseno y MUCHO más rápido.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }

    // Resultado entre -1 y 1 (normalmente 0 a 1 en embeddings de texto)
    return dotProduct;
}

/**
 * Alias para mayor claridad semántica
 */
export const calculateSimilarity = cosineSimilarity;
