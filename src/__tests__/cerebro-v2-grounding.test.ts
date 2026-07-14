import assert from "node:assert/strict";
import test from "node:test";

import { suppressUnsupportedMeasurements } from "@/lib/cerebro-v2/grounding";

test("keeps measurements present in exact evidence", () => {
    const answer = suppressUnsupportedMeasurements(
        "Medí 3.8 V en PP_BATT_VCC.",
        ["PP_BATT_VCC expected 3.8V"],
    );
    assert.match(answer, /3\.8 V/);
});

test("suppresses numeric electrical values absent from evidence", () => {
    const answer = suppressUnsupportedMeasurements(
        "Debería medir 3.8 V y consumir 120 mA.",
        ["Inspect battery connector without a specified value"],
    );
    assert.doesNotMatch(answer, /3\.8 V|120 mA/);
    assert.match(answer, /registrar el valor medido/i);
});
