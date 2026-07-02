import assert from "node:assert/strict";
import test from "node:test";

import { convertRepairImageForStorage } from "../lib/repair-image-conversion";

const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
);

test("converts supported repair image uploads to jpeg storage files", async () => {
    const converted = await convertRepairImageForStorage({
        buffer: onePixelPng,
        fileName: "foto-cliente.heic",
        contentType: "image/heic",
    });

    assert.equal(converted.extension, ".jpg");
    assert.equal(converted.contentType, "image/jpeg");
    assert.equal(converted.buffer.subarray(0, 3).toString("hex"), "ffd8ff");
});

test("rejects non-image repair uploads before storage", async () => {
    await assert.rejects(
        () => convertRepairImageForStorage({
            buffer: Buffer.from("not an image"),
            fileName: "reporte.pdf",
            contentType: "application/pdf",
        }),
        /imagen/i,
    );
});
