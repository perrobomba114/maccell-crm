import assert from "node:assert/strict";
import test from "node:test";
import { deviceModelAliases, normalizeDeviceIdentity, normalizeModel } from "../lib/cerebro-v2/normalization";

test("normalizes Samsung SM-A037M and Galaxy A03s bidirectionally with shared aliases", () => {
    const fromCommercial = normalizeDeviceIdentity("SAMSUNG", "A03s");
    assert.equal(fromCommercial.brand, "SAMSUNG");
    assert.equal(fromCommercial.model, "SM-A037M");
    assert.equal(fromCommercial.modelFamily, "GALAXY A03S");
    assert.ok(deviceModelAliases(fromCommercial).includes("SM-A037"));
    assert.ok(deviceModelAliases(fromCommercial).includes("A03S"));
    assert.ok(deviceModelAliases(fromCommercial).includes("SM-A037F"));

    const fromTechnical = normalizeDeviceIdentity("SAMSUNG", "SM-A037");
    assert.equal(fromTechnical.brand, "SAMSUNG");
    assert.equal(fromTechnical.model, "SM-A037M");
    assert.ok(deviceModelAliases(fromTechnical).includes("SM-A037M"));
    assert.ok(deviceModelAliases(fromTechnical).includes("GALAXY A03S"));
});

test("normalizes iPhone 17 Pro Max and compact aliases", () => {
    const identity = normalizeDeviceIdentity("APPLE", "17PM");
    assert.equal(identity.brand, "APPLE");
    assert.equal(identity.model, "IPHONE 17 PRO MAX");
    assert.equal(identity.modelFamily, "IPHONE 17 SERIES");

    const aliases = deviceModelAliases(identity);
    assert.ok(aliases.includes("IPHONE 17 PRO MAX"));
    assert.ok(aliases.includes("17 PRO MAX"));
    assert.ok(aliases.includes("17PM"));
    assert.ok(aliases.includes("IPHONE17PROMAX"));
});

test("normalizes iPhone 13 Pro compact aliases", () => {
    const fromP = normalizeDeviceIdentity("APPLE", "13P");
    assert.equal(fromP.model, "IPHONE 13 PRO");

    const fromPro = normalizeDeviceIdentity("APPLE", "13PRO");
    assert.equal(fromPro.model, "IPHONE 13 PRO");

    const aliases = deviceModelAliases(fromP);
    assert.ok(aliases.includes("13P"));
    assert.ok(aliases.includes("13PRO"));
    assert.ok(aliases.includes("IPHONE13PRO"));
});
