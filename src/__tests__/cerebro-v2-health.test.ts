import assert from "node:assert/strict";
import test from "node:test";

import { checkCerebroHealth } from "@/lib/cerebro-v2/health";

test("reports a partial dependency without leaking its internal error", async () => {
    const health = await checkCerebroHealth({
        rag: async () => ({ ok: true, message: "Base RAG disponible" }),
        coverage: async () => ({ ok: true, message: "Cobertura RAG completa" }),
        worker: async () => {
            throw new Error("secret.internal:8080 refused");
        },
        providers: async () => ({
            openRouter: { configured: true, available: true, message: "OpenRouter operativo" },
            groq: { configured: false, available: false, message: "Groq no configurado" },
            local: { configured: false, available: false, message: "IA local no configurada" },
            localVision: { configured: false, available: false, message: "Visión local no configurada" },
        }),
    });

    assert.equal(health.overall, "healthy");
    assert.deepEqual(health.worker, { ok: false, message: "Worker RAG no disponible" });
    assert.deepEqual(health.reasons, ["Worker RAG no disponible"]);
    assert.equal(JSON.stringify(health).includes("secret.internal"), false);
});

test("reports healthy when every required dependency responds", async () => {
    const health = await checkCerebroHealth({
        rag: async () => ({ ok: true, message: "Base RAG disponible" }),
        coverage: async () => ({ ok: true, message: "Cobertura RAG completa" }),
        worker: async () => ({ ok: true, message: "Worker RAG disponible" }),
        providers: async () => ({
            openRouter: { configured: true, available: true, message: "OpenRouter operativo" },
            groq: { configured: true, available: true, message: "Groq operativo" },
            local: { configured: true, available: true, message: "IA local operativa" },
            localVision: { configured: true, available: true, message: "Visión local operativa" },
        }),
    });

    assert.equal(health.overall, "healthy");
});

test("keeps RAG availability separate from incomplete indexed coverage", async () => {
    const health = await checkCerebroHealth({
        rag: async () => ({ ok: true, message: "Base RAG disponible" }),
        coverage: async () => ({ ok: false, message: "Cobertura incompleta: 80 de 100 PDF listos" }),
        worker: async () => ({ ok: true, message: "Worker RAG disponible" }),
        providers: async () => ({
            openRouter: { configured: true, available: true, message: "OpenRouter operativo" },
            groq: { configured: false, available: false, message: "Groq no configurado" },
            local: { configured: false, available: false, message: "IA local no configurada" },
            localVision: { configured: false, available: false, message: "Visión local no configurada" },
        }),
    });

    assert.equal(health.rag.ok, true);
    assert.equal(health.coverage.ok, false);
    assert.equal(health.overall, "healthy");
    assert.equal(health.textProvider.ok, true);
    assert.deepEqual(health.reasons, ["Cobertura incompleta: 80 de 100 PDF listos"]);
});

test("degrades only when the diagnostic query lacks RAG or a text provider", async () => {
    const health = await checkCerebroHealth({
        rag: async () => ({ ok: false, message: "Base RAG no disponible" }),
        coverage: async () => ({ ok: false, message: "No se pudo comprobar la cobertura RAG" }),
        worker: async () => ({ ok: true, message: "Worker RAG disponible" }),
        providers: async () => ({
            openRouter: { configured: true, available: false, message: "OpenRouter configurado pero su credencial no responde" },
            groq: { configured: false, available: false, message: "Groq no configurado" },
            local: { configured: false, available: false, message: "IA local no configurada" },
            localVision: { configured: false, available: false, message: "Visión local no configurada" },
        }),
    });

    assert.equal(health.overall, "degraded");
    assert.ok(health.reasons.includes("Ningún proveedor de texto está accesible"));
    assert.ok(health.reasons.includes("OpenRouter configurado pero su credencial no responde"));
});
