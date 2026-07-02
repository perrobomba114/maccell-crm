import assert from "node:assert/strict";
import test from "node:test";

import { shouldPauseAdminRepairsAutoRefresh } from "../lib/admin-repairs-refresh";

test("pauses admin repairs auto refresh while the search field has text", () => {
    assert.equal(shouldPauseAdminRepairsAutoRefresh({
        localSearchTerm: "99880001",
        searchTerm: "",
        isPending: false,
        loadingRepairId: null,
        hasOpenDetail: false,
    }), true);
});

test("pauses admin repairs auto refresh while a repair detail is open", () => {
    assert.equal(shouldPauseAdminRepairsAutoRefresh({
        localSearchTerm: "",
        searchTerm: "",
        isPending: false,
        loadingRepairId: null,
        hasOpenDetail: true,
    }), true);
});

test("allows admin repairs auto refresh when the list is idle", () => {
    assert.equal(shouldPauseAdminRepairsAutoRefresh({
        localSearchTerm: "",
        searchTerm: "",
        isPending: false,
        loadingRepairId: null,
        hasOpenDetail: false,
    }), false);
});
