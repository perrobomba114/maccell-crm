import assert from "node:assert/strict";
import test from "node:test";
import { dashboardOrigin, dashboardReturnHref } from "../lib/dashboard-navigation";

test("vuelve a enero de la sucursal original después de cambiar filtros en el detalle", () => {
    const origin = dashboardOrigin(new Date("2027-01-01T12:00:00Z"), "local / 1");
    const url = dashboardReturnHref(origin.get("fromMonth"), origin.get("fromBranch"));
    assert.equal(url, "/admin/dashboard?month=0&year=2027&branchId=local+%2F+1");
});
test("conserva todas las sucursales y evita inventar un origen para enlaces directos", () => {
    assert.equal(dashboardReturnHref("2026-12"), "/admin/dashboard?month=11&year=2026");
    assert.equal(dashboardReturnHref("2026-13"), null);
    assert.equal(dashboardReturnHref(null), null);
});
