import assert from "node:assert/strict";
import test from "node:test";

import { retrieveTechnicalEvidence } from "../lib/cerebro-v2/resilient-retrieval";
import { repairEvidenceMatchesSymptom, summarizeRepairEvidence } from "../lib/cerebro-v2/repair-evidence";
import { retrieveRepairFallbackSources } from "../lib/cerebro-v2/repair-evidence-retrieval";
import type { RetrievalRow } from "../lib/cerebro-v2/retrieval";

test("summarizes labeled repair evidence without dropping a long intake", () => {
    const summary = summarizeRepairEvidence(
        `PROBLEMA: ${"detalle de ingreso ".repeat(100)}no enciende\nCAUSA: U5002 en corto\nINTERVENCION: reemplazo de U5002\nVERIFICACION: arranque y carga estables`,
        "Reparación MAC2-00001619",
    );
    assert.equal(summary.ticketNumber, "MAC2-00001619");
    assert.match(summary.symptom, /no enciende$/);
    assert.equal(summary.rootCause, "U5002 en corto");
    assert.equal(summary.intervention, "reemplazo de U5002");
    assert.equal(summary.verification, "arranque y carga estables");
    assert.equal(summary.outcome, "verified");
    assert.equal(summary.caveat, "");
});

test("classifies an administrative closure as unrepaired despite its title", () => {
    const summary = summarizeRepairEvidence(
        "PROBLEMA: no enciende\nDIAGNOSTICO: pendiente\nSOLUCION: cliente no autoriza; equipo entregado sin reparar",
        "Reparación confirmada MAC3-00000190",
    );
    assert.equal(summary.outcome, "unrepaired");
    assert.match(summary.caveat, /sin reparación técnica/i);
});

test("rejects the exact administrative no-parts case even when solution says repair taken", () => {
    const content = "PROBLEMA: Cambio de modulo/ ingresa apagado\nDIAGNOSTICO: No se dispone de repuestos necesarios para efectuar la reparación requerida.\nSOLUCION: Reparación tomada por técnico.";
    const summary = summarizeRepairEvidence(content, "Reparación MAC1-00000241");
    assert.equal(summary.outcome, "unrepaired");
    assert.equal(summary.intervention, "");
});

test("prefers confirmed worker labels and the last technical cycle", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: REPAIRED\nPROBLEMA: no carga\nSINTOMA_CONFIRMADO: VBUS ausente\nDIAGNOSTICO_CONFIRMADO: filtro abierto\nCAUSA_CONFIRMADA: FL1000 abierto\nINTERVENCION_CONFIRMADA: reemplazo de FL1000\nVERIFICACION_FINAL: carga estable",
        "Reparación MAC2-00001619",
    );
    assert.equal(summary.symptom, "VBUS ausente");
    assert.equal(summary.rootCause, "FL1000 abierto");
    assert.equal(summary.intervention, "reemplazo de FL1000");
    assert.equal(summary.verification, "carga estable");
    assert.equal(summary.outcome, "verified");
});

test("empty worker labels do not consume the following label", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: UNKNOWN\nDISPOSITIVO: MOTOROLA MOTO E7\nPROBLEMA: no enciende\nDIAGNOSTICO: Cambio de bateria ok, huella cortada\nSOLUCION: \nEVIDENCIA: \nSINTOMA_CONFIRMADO: \nCAUSA_CONFIRMADA: \nMEDICION_CONFIRMATORIA: \nINTERVENCION_CONFIRMADA: \nVERIFICACION_FINAL: \nREFERENCIAS_AFECTADAS: ",
        "Reparación MAC1-00000140",
    );
    assert.equal(summary.symptom, "no enciende");
    assert.equal(summary.rootCause, "Cambio de bateria ok, huella cortada");
    assert.equal(summary.intervention, "Cambio de bateria ok, huella cortada");
    assert.equal(summary.verification, "");
    assert.equal(summary.outcome, "reported");
});

test("keeps a technical diagnosis visible when the solution only records missing parts", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: UNREPAIRED\nPROBLEMA: no enciende\nDIAGNOSTICO: consumo fijo; PMIC en corto\nSOLUCION: No se dispone de repuestos necesarios para efectuar la reparación requerida",
        "Reparación MAC3-00000190",
    );
    assert.equal(summary.rootCause, "consumo fijo; PMIC en corto");
    assert.equal(summary.intervention, "");
    assert.equal(summary.outcome, "unrepaired");
});

test("keeps an entered-off repaired charging case as contextual evidence with a caveat", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: REPAIRED\nPROBLEMA: ingresó apagado y mojado\nDIAGNOSTICO: humedad en placa\nSOLUCION: cambio de módulo y pin de carga",
        "Reparación MAC2-00001619",
    );
    assert.equal(repairEvidenceMatchesSymptom(summary, "no enciende"), true);
    assert.match(summary.caveat, /apagado no confirma ausencia de arranque/i);
});

test("does not promote an entered-off display repair as a no-power precedent", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: REPAIRED\nPROBLEMA: ingresó apagado con pantalla rota\nDIAGNOSTICO: módulo sin imagen\nSOLUCION: cambio de módulo",
        "Reparación MAC2-00001111",
    );
    assert.equal(repairEvidenceMatchesSymptom(summary, "no enciende"), false);
});

