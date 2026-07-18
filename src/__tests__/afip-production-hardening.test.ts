import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const afipSource = readFileSync(new URL("../lib/afip.ts", import.meta.url), "utf8");
const dockerfile = readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8");

test("does not log AFIP credentials, taxpayer identifiers or raw SDK responses", () => {
    assert.doesNotMatch(afipSource, /\[DEBUG\].*AFIP/);
    assert.doesNotMatch(afipSource, /Cert Start|Cert End|Key Length/);
    assert.doesNotMatch(afipSource, /CUIT.*Taxes|Fetching details for CUIT/);
    assert.doesNotMatch(afipSource, /JSON\.stringify\(res/);
    assert.doesNotMatch(afipSource, /console\.error\([^;\n]*,\s*(?:error|res)\)/);
});

test("provides a persistent Server Actions encryption key to the Next build", () => {
    assert.match(dockerfile, /ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY/);
    assert.match(dockerfile, /ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=\$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY[\s\S]*RUN npm run build/);
});
