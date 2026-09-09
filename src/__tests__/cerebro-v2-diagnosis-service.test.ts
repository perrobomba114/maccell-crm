import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseRepair, type DiagnosisDependencies } from "@/lib/cerebro-v2/diagnosis-service";

const repair = {
    ticketNumber: "TEST-1", deviceBrand: "MOTOROLA", deviceModel: "MOTO E7",
    problemDescription: "No enciende", observations: [], diagnosis: null, isWet: false, isWarranty: false,
};

test("provider failure returns a transparent safe plan and preserves the human record", async () => {
    const dependencies: DiagnosisDependencies = {
        retrieve: async () => ({ sources: [], unavailable: [] }),
        vision: async () => ({ facts: "", warnings: [] }),
        draft: async () => { throw new Error("secret provider detail"); },
    };
    const result = await diagnoseRepair({ repair, history: [], text: "Probé otra batería y sigue sin encender", images: [], messageId: "u1" }, dependencies);
    assert.equal(result.metadata.diagnosticPlan?.kind, "inspection");
    assert.ok(result.metadata.diagnosticState?.observations.some((item) => item.text.includes("otra batería")));
    assert.ok(result.metadata.retrievalWarnings?.some((warning) => /proveedor/i.test(warning)));
    assert.doesNotMatch(JSON.stringify(result), /secret provider detail/);
});

test("retrieval failure degrades explicitly instead of aborting diagnosis", async () => {
    const dependencies: DiagnosisDependencies = {
        retrieve: async () => { throw new Error("database address"); },
        vision: async () => ({ facts: "", warnings: [] }),
        draft: async () => { throw new Error("offline"); },
    };
    const result = await diagnoseRepair({ repair, history: [], text: "No presenta consumo", images: [], messageId: "u2" }, dependencies);
    assert.ok(result.metadata.retrievalWarnings?.some((warning) => /recuperar evidencia/i.test(warning)));
    assert.doesNotMatch(JSON.stringify(result), /database address/);
});

test('after discarding an intake reading, provider failure asks for existing signs of startup',async()=>{
    const result=await diagnoseRepair({repair:{...repair,problemDescription:'Revisar y presupuestar / ingresa apagado / recibe carga 0.6'},
        history:[{id:'a0',role:'assistant',content:'',question:'El dato 0.6 no tiene unidad confirmada. Indicá instrumento y cuándo se midió.'},
            {id:'a1',role:'assistant',content:'',question:'Adjuntá una imagen legible de la zona o página que estás revisando.'}],
        text:'Es un dato de recepción sin comprobar.',images:[],messageId:'u3'}, {
        retrieve:async()=>({sources:[],unavailable:[]}),vision:async()=>({facts:'',warnings:[]}),
        draft:async()=>{throw new Error('offline');},
    });
    assert.equal(result.metadata.diagnosticPlan?.kind,'clarification');
    assert.match(result.metadata.diagnosticPlan?.question??'',/vibración, sonido o detección USB/);
    assert.match(result.metadata.diagnosticPlan?.conditions??'',/No conectes/);
    assert.doesNotMatch(result.text,/No pude validar una próxima medición/);
});
