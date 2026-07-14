import assert from "node:assert/strict";
import test from "node:test";

import { extractMessageInput, toPublicSources } from "@/lib/cerebro-v2/message-content";
import type { CerebroSource } from "@/lib/cerebro-v2/types";

test("extracts text and image attachments for the vision model", () => {
    const result = extractMessageInput({
        role: "user",
        parts: [
            { type: "text", text: "Analizá esta placa" },
            { type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,AAAA" },
        ],
    });

    assert.equal(result.text, "Analizá esta placa");
    assert.deepEqual(result.images, ["data:image/jpeg;base64,AAAA"]);
});

test("creates public sources without chunk ids or full evidence", () => {
    const source: CerebroSource = {
        chunkId: "3ba9423f-0672-4e4b-b0fe-144c8ab05242",
        documentId: "7dc46b21-5000-46f2-a1bf-f778e73723a1",
        sourceType: "PDF",
        authority: "TECHNICAL_DOCUMENT",
        brand: "SAMSUNG",
        model: "SM-A405FN",
        title: "Manual de servicio",
        pageNumber: 7,
        content: "VBAT entra al bloque de alimentación. ".repeat(20),
        score: 1,
    };

    const result = toPublicSources([source]);

    assert.equal(result[0]?.documentId, source.documentId);
    assert.equal("chunkId" in (result[0] ?? {}), false);
    assert.ok((result[0]?.excerpt.length ?? 0) <= 260);
});
