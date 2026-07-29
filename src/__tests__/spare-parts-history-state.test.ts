import assert from "node:assert/strict";
import test from "node:test";
import { updateHistoryChecked } from "../lib/spare-parts-history-state";

test("updates a checked row without changing the visible order", () => {
    const rows = [
        { id: "movement-c", isChecked: false, label: "C" },
        { id: "movement-b", isChecked: false, label: "B" },
        { id: "movement-a", isChecked: true, label: "A" },
    ];

    const updated = updateHistoryChecked(rows, "movement-b", true);

    assert.deepEqual(updated.map((row) => row.id), rows.map((row) => row.id));
    assert.equal(updated[1].isChecked, true);
    assert.equal(updated[0], rows[0]);
    assert.equal(updated[2], rows[2]);
});
