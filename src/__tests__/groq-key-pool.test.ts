import assert from "node:assert/strict";
import test from "node:test";

import { getGroqKeys } from "@/lib/groq";

test("loads the base Groq key and every numbered key including key one", () => {
    const keys = getGroqKeys({
        GROQ_API_KEY: "base-key-long-enough",
        GROQ_API_KEY_1: "first-key-long-enough",
        GROQ_API_KEY_2: "second-key-long-enough",
    });

    assert.deepEqual(keys, [
        "base-key-long-enough",
        "first-key-long-enough",
        "second-key-long-enough",
    ]);
});

test("does not retry a duplicated Groq key", () => {
    const keys = getGroqKeys({
        GROQ_API_KEY: "same-key-long-enough",
        GROQ_API_KEY_1: "same-key-long-enough",
    });

    assert.deepEqual(keys, ["same-key-long-enough"]);
});
