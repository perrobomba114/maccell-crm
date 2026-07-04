import assert from "node:assert/strict";
import test from "node:test";

import {
    buildAdminRepairSearchFilters,
    getAdminRepairSearchTermVariants,
    getAdminRepairSearchTerms,
    isAdminRepairTicketLookupQuery,
} from "../lib/admin-repairs-search";
import { buildAdminRepairSearchParamUpdates } from "../lib/admin-repairs-filter-updates";

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

test("detects numeric and prefixed admin repair ticket lookups", () => {
    assert.equal(isAdminRepairTicketLookupQuery("773"), true);
    assert.equal(isAdminRepairTicketLookupQuery("MC2-00000773"), true);
    assert.equal(isAdminRepairTicketLookupQuery("s24"), false);
    assert.equal(isAdminRepairTicketLookupQuery("773 bateria"), false);
});

test("clears scoped admin repair filters when searching by ticket", () => {
    assert.deepEqual(buildAdminRepairSearchParamUpdates(" 773 "), {
        q: "773",
        date: null,
        branch: null,
        techId: null,
        tech: null,
        warranty: null,
    });
    assert.deepEqual(buildAdminRepairSearchParamUpdates(" samsung "), { q: "samsung" });
    assert.deepEqual(buildAdminRepairSearchParamUpdates(" "), { q: null });
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
