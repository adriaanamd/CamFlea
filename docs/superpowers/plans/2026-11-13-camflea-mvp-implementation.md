# CamFlea MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete CamFlea MVP that preserves the legacy application's user-visible functionality while providing a cohesive, accessible, reference-faithful TanStack Start experience backed by Supabase authority.

**Architecture:** Keep thin TanStack file routes and split the current monolith into feature modules. Public reads use explicit projections; authenticated mutations use typed server functions and narrow Supabase RPCs/RLS. Every user-visible behavior is specified in `camflea-test/` before implementation, with workflow tests serving as the legacy parity contract.

**Tech Stack:** TanStack Start, TanStack Router, React 19, TypeScript, Vitest, Testing Library, Supabase Auth/Postgres/Storage/Realtime, Zod, React Hook Form, Lucide React, Tailwind v4.

## Global Constraints

- All tests must live under `camflea-test/`; do not recreate `src/test/` test files.
- `camflea-legacy/camflea-new-main/` is read-only reference material and must not be imported, bundled, deployed, or edited.
- Preserve legacy CamFlea logo artwork and palette; copy logo files into `camflea-frontend/public/camflea-assets/` when the frontend copy is not byte-identical.
- Use Fraunces for display text and Epilogue for body/interface text, with accessible fallbacks.
- Use the documented CamFlea values `#069210`, `#057a1a`, `#037a12`, `#e8f5e8`, `#d4f3d4`, `#d8f3d8`, and `#dff4df` as the palette foundation.
- Use private listing media, generated object paths, short-lived authorized URLs, and a maximum of five listing photos.
- Use Philippine peso formatting and preserve single, range, and hidden price semantics.
- Keep role authority in `public.user_roles`; never infer staff access from editable profile state or browser-only state.
- Keep transaction state changes atomic and database-authoritative; never use broad participant updates as the primary lifecycle API.
- Preserve user input after recoverable validation/network errors and provide loading, empty, error, unavailable/restricted, stale-data, and success states.
- Do not add fabricated listings, profiles, metrics, notifications, or activity to make a surface appear populated.
- Every TDD task writes a focused failing test, runs it to verify the intended failure, implements the smallest passing behavior, and reruns the affected suite before refactoring.
- Completion gates from `camflea-frontend/` are `bun run lint`, `bun run test`, and `bun run build`; no gate may be skipped or made advisory.

---

### Task 1: Establish the `camflea-test/` architecture and test discovery

**Files:**
- Modify: `camflea-frontend/vitest.config.ts`
- Modify: `camflea-frontend/tsconfig.json`
- Modify: `camflea-frontend/eslint.config.js`
- Modify: `camflea-test/setup.ts`
- Modify: `camflea-test/camflea-workflow.test.ts`
- Modify: `camflea-test/app-routing.test.tsx`
- Create: `camflea-test/unit/domain/camflea-workflow.test.ts`
- Create: `camflea-test/ui/routes/app-routing.test.tsx`
- Create: `.superpowers/sdd/progress.md`

**Interfaces:**
- Produces a Vitest suite that discovers `camflea-test/**/*.{test,spec}.{ts,tsx}` and resolves `@/*` to `camflea-frontend/src/*`.
- Preserves the existing workflow and routing assertions while placing them in the required test tree.

- [ ] **Step 1: Write the failing test**

Add one test that imports the configured Vitest environment from a file under `camflea-test/unit/domain/` and asserts `formatPeso(1250)` returns `₱1,250.00`. Keep the existing behavior tests unchanged in meaning.

- [ ] **Step 2: Run test to verify it fails or is undiscovered**

Run from `camflea-frontend/`:

```text
bun run test -- camflea-test/unit/domain/camflea-workflow.test.ts
```

Expected before configuration: Vitest reports that the file is outside the configured include pattern or cannot resolve the shared setup/alias.

- [ ] **Step 3: Write minimal test configuration**

Set the Vitest test block to:

