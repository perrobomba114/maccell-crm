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
};

function adapterFor(rows: RetrievalRow[]): RetrievalAdapter {
    return {
        async search(sql, params) {
            assert.match(sql, /normalized_brand = \$1/);
            assert.match(sql, /semantic_ids/);
            assert.match(sql, /keyword_ids/);
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
    const failed = { ...baseRow, chunkId: "failed", authority: "FAILED" as const, semanticScore: 1 };
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
