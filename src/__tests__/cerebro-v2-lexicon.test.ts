import assert from "node:assert/strict";
import test from "node:test";
import { translateTechnicalTerm, expandTechnicalLexicon } from "../lib/cerebro-v2/lexicon";

test("translates Chinese/English technical jargon to standard Spanish workbench terms", () => {
    assert.equal(translateTechnicalTerm("tail plug"), "flex de pin de carga / subplaca de carga");
    assert.equal(translateTechnicalTerm("insurance resistance"), "resistencia fusible / fusible de protección de paso");
    assert.equal(translateTechnicalTerm("middle layer"), "capa intermedia (interposer) / arrastre de estaño en placa sándwich");
    assert.equal(translateTechnicalTerm("flying wire"), "puente / micro-jumper con hilo de cobre esmaltado");
    assert.equal(translateTechnicalTerm("flower screen"), "pantalla con líneas / pantalla blanca o verde / artefactos visuales (WSOD)");
    assert.equal(translateTechnicalTerm("diode value"), "caída de tensión en escala de diodo (respecto a tierra GND)");
    assert.equal(translateTechnicalTerm("startup short contact"), "test point de encendido / pad de Power Key a tierra");
    assert.equal(translateTechnicalTerm("backlight lines"), "líneas de retroiluminación (ánodo VLED+ y cátodos de retorno VLED-)");
});

test("expands queries with technical synonyms bidirectionally", () => {
    const chargingExpansion = expandTechnicalLexicon("el telefono no carga con el tail plug");
    assert.ok(chargingExpansion.includes("VBUS"));
    assert.ok(chargingExpansion.includes("PUERTO DE CARGA"));
    assert.ok(chargingExpansion.includes("SUBPLACA"));

    const backlightExpansion = expandTechnicalLexicon("falla de backlight pantalla negra");
    assert.ok(backlightExpansion.includes("ANODO"));
    assert.ok(backlightExpansion.includes("CATODO"));
    assert.ok(backlightExpansion.includes("VLED"));
    assert.ok(backlightExpansion.includes("VBOOST"));

    const fuseExpansion = expandTechnicalLexicon("revisar insurance resistance");
    assert.ok(fuseExpansion.includes("FUSIBLE"));
    assert.ok(fuseExpansion.includes("FUSE RESISTOR"));
    assert.ok(fuseExpansion.includes("0 OHM"));
});