```ts
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["../camflea-test/setup.ts"],
  include: ["../camflea-test/**/*.{test,spec}.{ts,tsx}"],
},
```

Keep the existing `@` alias pointing at `./src`. Add `camflea-test/**/*.ts` and `camflea-test/**/*.tsx` to TypeScript's include list and ensure ESLint includes both frontend source and the test tree without suppressing test rules.

- [ ] **Step 4: Run test to verify it passes**

Run:

```text
bun run test -- camflea-test/unit/domain/camflea-workflow.test.ts camflea-test/ui/routes/app-routing.test.tsx
```

Expected: the relocated tests are discovered and pass; no `src/test` files are required.

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/vitest.config.ts camflea-frontend/tsconfig.json camflea-frontend/eslint.config.js camflea-test .superpowers/sdd/progress.md
git commit -m "test: establish camflea test architecture"
```

---

### Task 2: Define domain contracts and validation with TDD

**Files:**
- Create: `camflea-frontend/src/lib/domain/listings.ts`
- Create: `camflea-frontend/src/lib/domain/transactions.ts`
- Create: `camflea-frontend/src/lib/validation/listing.ts`
- Create: `camflea-frontend/src/lib/validation/auth.ts`
- Create: `camflea-frontend/src/lib/errors.ts`
- Modify: `camflea-frontend/src/lib/camflea-workflow.ts`
- Create: `camflea-test/unit/domain/listings.test.ts`
- Create: `camflea-test/unit/domain/transactions.test.ts`
- Create: `camflea-test/unit/validation/listing.test.ts`
- Create: `camflea-test/unit/validation/auth.test.ts`
- Create: `camflea-test/unit/errors.test.ts`

**Interfaces:**
- `ListingCategory`, `ListingCondition`, `PriceType`, `ListingStatus`, `TransactionStatus`, and `TransactionAction` are string unions matching the approved legacy values.
- `validateListingInput(input: unknown): ListingInput` returns normalized input or throws a Zod error with field paths.
- `validateAuthInput(input: unknown, mode: "signin" | "signup" | "recovery" | "password-update")` validates the corresponding auth form.
- `allowedTransactionActions(status, actor): TransactionAction[]` returns only actions allowed for the buyer/seller actor.
- `formatPeso(value: number | null | undefined): string` and `formatListingPrice(listing): string` preserve the legacy price semantics.
- `toClientError(error: unknown): { code: string; message: string }` maps Supabase/auth errors to stable safe copy.

- [ ] **Step 1: Write failing tests**

Cover these exact behaviors: required listing title/description/category/condition/meeting place, maximum five photos, single non-negative price, range min/max with `min <= max`, hidden price with no numeric requirement, campus email signup, preserved `formatPeso(null) === "Price hidden"`, and the full transaction action table including cancellation from `cart`, `requested`, `sent`, and `received`.

- [ ] **Step 2: Run focused tests and verify expected failures**

```text
bun run test -- camflea-test/unit/domain camflea-test/unit/validation camflea-test/unit/errors.test.ts
```

Expected: imports for the new contracts fail because the modules do not exist.

- [ ] **Step 3: Implement the smallest domain modules**

Use Zod for input validation. Keep the allowed values in exported readonly arrays so UI filters and server validation share the same source. Implement the state table as pure functions; do not call Supabase from these modules.

- [ ] **Step 4: Run focused tests and the existing workflow suite**

```text
bun run test -- camflea-test/unit/domain camflea-test/unit/validation camflea-test/unit/errors.test.ts camflea-test/camflea-workflow.test.ts
```

Expected: all focused tests pass with no warnings.

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/lib camflea-test/unit
git commit -m "feat: add typed CamFlea domain contracts"
```

---

### Task 3: Harden Supabase schema, roles, storage, and atomic workflows

