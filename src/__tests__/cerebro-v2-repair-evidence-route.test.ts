import assert from "node:assert/strict";
import test from "node:test";

import { createRepairEvidenceHandler } from "../lib/cerebro-v2/repair-evidence-handler";

const context = { params: Promise.resolve({ documentId: "7dc46b21-5000-46f2-a1bf-f778e73723a1" }) };
const request = new Request("http://localhost/api/cerebro-v2/repair-evidence/7dc46b21-5000-46f2-a1bf-f778e73723a1?sessionId=4aefc8c0-31f4-4b6c-bf43-c8fb277d547f");
const evidence = {
    documentId: "7dc46b21-5000-46f2-a1bf-f778e73723a1",
    title: "Reparación MAC2-00001619", brand: "MOTOROLA", model: "MOTO E7",
    authority: "CONFIRMED_SUCCESS" as const,
    content: "PROBLEMA: no enciende\nCAUSA_CONFIRMADA: batería agotada\nINTERVENCION_CONFIRMADA: cambio de batería\nVERIFICACION_FINAL: arranque probado",
};

test("repair evidence detail requires authentication before database access", async () => {
    let reads = 0;
    const handler = createRepairEvidenceHandler({ getUser: async () => null, canUse: () => true,
        readEvidence: async () => { reads += 1; return evidence; } });
    const response = await handler(request, context);
    assert.equal(response.status, 401);
    assert.equal(reads, 0);
});

test("repair evidence detail only returns a source cited in the user's session", async () => {
    const handler = createRepairEvidenceHandler({ getUser: async () => ({ id: "user-1", role: "TECHNICIAN" }), canUse: () => true,
        readEvidence: async (userId, sessionId, documentId) => {
            assert.deepEqual([userId, sessionId, documentId], ["user-1", "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f", evidence.documentId]);
            return null;
        } });
    const response = await handler(request, context);
    assert.equal(response.status, 404);
});

test("repair evidence detail returns technical provenance and summary without customer data", async () => {
    const handler = createRepairEvidenceHandler({ getUser: async () => ({ id: "user-1", role: "TECHNICIAN" }), canUse: () => true,
        readEvidence: async () => evidence });
    const response = await handler(request, context);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source.documentId, evidence.documentId);
    assert.equal(body.source.summary.rootCause, "batería agotada");
    assert.equal(body.source.summary.outcome, "verified");
    assert.match(body.source.content, /CAUSA: batería agotada/);
    assert.equal(JSON.stringify(body).includes("customer"), false);
});

test("repair evidence detail rejects malformed session and document ids", async () => {
    const handler = createRepairEvidenceHandler({ getUser: async () => ({ id: "user-1", role: "TECHNICIAN" }), canUse: () => true,
        readEvidence: async () => evidence });
    const invalidSession = await handler(new Request("http://localhost/x?sessionId=bad"), context);
    const invalidDocument = await handler(request, { params: Promise.resolve({ documentId: "bad" }) });
    assert.equal(invalidSession.status, 400);
    assert.equal(invalidDocument.status, 400);
});
