import assert from "node:assert/strict";
import { lstatSync, readFileSync } from "node:fs";
import test from "node:test";

test("local PostgreSQL init bind source is a SQL file", () => {
    const initSource = new URL("../../scripts/docker-init.sql", import.meta.url);

    assert.equal(lstatSync(initSource).isFile(), true);
    assert.match(readFileSync(initSource, "utf8"), /CREATE EXTENSION IF NOT EXISTS vector;/);
});
