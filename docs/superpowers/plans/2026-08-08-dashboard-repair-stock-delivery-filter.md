# Dashboard Repair Stock Delivery Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude delivered repairs from the dashboard's “Stock de Reparaciones” chart while preserving completed-OK repairs that have not been sold.

**Architecture:** Define the Prisma eligibility filter in a focused statistics policy module and consume it from the existing branch aggregation. Treat either delivery status `10` or a linked `SaleItem` as evidence that the device left branch stock.

**Tech Stack:** TypeScript, Next.js 15 Server Actions, Prisma 6, Node test runner through `tsx --test`.

## Global Constraints

- Use `REPAIR_STATUS.DELIVERED`; do not add a numeric status literal.
- Do not add `any`, `console.log`, schema changes, data migrations, or UI changes.
- A completed-OK repair without a linked sale remains in the chart.
- A repair with a linked sale is excluded even if its status is still completed OK.
- A status-10 repair is excluded even if no linked sale exists.
- Run the MACCELL production-safety verification gate before completion.

---

### Task 1: Encode and apply repair-stock eligibility

**Files:**
- Create: `src/actions/statistics/repair-stock-policy.ts`
- Modify: `src/actions/statistics/branches.ts:1-38`
- Test: `src/__tests__/dashboard-repair-stock-policy.test.ts`

**Interfaces:**
- Consumes: `REPAIR_STATUS.DELIVERED` from `src/lib/repairs/status.ts` and Prisma's `RepairWhereInput` type.
- Produces: `buildRepairStockWhere(): Prisma.RepairWhereInput`, used as the `where` argument of `prisma.repair.groupBy`.

- [ ] **Step 1: Write the failing policy test**

Create `src/__tests__/dashboard-repair-stock-policy.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildRepairStockWhere } from "@/actions/statistics/repair-stock-policy";
import { REPAIR_STATUS } from "@/lib/repairs/status";

test("repair stock excludes delivered statuses and repairs linked to a sale", () => {
    assert.deepEqual(buildRepairStockWhere(), {
        statusId: { not: REPAIR_STATUS.DELIVERED },
        saleItems: { none: {} },
    });
});
```

This test catches either delivery signal being removed from the dashboard query policy. Its expected value is literal and independent from the production builder.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx tsx --test src/__tests__/dashboard-repair-stock-policy.test.ts
```

Expected: FAIL because `src/actions/statistics/repair-stock-policy.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed query policy**

Create `src/actions/statistics/repair-stock-policy.ts`:

```ts
import type { Prisma } from "@prisma/client";

import { REPAIR_STATUS } from "@/lib/repairs/status";

export function buildRepairStockWhere(): Prisma.RepairWhereInput {
    return {
        statusId: { not: REPAIR_STATUS.DELIVERED },
        saleItems: { none: {} },
    };
}
```

- [ ] **Step 4: Apply the policy to the branch aggregation**

In `src/actions/statistics/branches.ts`, import the builder:

```ts
import { buildRepairStockWhere } from "@/actions/statistics/repair-stock-policy";
```

Replace the current repair `groupBy` filter:

```ts
where: buildRepairStockWhere(),
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npx tsx --test src/__tests__/dashboard-repair-stock-policy.test.ts
```

Expected: one passing test with no warnings or errors.

- [ ] **Step 6: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Run the MACCELL safety gate**

Run:

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Expected: TypeScript, lint of changed TypeScript files, `git diff --check`, build, and tests pass. If the script does not execute one of these checks, run that check manually and report its exact result.

- [ ] **Step 8: Review the final diff and commit**

Run:

```bash
git diff --check
git diff -- src/actions/statistics/repair-stock-policy.ts src/actions/statistics/branches.ts src/__tests__/dashboard-repair-stock-policy.test.ts
git add src/actions/statistics/repair-stock-policy.ts src/actions/statistics/branches.ts src/__tests__/dashboard-repair-stock-policy.test.ts docs/superpowers/plans/2026-08-08-dashboard-repair-stock-delivery-filter.md
git commit -m "fix(admin): excluir reparaciones entregadas del stock"
```

Expected: only the policy, its branch-query integration, its regression test, and this implementation plan are committed.
