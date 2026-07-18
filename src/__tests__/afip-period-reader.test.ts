import assert from "node:assert/strict";
import test from "node:test";

import { readAfipVoucherPeriod, type AfipVoucherPeriodService } from "../actions/afip-voucher-period-reader";

function createService(voucherCount: number, failAt?: number): AfipVoucherPeriodService {
    return {
        async getLastVoucher() {
            return { cbteNro: voucherCount };
        },
        async getVoucherInfo(voucherNumber) {
            if (voucherNumber === failAt) {
                throw new Error("temporary ARCA failure");
            }

            const dayOffset = voucherNumber - 1;
            const date = new Date(Date.UTC(2026, 5, 1 + dayOffset));
            const dateKey = [
                date.getUTCFullYear(),
                String(date.getUTCMonth() + 1).padStart(2, "0"),
                String(date.getUTCDate()).padStart(2, "0"),
            ].join("");

            return {
                codAutorizacion: String(voucherNumber).padStart(14, "0"),
                cbteFch: dateKey,
                impTotal: 121,
                impNeto: 100,
                impIVA: 21,
            };
        },
    };
}

test("ARCA period reads every voucher in the requested month without a 120 limit", async () => {
    const result = await readAfipVoucherPeriod({
        service: createService(184),
        entity: "MACCELL",
        salesPoint: 10,
        voucherType: 6,
        startDate: new Date("2026-07-01T03:00:00.000Z"),
        endDate: new Date("2026-08-01T02:59:59.999Z"),
    });

    assert.equal(result.complete, true);
    assert.equal(result.summary.count, 31);
    assert.equal(result.summary.totalAmount, 3751);
    assert.equal(result.queriedVouchers.length, 31);
    assert.deepEqual(
        [result.queriedVouchers[0]?.voucherNumber, result.queriedVouchers.at(-1)?.voucherNumber],
        [31, 61]
    );
});

test("ARCA period is incomplete when a voucher lookup fails", async () => {
    const result = await readAfipVoucherPeriod({
        service: createService(61, 45),
        entity: "8BIT",
        salesPoint: 3,
        voucherType: 6,
        startDate: new Date("2026-07-01T03:00:00.000Z"),
        endDate: new Date("2026-08-01T02:59:59.999Z"),
    });

    assert.equal(result.complete, false);
    assert.deepEqual(result.failedVoucherNumbers, [45]);
    assert.equal(result.summary.count, 30);
});

test("ARCA period stops a lookup that exceeds its request timeout", async () => {
    const result = await readAfipVoucherPeriod({
        service: {
            async getLastVoucher() {
                return { cbteNro: 1 };
            },
            async getVoucherInfo() {
                return new Promise(() => undefined);
            },
        },
        entity: "MACCELL",
        salesPoint: 10,
        voucherType: 6,
        startDate: new Date("2026-07-01T03:00:00.000Z"),
        endDate: new Date("2026-08-01T02:59:59.999Z"),
        lookupTimeoutMs: 10,
    });

    assert.equal(result.complete, false);
    assert.deepEqual(result.failedVoucherNumbers, [1]);
});