**Files:**
- Create: `camflea-supabase/migrations/20261113090000_camflea_mvp_hardening.sql`
- Modify: `camflea-frontend/src/integrations/supabase/types.ts`
- Create: `camflea-test/integration/supabase/schema-contract.test.ts`
- Create: `camflea-test/security/authorization-contract.test.ts`
- Create: `camflea-test/security/storage-contract.test.ts`
- Create: `camflea-test/security/transaction-contract.test.ts`

**Interfaces:**
- Add `marketplace_listing_media` with generated path, ordering, MIME type, byte size, upload status, and listing ownership relation.
- Add `marketplace_audit_log` with actor, action, target type/id, reason, metadata summary, and timestamp.
- Add transaction `listing_title_snapshot`, `price_type_snapshot`, `price_snapshot`, `price_min_snapshot`, and `price_max_snapshot` columns.
- Add constraints for allowed listing/transaction values and a unique partial index for active listing reservations.
- Add narrow functions for listing lifecycle, purchase lifecycle, message creation/read state, notification reads, and moderation actions; all derive the actor from `auth.uid()`.

- [ ] **Step 1: Write failing contract tests**

Assert migration text contains the required tables/columns/check constraints, no public storage select policy remains for `camflea-listings`, role changes are not granted to authenticated users, transaction RPCs lock rows and reject invalid actors/states, and notification/message mutation contracts do not accept caller-controlled recipient/sender fields.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/integration/supabase camflea-test/security
```

Expected: the contract tests fail because the hardening migration and required SQL markers are absent.

- [ ] **Step 3: Write the migration**

Use `SECURITY INVOKER` where possible. For any `SECURITY DEFINER` function, set `search_path = public`, revoke public execute, grant only to `authenticated`, and validate `auth.uid()`. Replace broad participant updates with controlled functions or column-specific grants. Keep the storage bucket private and authorize signed URL creation through listing visibility/participation checks.

- [ ] **Step 4: Update generated database types and run checks**

Run the repository's Supabase type-generation command if the CLI is available; otherwise update the generated type contract from the migration and record the exact limitation. Run:

```text
bun run test -- camflea-test/integration/supabase camflea-test/security
bun run build
```

Expected: contract tests pass and the frontend compiles against the new types.

- [ ] **Step 5: Commit**

```text
git add camflea-supabase/migrations camflea-frontend/src/integrations/supabase/types.ts camflea-test/integration/supabase camflea-test/security
git commit -m "feat: harden CamFlea data authorization"
```

---

### Task 4: Build the visual system and responsive application shell

**Files:**
- Copy: `camflea-legacy/camflea-new-main/public/Homepage_images/LOGO_WHITE.png` to `camflea-frontend/public/camflea-assets/logo-white.png`
- Copy: `camflea-legacy/camflea-new-main/public/Login_images/LOGO.png` to `camflea-frontend/public/camflea-assets/logo.png`
- Modify: `camflea-frontend/src/styles.css`
- Modify: `camflea-frontend/src/routes/__root.tsx`
- Create: `camflea-frontend/src/components/app-shell.tsx`
- Create: `camflea-frontend/src/components/navigation.tsx`
- Create: `camflea-frontend/src/components/feedback-state.tsx`
- Create: `camflea-frontend/src/components/status-pill.tsx`
- Create: `camflea-test/ui/components/app-shell.test.tsx`
- Create: `camflea-test/ui/components/feedback-state.test.tsx`
- Create: `camflea-test/ui/accessibility.test.tsx`

**Interfaces:**
- `AppShell` accepts `{ user, unreadCount, isStaff, children }` and renders labeled navigation for browse, sell, transactions, messages, notifications, profile, and authorized admin access.
- `FeedbackState` accepts `kind: "loading" | "empty" | "error" | "restricted" | "unavailable" | "success"` with title, copy, and optional action.
- `StatusPill` renders text status and never relies on color alone.

- [ ] **Step 1: Write failing UI tests**

Assert the shell exposes visible text labels, authenticated links, an accessible notification count, keyboard-visible focus, a staff link only when `isStaff` is true, and reduced-motion CSS. Assert loading/empty/error/restricted states render distinct text.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/components camflea-test/ui/accessibility.test.tsx
```

