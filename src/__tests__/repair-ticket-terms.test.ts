import assert from "node:assert/strict";
import test from "node:test";

import { REPAIR_DATA_RESPONSIBILITY_TERMS } from "../lib/printing/repair-terms";

test("repair ticket data responsibility terms include SIM, memory cards, and data loss", () => {
    assert.match(REPAIR_DATA_RESPONSIBILITY_TERMS, /tarjeta sim/i);
    assert.match(REPAIR_DATA_RESPONSIBILITY_TERMS, /tarjetas de memoria/i);
    assert.match(REPAIR_DATA_RESPONSIBILITY_TERMS, /p[ée]rdida de informaci[óo]n/i);
    assert.match(REPAIR_DATA_RESPONSIBILITY_TERMS, /backup previo/i);
});
