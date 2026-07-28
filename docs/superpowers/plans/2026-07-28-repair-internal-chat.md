# Repair Internal Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, real-time chat per repair for administrators, same-branch vendors, and the currently assigned technician without creating another database.

**Architecture:** Persist lazy-created conversations, messages, and read cursors in the operational PostgreSQL database. Use authenticated Next.js Route Handlers for commands and queries, plus PostgreSQL `LISTEN/NOTIFY` and a filtered SSE stream for invalidation events; clients refetch authorized records after each event. Mount a focused chat provider and movable widget in the three authenticated layouts.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, `pg`, Zod, SSE/EventSource, Tailwind CSS, shadcn/ui, Lucide, Framer Motion, Node test runner.

---

## File structure

New domain files live under `src/lib/repair-chat/`; each owns one responsibility:

- `contracts.ts`: Zod request schemas, DTOs, limits, and cursor encoding.
- `policy.ts`: role/branch/assignment authorization and active/final state rules.
- `repository.ts`: bounded Prisma queries and transactional writes.
- `realtime.ts`: PostgreSQL notification publisher/listener and local subscribers.
- `media.ts`: secure chat-image conversion, paths, persistence, and cleanup.

New UI files live under `src/components/repair-chat/` and remain below 300 lines:

- `repair-chat-provider.tsx`: reducer, network synchronization, SSE lifecycle, and context.
- `repair-chat-widget.tsx`: movable launcher, compact preview, and responsive panel shell.
- `repair-chat-inbox.tsx`: active/archive tabs, bounded results, search, and conversation selection.
- `repair-chat-thread.tsx`: paged messages, reply state, image viewer, and read details.
- `repair-chat-composer.tsx`: text/image submission with retry-safe client request IDs.
- `repair-chat-message.tsx`: one message bubble and receipt rendering.
- `repair-chat-types.ts`: UI state and API response types.

Existing large components such as `repair-details-dialog.tsx` are not expanded. The provider is mounted only from the three layouts.

### Task 1: Repair-chat policy and status contract

**Files:**
- Create: `src/lib/repair-chat/policy.ts`
- Create: `src/__tests__/repair-chat-policy.test.ts`
- Modify: `src/lib/repairs/status.ts`
- Modify: `docs/superpowers/specs/2026-07-28-repair-internal-chat-design.md`

- [ ] **Step 1: Write failing policy tests**

Create table-driven tests for admin access, same-branch vendor access, cross-branch denial, assigned-technician access, transferred-technician denial, and final-state classification:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { canAccessRepairChat, isRepairChatReadOnly } from "../lib/repair-chat/policy";

test("authorizes chat participants from live repair ownership", () => {
  const repair = { branchId: "branch-a", assignedUserId: "tech-a", statusId: 3 };
  assert.equal(canAccessRepairChat({ id: "admin", role: "ADMIN", branchId: null }, repair), true);
  assert.equal(canAccessRepairChat({ id: "vendor-a", role: "VENDOR", branchId: "branch-a" }, repair), true);
  assert.equal(canAccessRepairChat({ id: "vendor-b", role: "VENDOR", branchId: "branch-b" }, repair), false);
  assert.equal(canAccessRepairChat({ id: "tech-a", role: "TECHNICIAN", branchId: null }, repair), true);
  assert.equal(canAccessRepairChat({ id: "tech-old", role: "TECHNICIAN", branchId: null }, repair), false);
});