Expected: the new component imports fail.

- [ ] **Step 3: Implement the shell and CSS system**

Replace default shadcn color tokens with documented CamFlea green variables, add Fraunces/Epilogue font links in root head metadata, set 16–32px radii, add restrained grain via a non-interactive pseudo-element, and define focus/reduced-motion rules. Do not add decorative fake metrics or filler labels.

- [ ] **Step 4: Run focused tests and build**

```text
bun run test -- camflea-test/ui/components camflea-test/ui/accessibility.test.tsx
bun run build
```

Expected: tests pass and the root route compiles without importing legacy runtime code.

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/public/camflea-assets camflea-frontend/src/styles.css camflea-frontend/src/routes/__root.tsx camflea-frontend/src/components camflea-test/ui
git commit -m "feat: add CamFlea visual system and app shell"
```

---

### Task 5: Implement auth, profile, and account-state flows

**Files:**
- Create: `camflea-frontend/src/features/auth/auth-form.tsx`
- Create: `camflea-frontend/src/features/auth/auth-service.ts`
- Create: `camflea-frontend/src/features/profile/profile-page.tsx`
- Create: `camflea-frontend/src/server/auth.server.ts`
- Create: `camflea-frontend/src/server/profile.server.ts`
- Modify: `camflea-frontend/src/routes/auth.tsx`
- Modify: `camflea-frontend/src/routes/profile.tsx`
- Create: `camflea-test/ui/features/auth-form.test.tsx`
- Create: `camflea-test/ui/features/profile-page.test.tsx`
- Create: `camflea-test/integration/server/auth.server.test.ts`
- Create: `camflea-test/integration/server/profile.server.test.ts`

**Interfaces:**
- Auth modes are `signin`, `signup`, `verify`, `recovery`, and `password-update`.
- `AuthForm` emits validated form values and shows safe errors without clearing recoverable input.
- `getOwnProfile` returns the permitted profile projection; `updateOwnProfile` accepts only first name, last name, school, program, year level, profile image, and bio.
- Server auth actions never reveal whether a recovery email exists and reject banned/restricted accounts for protected actions.

- [ ] **Step 1: Write failing tests**

Cover mode-specific labels, campus-email signup validation, recovery copy that does not reveal account existence, password update validation, profile-field allowlisting, missing-profile recovery, and banned-account protected-action denial.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/features/auth-form.test.tsx camflea-test/ui/features/profile-page.test.tsx camflea-test/integration/server/auth.server.test.ts camflea-test/integration/server/profile.server.test.ts
```

- [ ] **Step 3: Implement auth/profile services and pages**

Use Supabase Auth for credential operations, controlled profile trigger/workflow for signup, server-confirmed account status, explicit profile update columns, and visible sign-in/recovery links. Do not store access tokens in arbitrary local storage keys.

- [ ] **Step 4: Run focused tests and build**