test("redacts customer identifiers and prices from summarized technical fields", () => {
    const summary = summarizeRepairEvidence(
        "PROBLEMA: no enciende; cliente: Juan Perez; 2664123456; juan@example.com\nDIAGNOSTICO: reemplazo cotizado $ 25.000",
        "Reparación MAC1-00000140",
    );
    const serialized = JSON.stringify(summary);
    assert.doesNotMatch(serialized, /Juan Perez|2664123456|juan@example\.com|25\.000/);
});

test("does not treat negated or inconclusive verification as verified", () => {
    for (const verification of ["No probado", "No se verificó el arranque", "Prueba final inconclusa"]) {
        const summary = summarizeRepairEvidence(
            `RESULTADO_ULTIMO_CICLO: REPAIRED\nPROBLEMA: no enciende\nINTERVENCION_CONFIRMADA: cambio de batería\nVERIFICACION_FINAL: ${verification}`,
            "MAC1-00000140",
        );
        assert.equal(summary.outcome, "reported");
    }
});

test("verified final behavior still warns when the root cause was not established", () => {
    const summary = summarizeRepairEvidence(
        "RESULTADO_ULTIMO_CICLO: REPAIRED\nSINTOMA_CONFIRMADO: no enciende\nCAUSA_CONFIRMADA: No determinada\nINTERVENCION_CONFIRMADA: cambio de batería\nVERIFICACION_FINAL: arranque probado",
        "MAC1-00000140",
    );
    assert.equal(summary.outcome, "verified");
    assert.match(summary.caveat, /causa no fue establecida/i);
});

test("embedding failure uses bounded exact-identity repair fallback", async () => {
    const fallbackSource = {
        chunkId: "fallback", documentId: "repair-doc", sourceType: "REPAIR" as const,
        authority: "CONFIRMED_SUCCESS" as const, brand: "MOTOROLA", model: "MOTO E7",
        title: "Reparación MAC1-00000140", pageNumber: null,
        content: "PROBLEMA: no enciende\nSOLUCION: cambio de batería\nVERIFICACION: arranque probado", score: 1,
    };
    const result = await retrieveTechnicalEvidence(
        { brand: "MOTOROLA", model: "MOTO E7", text: "no enciende", limit: 4 },
        { embed: async () => { throw new Error("offline"); }, rag: async () => [], library: async () => [],
            repairFallback: async () => [fallbackSource] },
    );
    assert.deepEqual(result.sources, [fallbackSource]);
    assert.deepEqual(result.unavailable, ["búsqueda semántica"]);
});

test("successful semantic search without repairs supplements from the bounded repair search", async () => {
    const pdf = {
        chunkId: "pdf", documentId: "pdf-doc", sourceType: "PDF" as const,
        authority: "TECHNICAL_DOCUMENT" as const, brand: "MOTOROLA", model: "MOTO E7",
        title: "Manual", pageNumber: 1, content: "POWER", score: 2,
    };
    const repair = { ...pdf, chunkId: "repair", documentId: "repair-doc", sourceType: "REPAIR" as const,
        authority: "INCOMPLETE" as const, title: "MAC1-00000140", pageNumber: null, score: 1 };
    const result = await retrieveTechnicalEvidence(
        { brand: "MOTOROLA", model: "MOTO E7", text: "no enciende", limit: 4 },
        { embed: async () => [], rag: async () => [pdf], library: async () => [], repairFallback: async () => [repair] },
    );
    assert.deepEqual(result.sources.map(source => source.documentId), ["pdf-doc", "repair-doc"]);
});

test("fallback query is read-only, exact-model and bounded", async () => {
    const row: RetrievalRow = {
        chunkId: "fallback", documentId: "doc", sourceType: "REPAIR", authority: "CONFIRMED_SUCCESS",
        brand: "MOTOROLA", model: "MOTO E7", modelFamily: null, title: "MAC1-00000140",
        pageNumber: null, content: "PROBLEMA: no enciende\nSOLUCION: cambio de batería",
        semanticScore: 0, keywordScore: 0.8, componentMatch: false, section: null, subsystems: [], identityMatch: true,
    };
    const sources = await retrieveRepairFallbackSources(
        { brand: "MOTOROLA", model: "MOTO E7", modelAliases: ["E7"], text: "no enciende", limit: 10 },
        async (sql, params) => {
            assert.match(sql, /^SELECT/);
            assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|INSERT)\b/i);
            assert.match(sql, /normalized_model = ANY\(\$2::text\[\]\)/);
            assert.match(sql, /to_tsquery\('simple', \$3\)/);
            assert.doesNotMatch(sql, /websearch_to_tsquery/);
            assert.match(sql, /LIMIT 20/);
            assert.deepEqual(params[1], ["MOTO E7", "E7"]);
            assert.equal(params[2], "enciende | prende | arranca | muerto | muerta | apagado | apagada | bateria | hinchada");
            assert.equal(params[3], true);
            return [
                row,
                {...row, chunkId:"display", content:"PROBLEMA: ingresó apagado con display roto\nSOLUCION: cambio de módulo"},
                {...row, chunkId:"wrong", model:"MOTO E7 PLUS"},
            ];
        },
    );
    assert.deepEqual(sources.map(source => source.model), ["MOTO E7"]);
});

test("reports historical repair search degradation when the supplemental fallback fails", async () => {
    const result = await retrieveTechnicalEvidence(
        { brand: "MOTOROLA", model: "MOTO E7", text: "no enciende" },
        { embed: async () => [], rag: async () => [], library: async () => [],
            repairFallback: async () => { throw new Error("database unavailable"); } },
    );
    assert.deepEqual(result.unavailable, ["búsqueda de reparaciones históricas"]);
});
