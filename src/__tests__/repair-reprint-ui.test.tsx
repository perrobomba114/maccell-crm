import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActiveRepairRow } from "../components/repairs/active-repair-row";
import { ActiveRepairCard } from "../components/repairs/active-repair-card";
import type { ActiveRepair } from "../components/repairs/active-repairs-types";

Object.assign(globalThis, { React });

const repair: ActiveRepair = {
    id: "demo", ticketNumber: "DEMO-1", createdAt: "2026-10-10", promisedAt: "2026-10-12",
    deviceBrand: "Equipo", deviceModel: "Demo", problemDescription: "No enciende",
    customer: { name: "Cliente de prueba" }, statusId: 1, status: { name: "Pendiente", color: "blue" },
};
const noop = () => {};

for (const imageCount of [0, 1, 2, 3]) {
    test(`vendor can reprint reception with ${imageCount} intake photos`, () => {
        const html = renderToStaticMarkup(<table><tbody><ActiveRepairRow repair={{ ...repair, deviceImages: Array.from({ length: imageCount }, (_, i) => `/api/uploads/demo-${i}.jpg`) }} position={1} enableTakeover={false} enableManagement={false} enableImageUpload showActionColumn currentUserId="vendor" showIssueSummary={false} onViewDetails={noop} onViewImages={noop} onTakeover={noop} onImageUpload={noop} onAssignment={noop} onTransfer={noop} onPrint={noop} /></tbody></table>);
        assert.match(html, /aria-label="Reimprimir recepción de reparación DEMO-1"/);
        assert.match(html, />Reimprimir<\/button>/);
        if (imageCount < 3) assert.match(html, /aria-label="Cargar fotos para reparación DEMO-1"/);
        else assert.doesNotMatch(html, /aria-label="Cargar fotos para reparación DEMO-1"/);
    });
    test(`mobile vendor has a named reception reprint with ${imageCount} photos`, () => {
        const html = renderToStaticMarkup(<ul><ActiveRepairCard repair={{ ...repair, deviceImages: Array.from({ length: imageCount }, (_, i) => `/api/uploads/demo-${i}.jpg`) }} position={1} enableTakeover={false} enableManagement={false} enableImageUpload currentUserId="vendor" showIssueSummary={false} onViewDetails={noop} onViewImages={noop} onTakeover={noop} onImageUpload={noop} onAssignment={noop} onTransfer={noop} onPrint={noop} /></ul>);
        assert.match(html, /aria-label="Reimprimir recepción de reparación DEMO-1"/);
        assert.match(html, /Reimprimir recepción<\/button>/);
    });
}
