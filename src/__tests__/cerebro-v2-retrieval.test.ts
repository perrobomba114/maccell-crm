import assert from "node:assert/strict";
import test from "node:test";

import { retrieveCerebroSources, type RetrievalAdapter, type RetrievalRow } from "../lib/cerebro-v2/retrieval";

const baseRow: RetrievalRow = {
    chunkId: "samsung-confirmed",
    documentId: "doc-1",
    sourceType: "REPAIR",
    authority: "CONFIRMED_SUCCESS",
    brand: "SAMSUNG",
    model: "SM-A405FN",
    modelFamily: "GALAXY A40",
    title: "Reparación confirmada",
    pageNumber: null,
    content: "PROBLEMA: no enciende\nSOLUCION: reemplazo confirmado",
    semanticScore: 0.8,
    keywordScore: 0.5,
    componentMatch: false,
    section: "POWER",
    subsystems: ["POWER"],
    identityMatch: false,
};

function adapterFor(rows: RetrievalRow[]): RetrievalAdapter {
    return {
        async search(sql, params) {
            assert.match(sql, /normalized_brand = \$1/);
            assert.match(sql, /semantic_pdf_ids/);
            assert.match(sql, /keyword_pdf_ids/);
            assert.equal(params[0], "SAMSUNG");
            return rows;
        },
    };
}

test("hard-filters candidates from other brands", async () => {
    const apple = { ...baseRow, chunkId: "apple", brand: "APPLE", model: "IPHONE 11" };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "no enciende", embedding: [0.1] },
        adapterFor([apple, baseRow]),
    );
    assert.deepEqual(results.map((source) => source.chunkId), ["samsung-confirmed"]);
});

test("ranks exact model before family evidence", async () => {
    const family = { ...baseRow, chunkId: "family", model: "SM-A505FN" };
    const exact = { ...baseRow, chunkId: "exact", semanticScore: 0.7 };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", modelFamily: "GALAXY A40", text: "carga", embedding: [0.1] },
        adapterFor([family, exact]),
    );
    assert.equal(results[0].chunkId, "exact");
});

test("keeps failed evidence behind confirmed or documentary evidence", async () => {
    const failed = { ...baseRow, chunkId: "failed", documentId: "failed-doc", authority: "FAILED" as const, semanticScore: 1 };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "U5002", embedding: [0.1] },
        adapterFor([failed, baseRow]),
    );
    assert.equal(results.at(-1)?.chunkId, "failed");
});

test("component matches survive weak semantic similarity", async () => {
    const component = { ...baseRow, chunkId: "component", semanticScore: 0.05, componentMatch: true };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "medir U5002", componentCodes: ["U5002"], embedding: [0.1] },
        adapterFor([component]),
    );
    assert.equal(results[0].chunkId, "component");
});

test("excludes legacy wiki sources from Cerebro V2", async () => {
    const wiki = { ...baseRow, chunkId: "legacy", sourceType: "WIKI" as const };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "no enciende", embedding: [0.1] },
        adapterFor([wiki, baseRow]),
    );
    assert.deepEqual(results.map((source) => source.sourceType), ["REPAIR"]);
});

test("keeps exact-model evidence when exact results exist", async () => {
    const unrelated = { ...baseRow, chunkId: "unrelated", model: "SM-A505FN", semanticScore: 0.99 };
    const exact = { ...baseRow, chunkId: "exact", semanticScore: 0.6 };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "no enciende", embedding: [0.1] },
        adapterFor([unrelated, exact]),
    );
    assert.deepEqual(results.map((source) => source.model), ["SM-A405FN"]);
});

test("does not substitute repairs from another model", async () => {
    const iphone11 = { ...baseRow, chunkId: "iphone-11", brand: "APPLE", model: "IPHONE 11" };
    const results = await retrieveCerebroSources(
        { brand: "APPLE", model: "IPHONE 8", text: "no enciende", embedding: [0.1] },
        { search: async () => [iphone11] },
    );
    assert.deepEqual(results, []);
});

test("filters the exact model before limiting database candidates", async () => {
    await retrieveCerebroSources(
        { brand: "APPLE", model: "IPHONE 8", text: "no enciende", embedding: [0.1] },
        {
            async search(sql, params) {
                assert.match(sql, /rag_device_aliases/);
                assert.doesNotMatch(sql, /\$6/);
                assert.equal(params.length, 5);
                assert.match(sql, /semantic_pdf_ids[\s\S]+source_type = 'PDF'[\s\S]+LIMIT 40/);
                assert.match(sql, /semantic_repair_ids[\s\S]+source_type = 'REPAIR'[\s\S]+LIMIT 20/);
                assert.match(sql, /keyword_pdf_ids[\s\S]+source_type = 'PDF'[\s\S]+LIMIT 40/);
                assert.deepEqual(params[3], ["IPHONE 8"]);
                return [];
            },
        },
    );
});