test("archives only the operational final statuses", () => {
  for (const statusId of [5, 6, 7, 10]) assert.equal(isRepairChatReadOnly(statusId), true);
  for (const statusId of [1, 2, 3, 4, 8, 9]) assert.equal(isRepairChatReadOnly(statusId), false);
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run: `npm test -- src/__tests__/repair-chat-policy.test.ts`

Expected: FAIL because `src/lib/repair-chat/policy.ts` does not exist.

- [ ] **Step 3: Add named status groups and pure authorization**

Extend the existing status module without changing unrelated legacy labels:

```ts
export const ACTIVE_REPAIR_CHAT_STATUS_IDS = [1, 2, 3, 4, 8, 9] as const;
export const FINAL_REPAIR_CHAT_STATUS_IDS = [5, 6, 7, 10] as const;
```

Implement `canAccessRepairChat`, `isRepairChatReadOnly`, and `canReceiveRepairChatEvent` with discriminated role types. User branch data is normalized from `getCurrentUser().branch?.id`; authorization never uses branch names.

- [ ] **Step 4: Run policy tests**

Run: `npm test -- src/__tests__/repair-chat-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit policy foundation**

```bash
git add src/lib/repairs/status.ts src/lib/repair-chat/policy.ts src/__tests__/repair-chat-policy.test.ts docs/superpowers/specs/2026-07-28-repair-internal-chat-design.md
git commit -m "feat(repairs): definir permisos del chat interno"
```

### Task 2: Prisma persistence and generated client

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260728030000_add_repair_internal_chat/migration.sql`
- Create: `src/__tests__/repair-chat-schema.test.ts`

- [ ] **Step 1: Write a schema regression test**

Read `prisma/schema.prisma` and assert the three models, unique `repairId`, reply relation, idempotent `clientRequestId`, read-cursor compound unique key, cascades, and indexes are present.

- [ ] **Step 2: Run the schema test and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-schema.test.ts`

Expected: FAIL because the models are absent.

- [ ] **Step 3: Add Prisma relations and models**

Add relations to `Repair` and `User`, then add these shapes:

```prisma
model RepairChat {
  id            String                 @id @default(cuid())
  repairId      String                 @unique
  lastMessageAt DateTime               @default(now())
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
  repair        Repair                 @relation(fields: [repairId], references: [id], onDelete: Cascade)
  messages      RepairChatMessage[]
  readCursors   RepairChatReadCursor[]

  @@index([lastMessageAt])
  @@map("repair_chats")
}

model RepairChatMessage {
  id              String              @id @default(cuid())
  chatId          String
  senderId        String
  clientRequestId String
  content         String?
  imageUrls       String[]            @default([])
  replyToId       String?
  createdAt       DateTime            @default(now())
  chat            RepairChat          @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender          User                @relation("RepairChatMessages", fields: [senderId], references: [id])
  replyTo         RepairChatMessage?  @relation("RepairChatReplies", fields: [replyToId], references: [id])
  replies         RepairChatMessage[] @relation("RepairChatReplies")

  @@unique([senderId, clientRequestId])
  @@index([chatId, createdAt])
  @@index([replyToId])
  @@map("repair_chat_messages")
}

model RepairChatReadCursor {
  id         String     @id @default(cuid())
  chatId     String
  userId     String
  lastReadAt DateTime
  updatedAt  DateTime   @updatedAt
  chat       RepairChat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user       User       @relation("RepairChatReadCursors", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([chatId, userId])
  @@index([userId, lastReadAt])
  @@map("repair_chat_read_cursors")
}
```

Create equivalent additive SQL with foreign keys and indexes. Do not delete or transform existing observations.

- [ ] **Step 4: Generate and validate Prisma**

Run: `npx prisma format && npx prisma generate && npx prisma validate`

Expected: all commands exit 0.

- [ ] **Step 5: Run schema tests**

Run: `npm test -- src/__tests__/repair-chat-schema.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit persistence**

```bash
git add prisma/schema.prisma prisma/migrations/20260728030000_add_repair_internal_chat/migration.sql src/__tests__/repair-chat-schema.test.ts
git commit -m "feat(repairs): persistir chats por reparación"
```

### Task 3: Validated contracts and bounded repository

**Files:**
- Create: `src/lib/repair-chat/contracts.ts`
- Create: `src/lib/repair-chat/repository.ts`
- Create: `src/__tests__/repair-chat-contracts.test.ts`
- Create: `src/__tests__/repair-chat-read-state.test.ts`

- [ ] **Step 1: Write failing contract and receipt tests**

Cover trimmed text, text-or-image requirement, maximum 2,000 characters, at most four images, opaque cursor round-trips, and “blue when any other authorized reader reached the message timestamp.”

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-contracts.test.ts src/__tests__/repair-chat-read-state.test.ts`

Expected: FAIL because the contracts do not exist.

- [ ] **Step 3: Implement contracts and DTOs**

Define:

```ts
export const sendRepairChatMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  content: z.string().trim().max(2000).optional(),
  imageUrls: z.array(z.string().min(1).max(300)).max(4).default([]),
  replyToId: z.string().cuid().optional(),
}).refine((value) => Boolean(value.content) || value.imageUrls.length > 0, {
  message: "Escribí un mensaje o adjuntá una imagen",
});
```

Add schemas for list cursors, search terms, message cursors, read timestamps, and image filenames. Export DTOs containing primitive values only.

- [ ] **Step 4: Implement repository boundaries**

Implement methods with exact limits and scoped Prisma `where` clauses:

```ts
listChats(user, { scope, cursor, limit: 20 })
searchRepairs(user, { query, limit: 10 })
listMessages(user, repairId, { before, limit: 30 })
sendMessage(user, repairId, input)
markRead(user, repairId, readAt)
listReaders(user, repairId, messageId)
```

`sendMessage` must re-query the repair, reject final states, verify replies belong to the same chat, upsert the lazy chat, create the message idempotently, and update `lastMessageAt` in one transaction. All selections are narrow and serializable.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/__tests__/repair-chat-contracts.test.ts src/__tests__/repair-chat-read-state.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit repository layer**

```bash
git add src/lib/repair-chat/contracts.ts src/lib/repair-chat/repository.ts src/__tests__/repair-chat-contracts.test.ts src/__tests__/repair-chat-read-state.test.ts
git commit -m "feat(repairs): agregar repositorio seguro de chat"
```

### Task 4: PostgreSQL events and authenticated SSE

**Files:**
- Create: `src/lib/repair-chat/realtime.ts`
- Create: `src/app/api/repair-chats/events/route.ts`
- Create: `src/__tests__/repair-chat-realtime.test.ts`

- [ ] **Step 1: Write event-filtering and source regression tests**

Test that events contain only `eventId`, `type`, `repairId`, `branchId`, `assignedUserId`, and timestamp; verify message content and image paths cannot enter payloads. Add source assertions for `getCurrentUser()`, `runtime = "nodejs"`, SSE headers, abort cleanup, and `LISTEN repair_chat_events`.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-realtime.test.ts`

Expected: FAIL because realtime files are absent.

- [ ] **Step 3: Implement the process-wide realtime bridge**

Cache one `pg.Client`, one typed `EventEmitter`, and connection state on `globalThis`. `ensureRepairChatListener()` connects, executes `LISTEN repair_chat_events`, parses only validated events, and reconnects with bounded backoff. `publishRepairChatEvent()` calls `SELECT pg_notify($1, $2)` after business transactions commit. Logging contains event IDs and error messages only.

- [ ] **Step 4: Implement the SSE route**

Authenticate before opening the stream. Emit `retry: 3000`, subscribe through `subscribeToRepairChatEvents`, filter each event with the pure role/branch/assignment policy, send compact named events, and remove listeners when `request.signal` aborts. Add `Cache-Control: no-cache, no-transform`, `Content-Type: text/event-stream`, `Connection: keep-alive`, and `X-Accel-Buffering: no`.

- [ ] **Step 5: Run realtime tests**

Run: `npm test -- src/__tests__/repair-chat-realtime.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit realtime transport**

```bash
git add src/lib/repair-chat/realtime.ts src/app/api/repair-chats/events/route.ts src/__tests__/repair-chat-realtime.test.ts
git commit -m "feat(repairs): transmitir eventos de chat en tiempo real"
```

### Task 5: Authenticated chat API

**Files:**
- Create: `src/app/api/repair-chats/route.ts`
- Create: `src/app/api/repair-chats/search/route.ts`
- Create: `src/app/api/repair-chats/[repairId]/messages/route.ts`
- Create: `src/app/api/repair-chats/[repairId]/read/route.ts`
- Create: `src/app/api/repair-chats/[repairId]/messages/[messageId]/readers/route.ts`
- Create: `src/__tests__/repair-chat-routes.test.ts`

- [ ] **Step 1: Write route security regression tests**

For every route assert authentication happens before body parsing or repository calls, Zod `safeParse` is used, error responses distinguish `401`, `403`, `400`, and `503`, and `dynamic = "force-dynamic"` is exported.

- [ ] **Step 2: Run route tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-routes.test.ts`

Expected: FAIL because routes are absent.

- [ ] **Step 3: Implement GET list and search routes**

Normalize the current user to `{ id, role, branchId }`, parse URL parameters, and call bounded repository methods. Return `{ items, nextCursor }` for lists and at most ten results for search.

- [ ] **Step 4: Implement message and receipt routes**

GET returns a bounded message page. POST validates input, calls `sendMessage`, then publishes a `message.created` invalidation. PATCH read cursor publishes `chat.read`. The readers route returns only authorized current readers with `{ id, name, readAt }`.

- [ ] **Step 5: Run route tests**

Run: `npm test -- src/__tests__/repair-chat-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit API surface**

```bash
git add src/app/api/repair-chats src/__tests__/repair-chat-routes.test.ts
git commit -m "feat(repairs): exponer api privada de chat"
```

### Task 6: Secure image storage and delivery

**Files:**
- Create: `src/lib/repair-chat/media.ts`
- Create: `src/app/api/repair-chats/[repairId]/images/route.ts`
- Create: `src/app/api/repair-chats/[repairId]/images/[fileName]/route.ts`
- Modify: `src/app/api/uploads/[...path]/route.ts`
- Create: `src/__tests__/repair-chat-media.test.ts`

- [ ] **Step 1: Write failing image security tests**

Test safe filenames, JPEG/PNG/WebP input, conversion through `convertRepairImageForStorage`, 8 MiB source limit, four-file limit, path traversal rejection, access checks before reading files, and explicit rejection of the `repair-chat` prefix in the generic public upload route.

- [ ] **Step 2: Run media tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-media.test.ts`

Expected: FAIL because secure chat media does not exist.

- [ ] **Step 3: Implement media persistence**

Store files under `upload/repair-chat/{repairId}/` with server-generated names and return only the authenticated API URL. Resolve every path against the expected repair directory. Export cleanup for files saved before a failed message write.

- [ ] **Step 4: Implement upload and download routes**

Authenticate and authorize before reading form bodies or filesystem content. Upload returns up to four internal URLs. Download checks the current repair access and streams the file with private cache headers. Update the generic upload route to return `403` for `filePathArray[0] === "repair-chat"`.

- [ ] **Step 5: Run media tests**

Run: `npm test -- src/__tests__/repair-chat-media.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit secure media**

```bash
git add src/lib/repair-chat/media.ts src/app/api/repair-chats src/app/api/uploads/[...path]/route.ts src/__tests__/repair-chat-media.test.ts
git commit -m "feat(repairs): proteger imágenes del chat"
```

### Task 7: Correct technician assignment and publish access changes

**Files:**
- Modify: `src/actions/repairs/take.ts`
- Modify: `src/actions/repairs/tech-assign.ts`
- Create: `src/__tests__/repair-chat-assignment.test.ts`

- [ ] **Step 1: Write failing assignment regression tests**

Read both action files and assert every take path persists `assignedUserId`, uses `REPAIR_STATUS` constants, derives the acting user from `getCurrentUser()`, rejects spoofed technician IDs, and publishes an access-change event only after the transaction succeeds.

- [ ] **Step 2: Run assignment tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-assignment.test.ts`

Expected: FAIL on the current missing assignment and caller-validation behavior.

- [ ] **Step 3: Fix assignment without expanding unsafe patterns**

In `takeRepairAction`, verify the current user is a technician/admin authorized for the requested technician and set `assignedUserId` in the same repair update as the status history. Remove newly touched explicit `any` types and `(tx as any)` by using the generated Prisma client.

In `techTakeRepairAction`, derive the technician from the session, atomically claim only an unassigned repair, set `assignedUserId`, and record history. Transfer publishes an event containing the new assigned technician after the update commits.

- [ ] **Step 4: Run assignment and existing repair tests**

Run: `npm test -- src/__tests__/repair-chat-assignment.test.ts src/__tests__/repair-intake.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit assignment consistency**

```bash
git add src/actions/repairs/take.ts src/actions/repairs/tech-assign.ts src/__tests__/repair-chat-assignment.test.ts
git commit -m "fix(repairs): asignar técnico al tomar reparación"
```

### Task 8: Client state, synchronization, and sound

**Files:**
- Create: `src/components/repair-chat/repair-chat-types.ts`
- Create: `src/components/repair-chat/repair-chat-provider.tsx`
- Create: `src/__tests__/repair-chat-client-state.test.ts`

- [ ] **Step 1: Write reducer and source regression tests**

Test unread-first ordering, deduplication by message ID, preservation of drafts after failure, compact preview queueing, access-revoked removal, active/archive movement, and a single `EventSource`. Assert there is no `setInterval`.

- [ ] **Step 2: Run client-state tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-client-state.test.ts`

Expected: FAIL because provider files do not exist.

- [ ] **Step 3: Implement typed reducer and provider**

Use `useReducer` for inbox, selected repair, messages, draft/reply, previews, connection state, pagination cursors, and pending sends. Open `/api/repair-chats/events` once, refetch only affected conversations on events, mark read when the selected visible thread receives data, and clean up on unmount.

Use the existing `/notificacion.mp3`; handle autoplay rejection by preserving the visual alert and retrying sound only after a later user interaction. Never log message content.

- [ ] **Step 4: Run client-state tests**

Run: `npm test -- src/__tests__/repair-chat-client-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit client state**

```bash
git add src/components/repair-chat/repair-chat-types.ts src/components/repair-chat/repair-chat-provider.tsx src/__tests__/repair-chat-client-state.test.ts
git commit -m "feat(repairs): sincronizar chat interno en cliente"
```

### Task 9: Movable widget, inbox, and conversation UI

**Files:**
- Create: `src/components/repair-chat/repair-chat-widget.tsx`
- Create: `src/components/repair-chat/repair-chat-inbox.tsx`
- Create: `src/components/repair-chat/repair-chat-thread.tsx`
- Create: `src/components/repair-chat/repair-chat-composer.tsx`
- Create: `src/components/repair-chat/repair-chat-message.tsx`
- Create: `src/__tests__/repair-chat-ui.test.ts`

- [ ] **Step 1: Write structural UI tests**

Assert accessible labels, ticket/status display, active/archive tabs, search, unread badges, read-only archive explanation, reply preview, image input restrictions, read-receipt button, safe-area classes, and local position key. Assert every new component remains below 300 lines.

- [ ] **Step 2: Run UI tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-ui.test.ts`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the movable widget shell**

Use Framer Motion drag constraints and edge snapping. Persist `{ xEdge, yRatio }` under `maccell:repair-chat-position:v1`, clamp it after viewport changes, keep a 16 px safe margin, and use a bottom-sheet presentation on narrow screens. The compact preview displays ticket, sender, and a bounded snippet without changing the selected chat.

- [ ] **Step 4: Implement inbox and search**

Render unread conversations first, then recent activity. Provide active/archive tabs, cursor-based “cargar más,” debounced search without timers by using React `useDeferredValue`, and a result action that starts the lazy chat only when the first message is submitted.

- [ ] **Step 5: Implement thread, composer, and receipts**

Render grouped dates with `TIMEZONE`, message replies, authenticated images, sending/error states, and one/two blue checks. The composer accepts text plus up to four images, uploads first, sends with a UUID request ID, and preserves content on failure. Archived threads hide the composer.

- [ ] **Step 6: Run UI tests**

Run: `npm test -- src/__tests__/repair-chat-ui.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit UI**

```bash
git add src/components/repair-chat src/__tests__/repair-chat-ui.test.ts
git commit -m "feat(repairs): agregar burbuja de chat interno"
```

### Task 10: Mount the chat for all authorized roles

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/vendor/vendor-layout-client.tsx`
- Modify: `src/app/technician/layout.tsx`
- Create: `src/__tests__/repair-chat-layouts.test.ts`

- [ ] **Step 1: Write failing layout integration tests**

Assert each authenticated layout renders exactly one `RepairChatProvider`, passes the server-derived `userId`, and does not mount the widget in public or auth layouts.

- [ ] **Step 2: Run layout tests and confirm failure**

Run: `npm test -- src/__tests__/repair-chat-layouts.test.ts`

Expected: FAIL because layouts do not mount the provider.

- [ ] **Step 3: Mount the provider**

Import `RepairChatProvider` and wrap each layout's existing root shell element with `RepairChatProvider`, passing `userId={userId ?? ""}`. Do not add additional polling or duplicate user fetches. While touching admin and technician layouts, remove their existing `console.log` debug statements and avoid introducing new explicit `any`.

- [ ] **Step 4: Run layout and full chat tests**

Run: `npm test -- src/__tests__/repair-chat-*.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit role integration**

```bash
git add src/app/admin/layout.tsx src/app/vendor/vendor-layout-client.tsx src/app/technician/layout.tsx src/__tests__/repair-chat-layouts.test.ts
git commit -m "feat(repairs): habilitar chat para roles internos"
```

### Task 11: Full verification and visual validation

**Files:**
- Modify only if verification exposes a defect in files already introduced by Tasks 1–10.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run Prisma and TypeScript checks**

Run: `npx prisma validate && npx tsc --noEmit`

Expected: both commands exit 0 without new errors.

- [ ] **Step 3: Lint touched TypeScript files and check the diff**

Run:

```bash
CHANGED_TS="$( { git diff HEAD~10 --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet; fi
git diff --check HEAD~10
```

Expected: no lint errors in touched files and no whitespace errors.

- [ ] **Step 4: Build the standalone application**

Run: `npm run build`

Expected: successful Next.js standalone build.

- [ ] **Step 5: Validate the real UI**

Run the local app and verify as administrator, same-branch vendor, assigned technician, cross-branch vendor, and previous technician. Capture and inspect desktop and mobile states for closed bubble, preview, inbox, active thread, images, archived thread, reconnecting state, and revoked access. Fix overflow, contrast, safe-area, drag-bound, or focus issues and repeat screenshots until clean.

- [ ] **Step 6: Confirm deployment compatibility**

Verify the Docker persistent volume includes `/app/upload`, SSE is not buffered by the proxy, and the runtime applies the additive Prisma schema without data loss. Do not create a new database or modify `RAG_DATABASE_URL`.

- [ ] **Step 7: Commit verification fixes**

If verification required changes:

```bash
git add src/lib/repair-chat src/components/repair-chat src/app/api/repair-chats src/app/api/uploads/[...path]/route.ts src/app/admin/layout.tsx src/app/vendor/vendor-layout-client.tsx src/app/technician/layout.tsx src/actions/repairs/take.ts src/actions/repairs/tech-assign.ts src/__tests__/repair-chat-*.test.ts prisma/schema.prisma prisma/migrations/20260728030000_add_repair_internal_chat/migration.sql
git commit -m "fix(repairs): cerrar validación del chat interno"
```

If no changes were required, record the successful commands in the final handoff without creating an empty commit.
