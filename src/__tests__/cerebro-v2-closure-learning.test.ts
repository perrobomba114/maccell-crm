import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildClosureLearningRecord, canApproveClosure, deriveLatestTechnicalOutcome, isClosureVersionCurrent } from "@/lib/cerebro-v2/closure-learning";

const completeClosure = {
    symptom: "Enciende pero no da imagen",
    rootCause: "Conector FPC de display abierto",
    confirmingEvidence: "Continuidad abierta entre pin 12 del FPC y R1201",
    intervention: "Se rehizo la pista entre FPC y R1201",
    verification: "Imagen estable durante 20 minutos con módulo de prueba",
    affectedReferences: ["J1200", "R1201"],
    schematicPages: [],
    externalSources: [],
};

const event = (statusId: number, statusName: string, minute: number) => ({
    statusId, statusName, createdAt: new Date(`2026-09-09T12:${String(minute).padStart(2, "0")}:00Z`),
});

test("derives authority from the latest technical cycle, not delivery", () => {
    assert.equal(deriveLatestTechnicalOutcome([event(6, "Entregado", 1)]), "INCOMPLETE");
    assert.equal(deriveLatestTechnicalOutcome([event(7, "No reparado", 1), event(6, "Entregado", 2)]), "FAILED");
    assert.equal(deriveLatestTechnicalOutcome([
        event(7, "No reparado", 1), event(2, "Tomada", 2), event(5, "Finalizado OK", 3), event(6, "Entregado", 4),
    ]), "CONFIRMED_SUCCESS");
});

test("requires specific evidence and verification for confirmed learning", () => {
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", completeClosure).authority, "CONFIRMED_SUCCESS");
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, verification: "ok" }).authority, "INCOMPLETE");
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, confirmingEvidence: "todo ok" }).authority, "INCOMPLETE");
});

test("allows an explicit unknown cause without making it training eligible", () => {
    const result = buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, rootCause: "No determinada" });
    assert.equal(result.authority, "INCOMPLETE");
    assert.equal(result.closure.rootCause, "No determinada");
});

test("redacts customer data from learning fields", () => {
    const result = buildClosureLearningRecord("CONFIRMED_SUCCESS", {
        ...completeClosure,
        confirmingEvidence: "Cliente 1122334455, costo ARS 9000: continuidad abierta",
    });
    assert.doesNotMatch(result.closure.confirmingEvidence, /1122334455|ARS|9000/);
});

test("closure routes authenticate before input and keep review admin-only", async () => {
    const closure = await readFile("src/app/api/cerebro-v2/closure/route.ts", "utf8");
    const review = await readFile("src/app/api/cerebro-v2/closure/review/route.ts", "utf8");
    assert.ok(closure.indexOf("getCurrentUser()") < closure.indexOf("request.json()"));
    assert.match(closure, /assignedUserId === user\.id/);
    assert.match(closure, /statusHistory/);
    assert.match(review, /user\.role !== "ADMIN"/);
    assert.match(review, /authority !== "CONFIRMED_SUCCESS"/);
});

test("closure dialog exposes the five technical fields and side-effect-free cancel", async () => {
    const component = await readFile("src/components/cerebro-v2/cerebro-v2-closure.tsx", "utf8");
    assert.match(component, /type Props = \{ repairId: string; onClose: \(\) => void \}/);
    assert.match(component, /<Dialog open/);
    for (const field of ["symptom", "rootCause", "confirmingEvidence", "intervention", "verification"]) {
        assert.match(component, new RegExp(`name: "${field}"`));
    }
    assert.match(component, /onClick=\{onClose\}[^>]*>Cancelar/);
    assert.match(component, /canApproveClosure\(\{ dirty, serverCanReview, expectedVersion: version \}\)/);
    assert.match(component, /setDirty\(true\)[\s\S]*setServerCanReview\(false\)/);
});

test("dirty or stale closures cannot enter administrative review", () => {
    const updatedAt = new Date("2026-09-09T15:00:00.000Z");
    assert.equal(isClosureVersionCurrent(updatedAt.toISOString(), updatedAt), true);
    assert.equal(isClosureVersionCurrent("2026-09-09T14:59:00.000Z", updatedAt), false);
    assert.equal(canApproveClosure({ dirty: true, serverCanReview: true, expectedVersion: updatedAt.toISOString() }), false);
    assert.equal(canApproveClosure({ dirty: false, serverCanReview: true, expectedVersion: updatedAt.toISOString() }), true);
});

test("review requires current content to remain golden", () => {
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", completeClosure).authority, "CONFIRMED_SUCCESS");
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, verification: "funciona" }).qualityAccepted, false);
    assert.equal(buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, rootCause: "No determinada" }).authority, "INCOMPLETE");
});

test("negative evidence, absent verification and generic intervention never become golden", () => {
    for (const confirmingEvidence of ["No se realizó medición", "No se pudo verificar", "Prueba pendiente de realizar"]) {
        const result = buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, confirmingEvidence });
        assert.equal(result.authority, "INCOMPLETE");
        assert.equal(result.qualityAccepted, false);
        assert.ok(result.qualityIssues.some((issue) => /evidencia/i.test(issue)));
    }
    const noVerification = buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, verification: "No se pudo verificar" });
    assert.equal(noVerification.authority, "INCOMPLETE");
    assert.ok(noVerification.qualityIssues.some((issue) => /prueba final/i.test(issue)));
    const genericWork = buildClosureLearningRecord("CONFIRMED_SUCCESS", { ...completeClosure, intervention: "Se revisó equipo" });
    assert.equal(genericWork.authority, "INCOMPLETE");
    assert.equal(canApproveClosure({ dirty: false, serverCanReview: false, expectedVersion: "2026-09-09T15:00:00.000Z" }), false);
});

test("save and review routes compare the expected version transactionally", async () => {
    const closure = await readFile("src/app/api/cerebro-v2/closure/route.ts", "utf8");
    const review = await readFile("src/app/api/cerebro-v2/closure/review/route.ts", "utf8");
    assert.match(closure, /expectedVersion/);
    assert.match(closure, /updateMany\(\{ where: \{ repairId: repair\.id, updatedAt:/);
    assert.match(review, /closureLearningSchema\.safeParse/);
    assert.match(review, /buildClosureLearningRecord/);
    assert.match(review, /updateMany/);
    assert.match(review, /isolationLevel: "Serializable"/);
});
