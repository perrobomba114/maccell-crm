import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBrand, normalizeModel } from "../lib/cerebro-v2/normalization";

test("normalizes known brands without cross-brand aliases", () => {
    assert.equal(normalizeBrand("smsung"), "SAMSUNG");
    assert.equal(normalizeBrand("iphone"), "APPLE");
    assert.equal(normalizeBrand("Motorola "), "MOTOROLA");
});

test("normalizes Samsung model aliases", () => {
    assert.equal(normalizeModel("SAMSUNG", "A405FN"), "SM-A405FN");
    assert.equal(normalizeModel("SAMSUNG", "sm a405fn"), "SM-A405FN");
});

test("normalizes Apple model aliases", () => {
    assert.equal(normalizeModel("APPLE", "11PM"), "IPHONE 11 PRO MAX");
    assert.equal(normalizeModel("APPLE", "8"), "IPHONE 8");
    assert.equal(normalizeModel("APPLE", "iPhone 8"), "IPHONE 8");
});
