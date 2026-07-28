import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatReceivedAccessories } from "../lib/repairs/intake";

test("formats every received-accessory combination", () => {
    assert.equal(formatReceivedAccessories(false, false), "Sin SIM ni tarjeta de memoria");
    assert.equal(formatReceivedAccessories(true, false), "SIM");
    assert.equal(formatReceivedAccessories(false, true), "Tarjeta de memoria");
    assert.equal(formatReceivedAccessories(true, true), "SIM + Tarjeta de memoria");
});

test("repair ticket prints accessories without referencing the credential", () => {
    const source = readFileSync(new URL("../lib/printing/repair-tickets.ts", import.meta.url), "utf8");

    assert.doesNotMatch(source, /accessCredential/);
    assert.match(source, /ACCESORIOS RECIBIDOS/);
    assert.match(source, /formatReceivedAccessories/);
    assert.match(source, /formatRepairAccess\(repair\.accessType \?\? "NONE"\)/);
});