```text
bun run test -- camflea-test/ui/features/auth-form.test.tsx camflea-test/ui/features/profile-page.test.tsx camflea-test/integration/server/auth.server.test.ts camflea-test/integration/server/profile.server.test.ts
bun run build
```

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/features/auth camflea-frontend/src/features/profile camflea-frontend/src/server/auth.server.ts camflea-frontend/src/server/profile.server.ts camflea-frontend/src/routes/auth.tsx camflea-frontend/src/routes/profile.tsx camflea-test/ui/features camflea-test/integration/server
git commit -m "feat: implement CamFlea identity and profiles"
```

---

### Task 6: Implement browse, listing detail, listing management, and media

**Files:**
- Create: `camflea-frontend/src/features/browse/browse-page.tsx`
- Create: `camflea-frontend/src/features/browse/filter-rail.tsx`
- Create: `camflea-frontend/src/features/listings/listing-card.tsx`
- Create: `camflea-frontend/src/features/listings/listing-detail.tsx`
- Create: `camflea-frontend/src/features/listings/listing-form.tsx`
- Create: `camflea-frontend/src/features/listings/media-uploader.tsx`
- Create: `camflea-frontend/src/server/listings.server.ts`
- Modify: `camflea-frontend/src/routes/index.tsx`
- Create: `camflea-frontend/src/routes/listing.$listingId.tsx`
- Modify: `camflea-frontend/src/routes/sell.tsx`
- Create: `camflea-test/ui/features/browse-page.test.tsx`
- Create: `camflea-test/ui/features/listing-detail.test.tsx`
- Create: `camflea-test/ui/features/listing-form.test.tsx`
- Create: `camflea-test/integration/server/listings.server.test.ts`
- Create: `camflea-test/security/listing-ownership.test.ts`

**Interfaces:**
- Browse query supports search over title/description/category/meeting place, controlled category and condition filters, and newest/price-low/price-high sorting.
- `ListingCard` shows image, title, price semantics, condition, availability, and seller summary.
- `ListingDetail` shows gallery, description, seller, meeting place, report, message, and purchase actions with unavailable/reserved/sold states.
- `createListing`, `updateListing`, and `deleteListing` accept validated owner-bound input only.
- `uploadListingMedia` accepts at most five allowlisted image files, creates generated paths, records metadata, and cleans orphaned uploads on failure.

- [ ] **Step 1: Write failing tests**

Cover exact legacy categories/conditions, search/filter/sort combinations, empty/loading/error/stale states, price rendering, listing detail actions, owner-only edit/delete, field recovery after errors, five-photo limit, MIME/size rejection, generated storage paths, and no public guessed-path access.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/features/browse-page.test.tsx camflea-test/ui/features/listing-detail.test.tsx camflea-test/ui/features/listing-form.test.tsx camflea-test/integration/server/listings.server.test.ts camflea-test/security/listing-ownership.test.ts
```

- [ ] **Step 3: Implement query, server, and UI modules**

Use explicit selects instead of `select("*")` for protected projections. Use signed URLs only after visibility/participant checks. Keep category rail horizontally scrollable on mobile and provide a compact filter sheet with clear reset.

- [ ] **Step 4: Run focused tests, lint, and build**

```text
bun run test -- camflea-test/ui/features/browse-page.test.tsx camflea-test/ui/features/listing-detail.test.tsx camflea-test/ui/features/listing-form.test.tsx camflea-test/integration/server/listings.server.test.ts camflea-test/security/listing-ownership.test.ts
bun run lint
bun run build
```

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/features/browse camflea-frontend/src/features/listings camflea-frontend/src/server/listings.server.ts camflea-frontend/src/routes/index.tsx camflea-frontend/src/routes/listing.$listingId.tsx camflea-frontend/src/routes/sell.tsx camflea-test/ui/features camflea-test/integration/server/listings.server.test.ts camflea-test/security/listing-ownership.test.ts
git commit -m "feat: implement CamFlea marketplace listings"
```

---

### Task 7: Implement transaction lifecycle and event-backed notifications

**Files:**
- Create: `camflea-frontend/src/features/transactions/transaction-page.tsx`
- Create: `camflea-frontend/src/features/transactions/transaction-row.tsx`
- Create: `camflea-frontend/src/features/notifications/notification-page.tsx`
- Create: `camflea-frontend/src/features/notifications/notification-row.tsx`
- Create: `camflea-frontend/src/server/transactions.server.ts`
- Create: `camflea-frontend/src/server/notifications.server.ts`
- Modify: `camflea-frontend/src/routes/transactions.tsx`
- Modify: `camflea-frontend/src/routes/notifications.tsx`
- Create: `camflea-test/ui/features/transactions.test.tsx`
- Create: `camflea-test/ui/features/notifications.test.tsx`
- Create: `camflea-test/integration/server/transactions.server.test.ts`
- Create: `camflea-test/integration/server/notifications.server.test.ts`
- Create: `camflea-test/workflows/purchase-lifecycle.test.ts`

**Interfaces:**
- `addToCart(listingId)`, `requestPurchase(transactionId)`, and `transitionTransaction(transactionId, action, reason?)` call narrow authoritative RPCs.
- Transaction UI sections are Cart, Currently buying/active hand-offs, and Purchased items/history, matching legacy semantics.
- `listNotifications`, `markNotificationRead`, and `markAllNotificationsRead` operate only on the authenticated recipient.
- Notifications are created only from authorized transaction/domain events.

- [ ] **Step 1: Write failing tests**

Cover the full `cart -> requested -> sent -> received -> completed` journey, cancellation from each active state, self-purchase rejection, duplicate active reservation rejection, snapshot persistence, stale/invalid transition rejection without partial writes, unread count, individual read, and mark-all-read.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/features/transactions.test.tsx camflea-test/ui/features/notifications.test.tsx camflea-test/integration/server/transactions.server.test.ts camflea-test/integration/server/notifications.server.test.ts camflea-test/workflows/purchase-lifecycle.test.ts
```

