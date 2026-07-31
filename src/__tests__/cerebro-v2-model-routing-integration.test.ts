import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeUrl = new URL("../app/api/cerebro-v2/chat/route.ts", import.meta.url);

test("Cerebro chat builds Groq candidates before local and OpenRouter", () => {
    const source = readFileSync(routeUrl, "utf8");
    const buildModel = source.slice(source.indexOf("function buildModel"), source.indexOf("function toModelMessages"));
    const groq = buildModel.indexOf("buildGroqModelConfigurations");
    const local = buildModel.indexOf("createLocalCerebroModel");
    const openRouter = buildModel.indexOf("createOpenRouter");

    assert.ok(groq >= 0);
    assert.ok(local > groq);
    assert.ok(openRouter > local);
});

test("Cerebro vision limits Qwen input to three images", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.match(source, /const boundedImages = images\.slice\(0, 3\)/);
    assert.match(source, /\.\.\.boundedImages\.map/);
});

test("Cerebro chat no longer selects deprecated Llama 3.3", () => {
    const source = readFileSync(routeUrl, "utf8");

    assert.doesNotMatch(source, /llama-3\.3-70b-versatile/);
    assert.doesNotMatch(source, /import[^\n]*(TEXT_MODELS|VISION_MODEL)/);
});
