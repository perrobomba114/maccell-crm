import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const viewerSource = readFileSync(
    join(process.cwd(), "src/components/cerebro-v2/cerebro-v2-pdf-viewer.tsx"),
    "utf8",
);

test("opens cited PDF pages as an accessible fullscreen dialog", () => {
    assert.match(viewerSource, /role="dialog"/);
    assert.match(viewerSource, /aria-modal="true"/);
    assert.match(viewerSource, /fixed inset-0/);
    assert.doesNotMatch(viewerSource, /<aside/);
});

test("supports closing, bidirectional scrolling and technical zoom", () => {
    assert.match(viewerSource, /event\.key === "Escape"/);
    assert.match(viewerSource, /document\.body\.style\.overflow = "hidden"/);
    assert.match(viewerSource, /overflow-auto/);
    assert.match(viewerSource, /const MAX_ZOOM = 400/);
    assert.match(viewerSource, /Math\.min\(MAX_ZOOM/);
    assert.match(viewerSource, /Restablecer zoom/);
});
