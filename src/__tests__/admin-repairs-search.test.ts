import assert from "node:assert/strict";
import test from "node:test";

import {
    buildAdminRepairSearchFilters,
    getAdminRepairSearchTermVariants,
    getAdminRepairSearchTerms,
} from "../lib/admin-repairs-search";

test("splits admin repair search terms by whitespace", () => {
    assert.deepEqual(getAdminRepairSearchTerms("  samsung   s24  "), ["samsung", "s24"]);
});

test("builds compact device model variants for admin repair search", () => {
    const variants = getAdminRepairSearchTermVariants("s24");

    assert.ok(variants.includes("s24"));
    assert.ok(variants.includes("s 24"));
    assert.ok(variants.includes("s-24"));
});

test("builds ticket variants when users omit the branch separator", () => {
    const variants = getAdminRepairSearchTermVariants("mac200001457");

    assert.ok(variants.includes("mac2-00001457"));
});

test("searches admin repairs across device, failure and staff fields", () => {
    const filters = buildAdminRepairSearchFilters("s24");
    const serialized = JSON.stringify(filters);

    assert.match(serialized, /deviceModel/);
    assert.match(serialized, /problemDescription/);
    assert.match(serialized, /diagnosis/);
    assert.match(serialized, /assignedTo/);
    assert.match(serialized, /createdBy/);
});
