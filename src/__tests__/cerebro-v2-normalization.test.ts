import assert from "node:assert/strict";
import test from "node:test";

import { deviceModelAliases, normalizeBrand, normalizeDeviceIdentity, normalizeModel } from "../lib/cerebro-v2/normalization";

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

test("corrects an incompatible selected brand from an explicit iPhone model", () => {
    assert.deepEqual(normalizeDeviceIdentity("SAMSUNG", "iPhone 8"), {
        brand: "APPLE",
        model: "IPHONE 8",
    });
});

test("maps SM-A125M to the declared Galaxy A12 identity", () => {
    const identity = normalizeDeviceIdentity("Samsung", "SM-A125M");

    assert.equal(identity.brand, "SAMSUNG");
    assert.equal(identity.model, "SM-A125M");
    assert.equal(identity.modelFamily, "GALAXY A12");
    assert.deepEqual(deviceModelAliases(identity), ["SM-A125M", "GALAXY A12", "A12"]);
});

test("does not infer an unregistered Samsung board variant", () => {
    const identity = normalizeDeviceIdentity("Samsung", "SM-A125F");

    assert.equal(identity.model, "SM-A125F");
    assert.deepEqual(deviceModelAliases(identity), ["SM-A125F"]);
});

test("removes a duplicated brand prefix from commercial repair models", () => {
    assert.equal(normalizeModel("Samsung", "Samsung Galaxy S21 Ultra 5G"), "GALAXY S21 ULTRA 5G");
});
