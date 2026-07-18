import assert from "node:assert/strict";
import test from "node:test";

import { recoverAuthorizedVoucher } from "../lib/afip-voucher-recovery";

test("recovers the authorized voucher number from ARCA without issuing again", async () => {
    const recovered = await recoverAuthorizedVoucher({
        async getLastVoucher() {
            return { cbteNro: 3511 };
        },
        async getVoucherInfo() {
            return { codAutorizacion: "86294365425343", fchVto: "20260727" };
        },
    }, 3, 6, "86294365425343");

    assert.deepEqual(recovered, { voucherNumber: 3511, caeExpiresAt: "20260727" });
});

test("does not attach a different last voucher to the authorized CAE", async () => {
    await assert.rejects(
        recoverAuthorizedVoucher({
            async getLastVoucher() {
                return { cbteNro: 3512 };
            },
            async getVoucherInfo() {
                return { codAutorizacion: "different-cae", fchVto: "20260727" };
            },
        }, 3, 6, "86294365425343"),
        /no coincide/i
    );
});
