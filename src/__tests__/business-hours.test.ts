import assert from "node:assert/strict";
import test from "node:test";

import { businessHoursService } from "../lib/services/business-hours";

test("moves a repair promise across the afternoon break in Argentina time", () => {
    const start = new Date("2026-08-07T15:30:00.000Z"); // 12:30 ART

    const promisedAt = businessHoursService.addBusinessMinutes(start, 60);

    assert.equal(promisedAt.toISOString(), "2026-08-07T20:30:00.000Z"); // 17:30 ART
});

test("moves a repair promise created on Sunday to Monday business hours", () => {
    const start = new Date("2026-08-09T18:00:00.000Z"); // Sunday 15:00 ART

    const promisedAt = businessHoursService.addBusinessMinutes(start, 60);

    assert.equal(promisedAt.toISOString(), "2026-08-10T13:00:00.000Z"); // Monday 10:00 ART
});

test("normalizes a before-opening promise to the Argentina opening time", () => {
    const beforeOpening = new Date("2026-08-10T10:30:00.000Z"); // 07:30 ART

    const normalized = businessHoursService.ensureBusinessHours(beforeOpening);

    assert.equal(normalized.toISOString(), "2026-08-10T12:00:00.000Z"); // 09:00 ART
});
