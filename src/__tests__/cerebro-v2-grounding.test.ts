import assert from "node:assert/strict";
import test from "node:test";

import { ensureObservedFacts, suppressUnsupportedMeasurements } from "@/lib/cerebro-v2/grounding";

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

test("deterministically preserves the seller intake in observed facts", () => {
    const answer = ensureObservedFacts(
        "## DATOS OBSERVADOS\nEl técnico ya reemplazó repuestos.\n\n## EVIDENCIA\nSin evidencia.",
        {
            device: "APPLE IPHONE 12 PRO",
            sellerProblem: "Se usa 3 min y se reinicia solo / carga 0.6 / no se comprobó funciones",
            technicianInput: "Se reinicia",
        },
    );

    assert.match(answer, /Ingreso del vendedor: Se usa 3 min y se reinicia solo \/ carga 0\.6 \/ no se comprobó funciones/);
    assert.match(answer, /Dispositivo: APPLE IPHONE 12 PRO/);
    assert.match(answer, /Consulta del técnico: Se reinicia/);
    assert.doesNotMatch(answer, /ya reemplazó repuestos/);
    assert.equal(answer.match(/## DATOS OBSERVADOS/g)?.length, 1);
});
