import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeUrl = new URL("../app/api/cerebro-v2/chat/route.ts", import.meta.url);
const providerUrl = new URL("../lib/cerebro-v2/provider-selection.ts", import.meta.url);
const visionUrl = new URL("../lib/cerebro-v2/evidence-vision.ts", import.meta.url);

test("Cerebro chat prioriza OpenRouter y mantiene Groq y local como respaldo", () => {
    const providerSource = readFileSync(providerUrl, "utf8");
    const buildModel = providerSource.slice(providerSource.indexOf("export function buildModel"));
    const groq = buildModel.indexOf("buildGroqModelConfigurations");
    const local = buildModel.indexOf("createLocalCerebroModel");
    const openRouter = buildModel.indexOf("createOpenRouter");

    assert.ok(openRouter >= 0);
    assert.ok(groq > openRouter);
    assert.ok(local > groq);
});

test("Cerebro vision bounds attached and document images", () => {
    const source = readFileSync(visionUrl, "utf8");

    assert.match(source, /images\.slice\(0,2\)/);
    assert.match(source, /Math\.max\(0,2-images\.length\)/);
});

test("Cerebro chat no longer selects deprecated Llama 3.3", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.doesNotMatch(source, /llama-3\.3-70b-versatile/);
    assert.doesNotMatch(source, /import[^\n]*(TEXT_MODELS|VISION_MODEL)/);
});
