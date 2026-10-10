import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

import { convertRepairImageForStorage, MAX_REPAIR_IMAGE_BYTES } from "../lib/repair-image-conversion";

const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
);

test("converts supported repair image uploads to jpeg storage files", async () => {
    const converted = await convertRepairImageForStorage({
        buffer: onePixelPng,
        fileName: "foto-cliente.png",
        contentType: "image/png",
    });

    assert.equal(converted.extension, ".jpg");
    assert.equal(converted.contentType, "image/jpeg");
    assert.equal(converted.buffer.subarray(0, 3).toString("hex"), "ffd8ff");
});

test("decodes a real HEVC HEIC photo when prebuilt sharp lacks that codec", async () => {
    const input = await readFile(new URL("./fixtures/repair-images/example.heic", import.meta.url));
    assert.match(input.subarray(4, 32).toString("ascii"), /ftypmif1.*heic/);
    const converted = await convertRepairImageForStorage({ buffer: input, fileName: "foto.heic", contentType: "image/heic" });
    const metadata = await sharp(converted.buffer).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, 1280);
    assert.equal(metadata.height, 854);
});

test("rotates EXIF camera images before resizing and strips orientation", async () => {
    const input = await sharp({ create: { width: 100, height: 200, channels: 3, background: "red" } })
        .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const converted = await convertRepairImageForStorage({ buffer: input, fileName: "camera.jpg", contentType: "image/jpeg" });
    const metadata = await sharp(converted.buffer).metadata();
    assert.equal(metadata.width, 200);
    assert.equal(metadata.height, 100);
    assert.equal(metadata.orientation, undefined);
});

test("large camera dimensions resize to 4096 without enlarging small images", async () => {
    const input = await sharp({ create: { width: 5000, height: 2500, channels: 3, background: "blue" } }).jpeg().toBuffer();
    const converted = await convertRepairImageForStorage({ buffer: input, fileName: "camera.jpg", contentType: "image/jpeg" });
    const metadata = await sharp(converted.buffer).metadata();
    assert.equal(metadata.width, 4096);
    assert.equal(metadata.height, 2048);
});

test("rejects oversized and corrupt photos with a useful validation error", async () => {
    await assert.rejects(() => convertRepairImageForStorage({ buffer: Buffer.alloc(MAX_REPAIR_IMAGE_BYTES + 1), fileName: "big.jpg", contentType: "image/jpeg" }), /30 MB/);
    await assert.rejects(() => convertRepairImageForStorage({ buffer: Buffer.from("broken"), fileName: "broken.heic", contentType: "image/heic" }), /No se pudo leer la foto/);
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
