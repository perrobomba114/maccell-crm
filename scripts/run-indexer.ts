
import { indexPendingRepairs } from "../src/lib/cerebro-indexer";

async function main() {
    console.log("🚀 Iniciando Re-indexación Masiva para Cerebro...");
    await indexPendingRepairs();
    console.log("✅ Proceso terminado.");
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Falló la indexación:", err);
    process.exit(1);
});
