import assert from "node:assert/strict";
import test from "node:test";

import { getImgUrl } from "../lib/utils";

test("keeps public repair image paths directly addressable", () => {
    assert.equal(getImgUrl("/repairs/images/MAC1-0001.jpg"), "/repairs/images/MAC1-0001.jpg");
    assert.equal(getImgUrl("repairs/images/MAC1-0001.jpg"), "/repairs/images/MAC1-0001.jpg");
});

test("keeps api upload image paths unchanged", () => {
    assert.equal(
        getImgUrl("/api/uploads/repairs/images/MAC1-0001.jpg"),
        "/api/uploads/repairs/images/MAC1-0001.jpg",
    );
});
