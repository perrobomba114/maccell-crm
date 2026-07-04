import assert from "node:assert/strict";
import test from "node:test";
import { createBarcodeDetectionStabilizer } from "@/lib/barcode-detection-stability";

test("waits for repeated barcode detections before accepting a scan", () => {
    const stabilizer = createBarcodeDetectionStabilizer({ requiredMatches: 3, minLength: 4 });

    assert.equal(stabilizer.push("99881234"), null);
    assert.equal(stabilizer.push("99881234"), null);
    assert.equal(stabilizer.push("99881234"), "99881234");
});

test("resets stability when a different barcode is detected", () => {
    const stabilizer = createBarcodeDetectionStabilizer({ requiredMatches: 3, minLength: 4 });

    assert.equal(stabilizer.push("99881234"), null);
    assert.equal(stabilizer.push("99885678"), null);
    assert.equal(stabilizer.push("99881234"), null);
    assert.equal(stabilizer.push("99881234"), null);
    assert.equal(stabilizer.push("99881234"), "99881234");
});

test("ignores short partial barcode detections", () => {
    const stabilizer = createBarcodeDetectionStabilizer({ requiredMatches: 2, minLength: 4 });

    assert.equal(stabilizer.push("12"), null);
    assert.equal(stabilizer.push("12"), null);
    assert.equal(stabilizer.push("1234"), null);
    assert.equal(stabilizer.push("1234"), "1234");
});
