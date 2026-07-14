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
