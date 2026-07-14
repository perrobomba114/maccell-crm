import assert from "node:assert/strict";
import test from "node:test";

import { buildGuidedQuestion, validateGuidedAnswer } from "@/lib/cerebro-v2/guided-diagnosis";

test("asks one measurable multiple-choice question for a no-power diagnosis", () => {
    const question = buildGuidedQuestion({
        repairProblem: "No enciende",
        latestText: "Dame sugerencias",
        evidenceDocumentIds: ["doc-1"],
    });

    assert.ok(question);
    assert.match(question.prompt, /consumo/i);
    assert.ok(question.options.length >= 2 && question.options.length <= 4);
    assert.equal(question.allowFreeText, true);
});

test("validates only options from the pending question", () => {
    const question = buildGuidedQuestion({
        repairProblem: "No enciende",
        latestText: "qué mido",
        evidenceDocumentIds: [],
    });
    assert.ok(question);

    assert.ok(validateGuidedAnswer(question, {
        questionId: question.id,
        optionId: question.options[0].id,
    }));
    assert.equal(validateGuidedAnswer(question, {
        questionId: question.id,
        optionId: "manipulated-option",
    }), null);
});

test("distinguishes SIM detection from a radio signal failure", () => {
    const question = buildGuidedQuestion({
        repairProblem: "Revisar antena / IMEI ok pero no lee chip",
        latestText: "No lee chip",
        evidenceDocumentIds: ["sm-a035-schematic"],
    });

    assert.ok(question);
    assert.match(question.prompt, /SIM conocida/i);
    assert.deepEqual(question.options.map((candidate) => candidate.id), [
        "sim-not-detected",
        "sim-detected-no-service",
        "sim-registered-no-signal",
        "sim-intermittent",
    ]);
    assert.ok(question.options.every((candidate) => /SIM conocida/i.test(candidate.observation.conditions)));
});

test("asks for the iOS panic log before treating a timed restart as charging", () => {
    const question = buildGuidedQuestion({
        repairProblem: "Se usa 3 min y se reinicia solo / carga 0.6",
        latestText: "Se reinicia",
        evidenceDocumentIds: ["prior-repair"],
    });

    assert.ok(question);
    assert.match(question.prompt, /Datos de análisis|panic/i);
    assert.deepEqual(question.options.map((candidate) => candidate.id), [
        "panic-full",
        "watchdog-missing-sensor",
        "no-recent-panic",
        "cannot-open-settings",
    ]);
});