- [ ] **Step 3: Implement server calls and UI**

Require confirmation for cancellation and other consequential actions. Refresh from server after successful mutation; do not mark a transaction complete optimistically. Reconcile notification reads after Realtime reconnect by reloading the database projection.

- [ ] **Step 4: Run focused tests and build**

```text
bun run test -- camflea-test/ui/features/transactions.test.tsx camflea-test/ui/features/notifications.test.tsx camflea-test/integration/server/transactions.server.test.ts camflea-test/integration/server/notifications.server.test.ts camflea-test/workflows/purchase-lifecycle.test.ts
bun run build
```

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/features/transactions camflea-frontend/src/features/notifications camflea-frontend/src/server/transactions.server.ts camflea-frontend/src/server/notifications.server.ts camflea-frontend/src/routes/transactions.tsx camflea-frontend/src/routes/notifications.tsx camflea-test/ui/features camflea-test/integration/server camflea-test/workflows/purchase-lifecycle.test.ts
git commit -m "feat: implement CamFlea transaction lifecycle"
```

---

### Task 8: Implement participant messaging and realtime-safe read state

**Files:**
- Create: `camflea-frontend/src/features/messages/message-page.tsx`
- Create: `camflea-frontend/src/features/messages/conversation-list.tsx`
- Create: `camflea-frontend/src/features/messages/message-thread.tsx`
- Create: `camflea-frontend/src/features/messages/message-composer.tsx`
- Create: `camflea-frontend/src/server/messages.server.ts`
- Modify: `camflea-frontend/src/routes/messages.tsx`
- Create: `camflea-test/ui/features/messages.test.tsx`
- Create: `camflea-test/integration/server/messages.server.test.ts`
- Create: `camflea-test/security/message-privacy.test.ts`
- Create: `camflea-test/workflows/messaging.test.ts`

**Interfaces:**
- `listConversations(userId)`, `listThread(participantId, listingId?)`, `sendMessage({ recipientId, listingId, body, attachments })`, and `markThreadRead(threadId)` derive sender/recipient identity from the authenticated session and validate listing context.
- Message body length, attachment MIME/size allowlist, and rate-limit boundaries are centralized in validation.
- Realtime is a refresh hint only; the authorized database query remains the source of truth.

- [ ] **Step 1: Write failing tests**

Cover participant-only reads, unrelated-user denial, sender/recipient tampering rejection, listing-linked message validation, body limits, attachment allowlist, recipient-only read updates, send error/retry UI, mobile pane back navigation, and realtime reconnect reload behavior.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/features/messages.test.tsx camflea-test/integration/server/messages.server.test.ts camflea-test/security/message-privacy.test.ts camflea-test/workflows/messaging.test.ts
```

- [ ] **Step 3: Implement server and UI**

Render message bodies as text, never unsanitized HTML. Support the legacy page's image/video attachment behavior only through generated private paths and validated media metadata. Show listing context and participant identity in the thread.

