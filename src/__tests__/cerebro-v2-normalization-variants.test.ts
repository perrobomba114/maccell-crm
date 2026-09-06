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

test("normalizes Motorola G22, G13 and XT codes bidirectionally", () => {
    const g22 = normalizeDeviceIdentity("MOTOROLA", "g22");
    assert.equal(g22.brand, "MOTOROLA");
    assert.equal(g22.model, "MOTO G22");
    const g22Aliases = deviceModelAliases(g22);
    assert.ok(g22Aliases.includes("MOTO G22"));
    assert.ok(g22Aliases.includes("G22"));
    assert.ok(g22Aliases.includes("MOTOROLA G22"));
    assert.ok(g22Aliases.includes("XT2231"));

    const xt = normalizeDeviceIdentity("MOTOROLA", "XT2231");
    assert.equal(xt.model, "MOTO G22");

    const g13 = normalizeDeviceIdentity("MOTOROLA", "g13");
    assert.equal(g13.brand, "MOTOROLA");
    assert.equal(g13.model, "MOTO G13");
    const g13Aliases = deviceModelAliases(g13);
    assert.ok(g13Aliases.includes("MOTO G13"));
    assert.ok(g13Aliases.includes("G13"));
    assert.ok(g13Aliases.includes("XT2335"));
});

test("normalizes Samsung A10, A22 and A54 with technical prefixes and variants", () => {
    const a10 = normalizeDeviceIdentity("SAMSUNG", "A10");
    assert.equal(a10.brand, "SAMSUNG");
    const a10Aliases = deviceModelAliases(a10);
    assert.ok(a10Aliases.includes("A10"));
    assert.ok(a10Aliases.includes("GALAXY A10"));
    assert.ok(a10Aliases.includes("SM-A105"));
    assert.ok(a10Aliases.includes("SM-A105M"));

    const a22 = normalizeDeviceIdentity("SAMSUNG", "a22");
    const a22Aliases = deviceModelAliases(a22);
    assert.ok(a22Aliases.includes("A22"));
    assert.ok(a22Aliases.includes("GALAXY A22"));
    assert.ok(a22Aliases.includes("SM-A225"));
    assert.ok(a22Aliases.includes("SM-A225M"));
    assert.ok(a22Aliases.includes("SM-A226B"));

    const a54 = normalizeDeviceIdentity("SAMSUNG", "A54");
    const a54Aliases = deviceModelAliases(a54);
    assert.ok(a54Aliases.includes("A54"));
    assert.ok(a54Aliases.includes("GALAXY A54"));
    assert.ok(a54Aliases.includes("SM-A546"));
    assert.ok(a54Aliases.includes("SM-A546B"));
});

test("normalizes LG models and chassis codes", () => {
    const k40s = normalizeDeviceIdentity("LG", "K40s");
    assert.equal(k40s.brand, "LG");
    const k40sAliases = deviceModelAliases(k40s);
    assert.ok(k40sAliases.includes("K40S"));
    assert.ok(k40sAliases.includes("LG K40S"));
    assert.ok(k40sAliases.includes("LM-X430"));

    const g4 = normalizeDeviceIdentity("LG", "G4");
    assert.equal(g4.brand, "LG");
    const g4Aliases = deviceModelAliases(g4);
    assert.ok(g4Aliases.includes("G4"));
    assert.ok(g4Aliases.includes("LG G4"));
    assert.ok(g4Aliases.includes("H815"));

    const fromCode = normalizeDeviceIdentity("LG", "D802");
    assert.equal(fromCode.model, "LG G2");
});

test("normalizes Huawei and Honor devices", () => {
    const p30 = normalizeDeviceIdentity("HUAWEI", "P30 Lite");
    assert.equal(p30.brand, "HUAWEI");
    const p30Aliases = deviceModelAliases(p30);
    assert.ok(p30Aliases.includes("P30 LITE"));
    assert.ok(p30Aliases.includes("HUAWEI P30 LITE"));

    const honor = normalizeDeviceIdentity("HONOR", "Honor 10 Lite");
    assert.equal(honor.brand, "HUAWEI");
    const honorAliases = deviceModelAliases(honor);
    assert.ok(honorAliases.includes("HONOR 10 LITE"));
    assert.ok(honorAliases.includes("HUAWEI HONOR 10 LITE"));
});

test("normalizes Xiaomi, Redmi and Poco devices", () => {
    const redmi = normalizeDeviceIdentity("REDMI", "Redmi Note 11");
    assert.equal(redmi.brand, "XIAOMI");
    const redmiAliases = deviceModelAliases(redmi);
    assert.ok(redmiAliases.includes("REDMI NOTE 11"));
    assert.ok(redmiAliases.includes("XIAOMI REDMI NOTE 11"));

    const poco = normalizeDeviceIdentity("POCO", "Poco X3");
    assert.equal(poco.brand, "XIAOMI");
    const pocoAliases = deviceModelAliases(poco);
    assert.ok(pocoAliases.includes("POCO X3"));
    assert.ok(pocoAliases.includes("XIAOMI POCO X3"));
});

test("normalizes Samsung M, S, Note and J series", () => {
    const m13 = normalizeDeviceIdentity("SAMSUNG", "M13");
    const m13Aliases = deviceModelAliases(m13);
    assert.ok(m13Aliases.includes("M13"));
    assert.ok(m13Aliases.includes("SM-M135"));

    const s22 = normalizeDeviceIdentity("SAMSUNG", "S22");
    const s22Aliases = deviceModelAliases(s22);
    assert.ok(s22Aliases.includes("S22"));
    assert.ok(s22Aliases.includes("GALAXY S22"));

    const note10 = normalizeDeviceIdentity("SAMSUNG", "Note 10");
    const note10Aliases = deviceModelAliases(note10);
    assert.ok(note10Aliases.includes("NOTE 10"));
    assert.ok(note10Aliases.includes("GALAXY NOTE 10"));
});


