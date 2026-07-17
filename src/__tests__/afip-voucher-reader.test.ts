import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const voucherReaderSource = readFileSync(
    new URL("../actions/afip-voucher-reader.ts", import.meta.url),
    "utf8"
);

test("reads the authorization code returned by ARCA FECompConsultar", () => {
    assert.match(
        voucherReaderSource,
        /findValue\(response, \["CodAutorizacion", "codAutorizacion", "CAE", "cae"\]\)/
    );
});