- [ ] **Step 4: Run focused tests and build**

```text
bun run test -- camflea-test/ui/features/messages.test.tsx camflea-test/integration/server/messages.server.test.ts camflea-test/security/message-privacy.test.ts camflea-test/workflows/messaging.test.ts
bun run build
```

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/features/messages camflea-frontend/src/server/messages.server.ts camflea-frontend/src/routes/messages.tsx camflea-test/ui/features/messages.test.tsx camflea-test/integration/server/messages.server.test.ts camflea-test/security/message-privacy.test.ts camflea-test/workflows/messaging.test.ts
git commit -m "feat: implement private CamFlea messaging"
```

---

### Task 9: Implement reporting, moderation, audit log, and staff routes

**Files:**
- Create: `camflea-frontend/src/features/admin/admin-shell.tsx`
- Create: `camflea-frontend/src/features/admin/report-queue.tsx`
- Create: `camflea-frontend/src/features/admin/listing-moderation.tsx`
- Create: `camflea-frontend/src/features/admin/user-management.tsx`
- Create: `camflea-frontend/src/features/admin/transaction-monitoring.tsx`
- Create: `camflea-frontend/src/features/admin/analytics.tsx`
- Create: `camflea-frontend/src/server/moderation.server.ts`
- Modify: `camflea-frontend/src/routes/admin.tsx`
- Create: `camflea-frontend/src/routes/admin.users.tsx`
- Create: `camflea-frontend/src/routes/admin.listings.tsx`
- Create: `camflea-frontend/src/routes/admin.transactions.tsx`
- Create: `camflea-frontend/src/routes/admin.reports.tsx`
- Create: `camflea-frontend/src/routes/admin.analytics.tsx`
- Create: `camflea-test/ui/features/admin.test.tsx`
- Create: `camflea-test/integration/server/moderation.server.test.ts`
- Create: `camflea-test/security/admin-authorization.test.ts`
- Create: `camflea-test/workflows/report-review.test.ts`

**Interfaces:**
- Student report submission accepts a required reason, optional details, listing/user target, and authenticated reporter only.
- Staff actions are independently authorized for moderator/admin roles: review report, hide/restore listing, restrict/ban account, and inspect minimized transaction exceptions.
- Aggregate analytics exclude private message content and protected profile fields.
- Every staff mutation records an audit row with actor, action, target, reason, safe metadata, and timestamp.

- [ ] **Step 1: Write failing tests**

Cover report validation, reporter ownership, anonymous denial, moderator/admin action matrix, student denial, role assignment denial through profile forms, audit record creation, minimized staff projections, responsive queue states, and pagination boundaries.

- [ ] **Step 2: Run tests and verify they fail**

```text
bun run test -- camflea-test/ui/features/admin.test.tsx camflea-test/integration/server/moderation.server.test.ts camflea-test/security/admin-authorization.test.ts camflea-test/workflows/report-review.test.ts
```

- [ ] **Step 3: Implement moderation server functions and routes**

Replace the current hard-coded/incorrect admin guard with an authenticated role result. Never expose the legacy debug tables endpoint. Hide fields and controls outside each staff member's role.

- [ ] **Step 4: Run focused tests and build**

```text
bun run test -- camflea-test/ui/features/admin.test.tsx camflea-test/integration/server/moderation.server.test.ts camflea-test/security/admin-authorization.test.ts camflea-test/workflows/report-review.test.ts
bun run lint
bun run build
```

- [ ] **Step 5: Commit**

```text
git add camflea-frontend/src/features/admin camflea-frontend/src/server/moderation.server.ts camflea-frontend/src/routes/admin* camflea-test/ui/features/admin.test.tsx camflea-test/integration/server/moderation.server.test.ts camflea-test/security/admin-authorization.test.ts camflea-test/workflows/report-review.test.ts
git commit -m "feat: implement CamFlea moderation and admin workflows"
```

---

### Task 10: Replace the monolithic composition, finish parity routes, and add CI gates

**Files:**
- Modify: `camflea-frontend/src/components/camflea-app.tsx`
- Modify: `camflea-frontend/src/routes/index.tsx`
- Modify: `camflea-frontend/src/routes/auth.tsx`
- Modify: `camflea-frontend/src/routes/sell.tsx`
- Modify: `camflea-frontend/src/routes/transactions.tsx`
- Modify: `camflea-frontend/src/routes/messages.tsx`
- Modify: `camflea-frontend/src/routes/notifications.tsx`
- Modify: `camflea-frontend/src/routes/profile.tsx`
- Modify: `camflea-frontend/src/routes/admin.tsx`
- Modify: `camflea-frontend/src/routeTree.gen.ts` through the normal TanStack route generation command
- Create: `.github/workflows/ci.yml`
- Create: `camflea-test/workflows/legacy-parity.test.tsx`
- Create: `camflea-test/workflows/anonymous-browse.test.tsx`
- Create: `camflea-test/workflows/authenticated-marketplace.test.tsx`
- Create: `camflea-test/workflows/staff-access.test.tsx`
- Create: `camflea-test/security/no-service-role-browser-bundle.test.ts`

**Interfaces:**
- All public routes compose the focused feature components and no longer depend on the unrelated-domain monolith.
- `/listing/$listingId`, `/admin/users`, `/admin/listings`, `/admin/transactions`, `/admin/reports`, and `/admin/analytics` are routable and role-aware.
- CI runs frontend install from `camflea-frontend/`, then lint, tests, build, and Supabase validation with explicit working directories.

- [ ] **Step 1: Write failing parity and CI tests**

Assert all required routes match, legacy standard labels remain present, anonymous browse works without auth, protected actions require auth, staff access is role-confirmed, and built frontend output contains no service-role key or legacy runtime imports.

- [ ] **Step 2: Run tests and verify gaps**

```text
bun run test -- camflea-test/workflows camflea-test/security/no-service-role-browser-bundle.test.ts
```

Expected: missing routes/compositions and current service/bundle violations fail with actionable messages.

- [ ] **Step 3: Implement composition and workflow coverage**

Remove only code that is no longer referenced after the feature modules are wired. Preserve existing user changes in `camflea-test/`; do not restore deleted `src/test` files. Generate the route tree through the project's supported command rather than hand-editing generated output.

- [ ] **Step 4: Add and validate CI**

Use a lockfile-keyed Bun setup and explicit commands:

```yaml
- run: bun install --frozen-lockfile
  working-directory: camflea-frontend
