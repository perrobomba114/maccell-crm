import assert from "node:assert/strict";
import test from "node:test";

import { buildRepairImageUploadUrl, normalizeRepairImageUrl } from "../lib/repair-image-storage";
import { getImgUrl } from "../lib/utils";

test("serves legacy public repair image paths through the upload endpoint", () => {
    assert.equal(getImgUrl("/repairs/images/MAC1-0001.jpg"), "/api/uploads/repairs/images/MAC1-0001.jpg");
    assert.equal(getImgUrl("repairs/images/MAC1-0001.jpg"), "/api/uploads/repairs/images/MAC1-0001.jpg");
    assert.equal(normalizeRepairImageUrl("/repairs/images/MAC1-0001.jpg"), "/api/uploads/repairs/images/MAC1-0001.jpg");
});

test("keeps api upload image paths unchanged", () => {
    assert.equal(
        getImgUrl("/api/uploads/repairs/images/MAC1-0001.jpg"),
        "/api/uploads/repairs/images/MAC1-0001.jpg",
    );
});

test("builds upload endpoint paths for newly saved repair images", () => {
    assert.equal(
        buildRepairImageUploadUrl("MAC2-00001450_1783000663897-6653.jpg"),
        "/api/uploads/repairs/images/MAC2-00001450_1783000663897-6653.jpg",
    );
});

test("serves legacy branch and profile image paths through the upload endpoint", () => {
    assert.equal(getImgUrl("/branches/branch-1.jpg"), "/api/uploads/branches/branch-1.jpg");
    assert.equal(getImgUrl("profiles/profile-1.png"), "/api/uploads/profiles/profile-1.png");
    assert.equal(getImgUrl("branch-1.jpg"), "/api/uploads/branches/branch-1.jpg");
    assert.equal(getImgUrl("profile-1.png"), "/api/uploads/profiles/profile-1.png");
});
