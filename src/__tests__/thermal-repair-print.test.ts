import assert from "node:assert/strict";
import test from "node:test";
import { getRollPageHeightMm, printHtml, SHARED_CSS } from "../lib/printing/core";
import { REPAIR_DATA_RESPONSIBILITY_TERMS } from "../lib/printing/repair-terms";

test("roll paper follows receipt height with space for the cutter", () => {
    assert.equal(getRollPageHeightMm(960), 256);
    assert.equal(getRollPageHeightMm(1920), 510);
    assert.ok(getRollPageHeightMm(1920) > getRollPageHeightMm(960));
    assert.doesNotMatch(SHARED_CSS, /size: 80mm auto/);
    assert.match(SHARED_CSS, /box-sizing: border-box/);
});

test("print waits for document load and sends measured paper dimensions", () => {
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalTimeout = globalThis.setTimeout;
    const styles: { textContent?: string }[] = [];
    const timers: (() => void)[] = [];
    let printed = false;
    let loadWasRegistered = false;
    const doc = {
        body: { scrollHeight: 1920, getBoundingClientRect: () => ({ height: 1920 }) },
        head: { appendChild: (style: { textContent?: string }) => styles.push(style) },
        createElement: () => ({ textContent: "" }),
        open: () => {}, write: () => { loadWasRegistered = typeof iframe.onload === "function"; },
        close: () => iframe.onload?.(),
    };
    const iframe = { style: {} as Record<string, string>, onload: undefined as (() => void) | undefined, contentWindow: { document: doc, focus: () => {}, print: () => { printed = true; } } };
    Object.assign(globalThis, {
        document: { createElement: () => iframe, body: { appendChild: () => {}, contains: () => true, removeChild: () => {} } },
        window: { focus: () => {} },
        setTimeout: (callback: () => void) => { timers.push(callback); return 1; },
    });
    try {
        printHtml("<html><body>Prueba</body></html>", { rollWidthMm: 80 });
        assert.equal(loadWasRegistered, true);
        assert.equal(printed, false);
        timers[0]();
        assert.equal(printed, true);
        assert.equal(iframe.style.width, "80mm");
        assert.match(styles[0].textContent!, /@page \{ size: 80mm 510mm; margin: 0; \}/);
    } finally {
        Object.assign(globalThis, { document: originalDocument, window: originalWindow, setTimeout: originalTimeout });
    }
});

test("reception reprint is available in every repair status without printing a warranty", async () => {
    const { printRepairReceptionTicket } = await import("../lib/repair-print-sequence");
    const { REPAIR_STATUS } = await import("../lib/repairs/status");
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalTimeout = globalThis.setTimeout;
    const originalNow = Date.now;
    const receipts: string[] = [];
    let now = originalNow();
    Object.assign(globalThis, {
        document: {
            createElement: () => ({ style: {}, contentWindow: { document: { open: () => {}, write: (html: string) => receipts.push(html), close: () => {} } } }),
            body: { appendChild: () => {} },
        },
        window: { location: { origin: "https://example.test" } },
        setTimeout: () => 1,
    });
    Date.now = () => now += 1000;
    try {
        for (const statusId of Object.values(REPAIR_STATUS)) {
            const before = receipts.length;
            const problemDescription = "Descripción extensa de recepción. ".repeat(24);
            printRepairReceptionTicket({ ticketNumber: `DEMO-${statusId}`, statusId, customer: { name: "Cliente" }, deviceBrand: "Equipo", deviceModel: "Prueba", problemDescription });
            assert.equal(receipts.length, before + 1);
            assert.match(receipts.at(-1)!, /Comprobante de Reparación/);
            assert.match(receipts.at(-1)!, /Firma del Cliente \/ Aceptación/);
            assert.ok(receipts.at(-1)!.includes(problemDescription), "The complete diagnosis is printed without truncation");
            assert.ok(receipts.at(-1)!.includes(REPAIR_DATA_RESPONSIBILITY_TERMS));
            assert.match(receipts.at(-1)!, /\.receipt-terms \{[^}]*font-size: 11px/);
            assert.match(receipts.at(-1)!, /\.receipt-signature \{ padding-top: 10mm/);
            assert.match(receipts.at(-1)!, /class="receipt-acceptance"/);
            assert.doesNotMatch(receipts.at(-1)!, /Certificado de Garantía|margin-top: 200px/);
        }
    } finally {
        Date.now = originalNow;
        Object.assign(globalThis, { document: originalDocument, window: originalWindow, setTimeout: originalTimeout });
    }
});
