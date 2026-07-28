import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string): string {
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("repair creation uses the uniform section system", () => {
    const sectionUrl = new URL("../components/repairs/repair-form-section.tsx", import.meta.url);
    const form = read("components/repairs/create-form.tsx");

    assert.equal(existsSync(sectionUrl), true, "the shared repair form section must exist");
    assert.match(form, /Nuevo ingreso/);
    assert.match(form, /Cliente/);
    assert.match(form, /Entrega/);
});

test("repair creation keeps labels, feedback and one primary action", () => {
    const fields = read("components/repairs/create-repair-form-fields.tsx");
    const ticket = read("components/repairs/ticket-input.tsx");

    assert.match(fields, /RepairFormSection/);
    assert.match(fields, /aria-live="polite"/);
    assert.match(ticket, /htmlFor="ticket-number"/);
    assert.equal((fields.match(/type="submit"/g) ?? []).length, 1);
});
