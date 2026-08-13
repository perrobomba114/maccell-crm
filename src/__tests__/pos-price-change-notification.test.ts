import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    buildPriceChangeNotificationMessage,
    getPriceChangeItems,
} from "../actions/pos/price-change-notification";

const checkoutDbSource = readFileSync(
    new URL("../actions/pos/checkout-db.ts", import.meta.url),
    "utf8",
);
const checkoutNotificationsSource = readFileSync(
    new URL("../actions/pos/checkout-notifications.ts", import.meta.url),
    "utf8",
);
const posClientSource = readFileSync(
    new URL("../app/vendor/pos/pos-client.tsx", import.meta.url),
    "utf8",
);

test("detects price changes from zero for first and repeated POS edits", () => {
    const changes = getPriceChangeItems([
        {
            name: "Ticket #MAC2-00001788",
            price: 30_000,
            originalPrice: 0,
            priceChangeReason: "bateria",
        },
        {
            name: "Ticket #8BIT-00000259",
            price: 95_000,
            originalPrice: 0,
            priceChangeReason: "bat + soft",
        },
    ]);

    assert.equal(changes.length, 2);
    assert.equal(changes[0].originalPrice, 0);
    assert.equal(changes[1].originalPrice, 0);
});

test("ignores unchanged prices and lists only changed items in the admin message", () => {
    const changes = getPriceChangeItems([
        { name: "Sin cambio", price: 10_000, originalPrice: 10_000 },
        { name: "Ticket #8BIT-00000259", price: 95_000, originalPrice: 0, priceChangeReason: "bat + soft" },
    ]);

    assert.equal(changes.length, 1);
    const message = buildPriceChangeNotificationMessage("Lautaro Romero", "SALE-123", changes);
    assert.match(message, /Ticket #8BIT-00000259: \$0 -> \$95000 \(bat \+ soft\)/);
    assert.doesNotMatch(message, /Sin cambio/);
});

test("persists authoritative price changes and admin notifications in the sale transaction", () => {
    assert.match(checkoutDbSource, /select:\s*\{[\s\S]*?estimatedPrice:\s*true/);
    assert.match(checkoutDbSource, /tx\.product\.findUnique/);
    assert.match(checkoutDbSource, /tx\.notification\.createMany/);
    assert.match(checkoutDbSource, /originalPrice:\s*authoritativeOriginalPrice/);
    assert.doesNotMatch(checkoutNotificationsSource, /Cambio de Precio Detectado/);
});

test("preserves a zero original price through repeated client edits", () => {
    assert.match(posClientSource, /selectedCartItem\.originalPrice \?\? selectedCartItem\.price/);
    assert.match(posClientSource, /i\.originalPrice \?\? i\.price/);
    assert.doesNotMatch(posClientSource, /originalPrice \|\|/);
});
