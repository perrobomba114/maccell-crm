import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const technicianRepairsSource = readFileSync(
    new URL("../app/technician/repairs/page.tsx", import.meta.url),
    "utf8",
);
const vendorActiveSource = readFileSync(
    new URL("../app/vendor/repairs/active/page.tsx", import.meta.url),
    "utf8",
);
const vendorHistoryActionSource = readFileSync(
    new URL("../actions/repairs/history.ts", import.meta.url),
    "utf8",
);
const finishActionSource = readFileSync(
    new URL("../actions/repairs/finish.ts", import.meta.url),
    "utf8",
);

test("technician repairs page requests only assigned operational statuses", () => {
    assert.match(technicianRepairsSource, /TECHNICIAN_REPAIR_STATUS_IDS/);
    assert.doesNotMatch(technicianRepairsSource, /\[2, 3, 4, 7, 8, 9\]/);
});

test("vendor active page excludes waiting repairs and vendor history includes them", () => {
    assert.match(vendorActiveSource, /VENDOR_ACTIVE_REPAIR_STATUS_IDS/);
    assert.match(vendorHistoryActionSource, /VENDOR_HISTORY_STATUS_IDS/);
});

test("blocked technician status links the vendor to repair history", () => {
    assert.match(finishActionSource, /vendor\/repairs\/history/);
});