test("allows only explicitly declared model aliases before the SQL limit", async () => {
    const a12 = { ...baseRow, chunkId: "a12", model: "GALAXY A12", modelFamily: "GALAXY A12", identityMatch: true };
    const a13 = { ...baseRow, chunkId: "a13", model: "GALAXY A13", modelFamily: "GALAXY A13" };
    const results = await retrieveCerebroSources(
        {
            brand: "SAMSUNG",
            model: "SM-A125M",
            modelAliases: ["SM-A125M", "GALAXY A12", "A12"],
            modelFamily: "GALAXY A12",
            text: "no enciende",
            embedding: [0.1],
        },
        {
            async search(_sql, params) {
                assert.deepEqual(params[3], ["SM-A125M", "GALAXY A12", "A12"]);
                return [a13, a12];
            },
        },
    );

    assert.deepEqual(results.map((source) => source.chunkId), ["a12"]);
});

test("boosts pages whose section matches the planned subsystem", async () => {
    const charging = { ...baseRow, chunkId: "charging", section: "USB CHARGING", subsystems: ["CHARGING"], semanticScore: 0.6 };
    const radio = { ...baseRow, chunkId: "radio", section: "RF", subsystems: ["RF"], semanticScore: 0.7 };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "SM-A405FN", text: "no carga", subsystemTerms: ["CHARGING", "VBUS"], embedding: [0.1] },
        adapterFor([radio, charging]),
    );
    assert.equal(results[0].chunkId, "charging");
});

test("reserves half of the evidence for exact-model technical documents", async () => {
    const repairs = Array.from({ length: 8 }, (_, index) => ({
        ...baseRow,
        chunkId: `repair-${index}`,
        documentId: `repair-doc-${index}`,
        semanticScore: 0.99 - index * 0.01,
    }));
    const powerOn = {
        ...baseRow,
        chunkId: "manual-power-on",
        documentId: "manual-doc",
        sourceType: "PDF" as const,
        authority: "TECHNICAL_DOCUMENT" as const,
        title: "SM-M127F Troubleshooting",
        pageNumber: 1,
        section: "Power On",
        content: "Check R3008, TRST_N, U5000 outputs and OSC2000",
        semanticScore: 0.5,
    };
    const display = {
        ...powerOn,
        chunkId: "manual-display",
        pageNumber: 15,
        section: "Display",
        content: "Check VSN_-5P9, VSP_5P9 and VDD_LCD_1P8",
        semanticScore: 0.4,
    };
    const blockDiagram = {
        ...powerOn,
        chunkId: "block-diagram",
        documentId: "block-doc",
        title: "SM-M127F Block Diagram",
        pageNumber: 1,
        section: "POWER PART",
        content: "AP PMIC and IF PMIC overview",
        semanticScore: 0.95,
    };

    const results = await retrieveCerebroSources(
        {
            brand: "SAMSUNG",
            model: "SM-A405FN",
            text: "no enciende y no da luz de fondo",
            subsystemTerms: ["POWER", "DISPLAY"],
            embedding: [0.1],
            limit: 8,
        },
        adapterFor([...repairs, blockDiagram, powerOn, display]),
    );

    assert.deepEqual(
        results.filter((source) => source.sourceType === "PDF").map((source) => source.chunkId),
        ["manual-power-on", "manual-display", "block-diagram"],
    );
    assert.equal(results[0].chunkId, "manual-power-on");
});

test("rejects RF repair anecdotes whose diagnosis never confirms the SIM failure", async () => {
    const unrelatedModule = {
        ...baseRow,
        chunkId: "unrelated-module",
        content: "PROBLEMA: cambio de módulo / sin chip, no se comprobaron funciones\nDIAGNOSTICO: se reemplazó el módulo",
        keywordScore: 0.8,
        semanticScore: 0.99,
    };
    const simSchematic = {
        ...baseRow,
        chunkId: "sim-schematic",
        documentId: "sm-a035-schematic",
        sourceType: "PDF" as const,
        authority: "TECHNICAL_DOCUMENT" as const,
        model: "A03",
        identityMatch: true,
        title: "SM-A035 plano esquemático completo",
        pageNumber: 19,
        content: "U1400 Digital Baseband Processor SIM interface",
        semanticScore: 0.55,
        keywordScore: 0.2,
    };

    const results = await retrieveCerebroSources(
        {
            brand: "SAMSUNG",
            model: "A03",
            text: "antena IMEI no lee chip SIM connector baseband",
            subsystemTerms: ["RF", "SIM", "BASEBAND"],
            embedding: [0.1],
        },
        adapterFor([unrelatedModule, simSchematic]),
    );

    assert.deepEqual(results.map((source) => source.chunkId), ["sim-schematic"]);
});

test("deduplicates the same PDF title and page from mirrored library paths", async () => {
    const schematic = {
        ...baseRow,
        chunkId: "schematic-original",
        documentId: "doc-original",
        sourceType: "PDF" as const,
        authority: "TECHNICAL_DOCUMENT" as const,
        model: "A03",
        identityMatch: true,
        title: "SM-A035 plano esquemático completo",
        pageNumber: 19,
        content: "Digital Baseband Processor SIM interface",
    };
    const mirrored = { ...schematic, chunkId: "schematic-copy", documentId: "doc-copy" };
    const results = await retrieveCerebroSources(
        { brand: "SAMSUNG", model: "A03", text: "no lee SIM", embedding: [0.1] },
        adapterFor([schematic, mirrored]),
    );

    assert.equal(results.length, 1);
});
