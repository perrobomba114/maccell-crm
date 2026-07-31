import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeUrl = new URL("../app/api/cerebro/enhance-diagnosis/route.ts", import.meta.url);

test("authenticates before reading diagnosis enhancement request data", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.match(source, /getCurrentUser\(\)/);
    assert.ok(source.indexOf("getCurrentUser()") < source.indexOf("req.json()"));
});

test("validates Groq output before returning an improved diagnosis", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.match(source, /buildRepairDiagnosisPrompt/);
    assert.match(source, /validateEnhancedDiagnosis/);
    assert.match(source, /coherenceViolation/);
    assert.match(source, /status: 422/);
});

test("uses the technical report as the only authority for completed work", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.match(source, /validateEnhancedDiagnosis\(diagnosis, improved\)/);
    assert.doesNotMatch(source, /validateEnhancedDiagnosis\(problemDescription/);
});

test("routes diagnosis enhancement through Qwen Groq and then local Qwen", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.match(source, /buildGroqModelConfigurations\(getGroqKeys\(\), "diagnosis"\)/);
    assert.match(source, /createLocalCerebroModel\(false\)/);
    assert.match(source, /createFallbackModel/);
    assert.match(source, /maxRetries: 0/);
    assert.doesNotMatch(source, /llama-3\.3-70b-versatile/);
    assert.doesNotMatch(source, /runWithGroqFallback/);
});