- run: bun run lint
  working-directory: camflea-frontend
- run: bun run test
  working-directory: camflea-frontend
- run: bun run build
  working-directory: camflea-frontend
```

Add Supabase CLI setup with `--workdir camflea-supabase`; preserve failing lanes as required checks and upload diagnostics without turning artifact collection into a second failure.

- [ ] **Step 5: Run the full local gate**

```text
bun run lint
bun run test
bun run build
```

Run Supabase migration validation if the CLI is available and report remote GitHub Actions status separately from local evidence.

- [ ] **Step 6: Commit**

```text
git add camflea-frontend/src camflea-test .github/workflows/ci.yml
git commit -m "feat: complete CamFlea MVP composition and CI gates"
```

---

## Plan self-review

- PRD coverage: identity/profile (Task 5), browse/listings/media (Task 6), transaction lifecycle (Task 7), messaging (Task 8), notifications (Task 7), reporting/moderation/admin (Task 9), design system/shell/accessibility (Task 4), server/RLS/storage/security (Task 3), test architecture/CI (Tasks 1 and 10), and legacy parity (Task 10).
- Deferred by approved scope: migration tooling and AI assistant.
- No test file is placed outside `camflea-test/`.
- Every production behavior task begins with focused failing tests and ends with focused verification.
- The plan does not modify the legacy reference tree.
- The route file list is explicit; `routeTree.gen.ts` is updated only by the project's supported route generator.

