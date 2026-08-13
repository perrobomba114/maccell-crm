# POS Price Change Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist an administrator notification for every POS item sold at a price different from its database price, including repeated edits from an original price of zero.

**Architecture:** A pure price-change helper will normalize database prices and build notification content. `saveSaleTransaction` will query the authoritative product or repair price and create administrator notifications inside the same Prisma transaction as the sale; the React POS will preserve zero with nullish coalescing as a client-side defense.

**Tech Stack:** Next.js 15 server actions, React 19, TypeScript, Prisma 6, PostgreSQL, Node test runner through `tsx --test`.

## Global Constraints

- Argentina timezone behavior remains unchanged.
- Do not add `any`, backend `console.log`, polling, or unauthenticated routes.
- Money behavior must have a regression test and the complete test suite must pass before and after the change.
- A confirmed database transaction must contain both the sale and all applicable administrator notification records.
- Notification rendering and sound must not block checkout.

---

### Task 1: Authoritative price-change detection

**Files:**
- Create: `src/actions/pos/price-change-notification.ts`
- Test: `src/__tests__/pos-price-change-notification.test.ts`

**Interfaces:**
- Produces: `PosPriceChangeItem`, `getPriceChangeItems(items)`, and `buildPriceChangeNotificationMessage(vendorName, saleNumber, items)`.
- Consumes: normalized items containing `name`, `price`, `originalPrice`, and optional `priceChangeReason`.

- [ ] **Step 1: Run the existing suite to establish the baseline**

Run: `npm test`
Expected: the current suite passes before critical money code changes.

- [ ] **Step 2: Write failing regression tests**

Create tests that assert zero-to-positive changes remain detectable, unchanged prices are ignored, and a multi-item notification includes only changed items. The test must cover both production examples: `$0 -> $30000` and `$0 -> $95000`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npx tsx --test src/__tests__/pos-price-change-notification.test.ts`
Expected: FAIL because `price-change-notification.ts` does not exist.

- [ ] **Step 4: Implement the pure helper**

Implement strict types, filter on `Math.abs(originalPrice - price) > 0.01`, and build the existing Spanish notification message without database access.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npx tsx --test src/__tests__/pos-price-change-notification.test.ts`
Expected: PASS.

### Task 2: Atomic persistence and zero-preserving UI

**Files:**
- Modify: `src/actions/pos/checkout-db.ts`
- Modify: `src/actions/pos/checkout-notifications.ts`
- Modify: `src/app/vendor/pos/pos-client.tsx:182-188`
- Modify: `src/__tests__/pos-price-change-notification.test.ts`

**Interfaces:**
- Consumes: helpers from `src/actions/pos/price-change-notification.ts`.
- Produces: `saveSaleTransaction` with authoritative `SaleItem.originalPrice` values and atomic administrator `Notification` rows.

- [ ] **Step 1: Add failing source-contract regressions**

Assert that checkout persistence selects `estimatedPrice` for repairs, selects `price` for products, uses normalized prices for `SaleItem.originalPrice`, and creates price-change notifications through the Prisma transaction. Assert that the client uses `originalPrice ?? price` and no longer uses `originalPrice || price` in the override flow.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test src/__tests__/pos-price-change-notification.test.ts`
Expected: FAIL on the current client fallback and missing transactional notification behavior.

- [ ] **Step 3: Normalize prices inside the transaction**

For a product, query the product price in the same transaction. For a repair, extend the existing `findUnique` selection to include `estimatedPrice`. Set `SaleItem.originalPrice` from the database value with an explicit fallback only when the database value is null.

- [ ] **Step 4: Persist administrator notifications atomically**

Collect changed normalized items during the item loop. Before returning from the Prisma callback, query `ADMIN` users and the vendor name through `tx`, then call `tx.notification.createMany` with one row per administrator. Keep negative-stock alerts in the existing post-sale best-effort path and remove the duplicate post-sale price-change branch.

- [ ] **Step 5: Preserve zero in the React override flow**

Replace both comparisons/fallbacks in `pos-client.tsx` with nullish coalescing:

```ts
selectedCartItem.originalPrice ?? selectedCartItem.price
i.originalPrice ?? i.price
```

- [ ] **Step 6: Run focused and complete verification**

Run:

```bash
npx tsx --test src/__tests__/pos-price-change-notification.test.ts
npm test
npx tsc --noEmit
npx eslint --quiet src/actions/pos/checkout-db.ts src/actions/pos/checkout-notifications.ts src/actions/pos/price-change-notification.ts src/app/vendor/pos/pos-client.tsx src/__tests__/pos-price-change-notification.test.ts
git diff --check
npm run build
```

Expected: all commands pass. If an unrelated pre-existing failure appears, record its exact output and keep the change-specific checks passing.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/actions/pos/checkout-db.ts src/actions/pos/checkout-notifications.ts src/actions/pos/price-change-notification.ts src/app/vendor/pos/pos-client.tsx src/__tests__/pos-price-change-notification.test.ts docs/superpowers/plans/2026-08-13-pos-price-change-notification.md
git commit -m "fix(pos): garantizar alertas de cambios de precio"
```
