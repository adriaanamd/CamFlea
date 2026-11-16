# User Moderation Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unlimited warnings, manual or expiring restrictions, permanent bans with a legacy-inspired blocking modal, server-enforced marketplace permissions, and database-backed per-user statistics to CamFlea.

**Architecture:** Extend `public.marketplace_account_status` with an optional restriction expiration and centralize effective-status resolution in Supabase functions. Authenticated TanStack server functions remain the only frontend path for moderation mutations, while RLS/RPC guards enforce restricted and banned permissions independently of browser state. The admin workspace receives aggregate statistics with each user record, and the authenticated shell provides account-status context to the marketplace UI.

**Tech Stack:** TanStack Start, React 19, TypeScript, Vitest, Testing Library, Supabase PostgreSQL migrations/RPC/RLS, Zod, Radix Alert Dialog, lucide-react.

## Global Constraints

- Keep the marketplace in the existing TanStack Start React app; use authenticated TanStack server functions and Supabase RLS/RPC for internal actions because this host does not run Supabase Edge Functions as its application server.
- Keep marketplace roles in `public.user_roles`, separate from editable student profiles, and authorize staff actions from Supabase rather than browser state.
- Run frontend commands with `camflea-frontend/` as the working directory.
- Run Supabase CLI commands with `--workdir camflea-supabase`.
- Treat repository CI scripts and local lint/test/build checks as blocking quality gates.
- The legacy tree is read-only and must not be bundled or modified.
- Write each test before its production implementation, run the failing test, then implement the minimum passing behavior.
- Work inline on `main`; finish every task with one non-empty commit. The task sequence intentionally produces more than the requested minimum of 30 commits.
- Do not use focused tests, skipped tests, weakened assertions, or disabled quality gates.

## File map

Create or modify only these responsibilities:

- `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`: schema, effective-status helpers, admin moderation RPCs, statistics projection, and marketplace enforcement.
- `camflea-frontend/src/integrations/supabase/types.ts`: generated-contract additions for the new columns and functions.
- `camflea-frontend/src/lib/domain/account-status.ts`: shared status types and pure effective-status/presentation helpers.
- `camflea-frontend/src/features/admin/admin-actions.ts` and `admin-actions.server.ts`: validated moderation input and RPC adapters.
- `camflea-frontend/src/features/admin/admin-dashboard-data.ts`: admin user statistics and restriction fields.
- `camflea-frontend/src/features/admin/admin-user-management.tsx`: focused user directory, stats, filters, and moderation controls extracted from the large dashboard file.
- `camflea-frontend/src/features/admin/restrict-user-action.tsx`: duration/reason confirmation control.
- `camflea-frontend/src/components/account-status-context.tsx`: authenticated account-status provider and hook.
- `camflea-frontend/src/components/account-status-banner.tsx`: restricted-account explanation and expiry display.
- `camflea-frontend/src/components/banned-account-modal.tsx`: blocking banned-user dialog and sign-out action.
- `camflea-frontend/src/components/camflea-page-shell.tsx`: status loading and account-status gate integration.
- `camflea-frontend/src/features/listings/listing-form.tsx`, `listing-detail.tsx`, and `src/features/messages/message-page.tsx` / `message-thread.tsx`: client-side disabled states.
- `camflea-test/unit/account-status.test.ts`, `integration/supabase/user-moderation-contract.test.ts`, and focused UI/server tests: red-green coverage for the new behavior.

---

### Task 1: Add failing pure account-status tests

**Files:**
- Create: `camflea-test/unit/account-status.test.ts`
- Read: `camflea-frontend/src/lib/domain/account-status.ts` (does not exist yet)

**Interfaces:**
- Produces the required behavior for `effectiveAccountStatus(status, restrictionExpiresAt, now)` and `canUseMarketplace(status)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { canUseMarketplace, effectiveAccountStatus } from "@/lib/domain/account-status";

describe("account status", () => {
  it("treats an expired restriction as active", () => {
    expect(
      effectiveAccountStatus("restricted", "2026-01-01T00:00:00.000Z", new Date("2026-01-02T00:00:00.000Z")),
    ).toBe("active");
  });

  it("keeps a future restriction restricted", () => {
    expect(
      effectiveAccountStatus("restricted", "2026-01-03T00:00:00.000Z", new Date("2026-01-02T00:00:00.000Z")),
    ).toBe("restricted");
  });

  it("never expires a ban", () => {
    expect(effectiveAccountStatus("banned", null, new Date("2026-01-02T00:00:00.000Z"))).toBe("banned");
  });

  it("only allows active users to mutate the marketplace", () => {
    expect(canUseMarketplace("active")).toBe(true);
    expect(canUseMarketplace("restricted")).toBe(false);
    expect(canUseMarketplace("banned")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/account-status.test.ts`

Expected: FAIL because `@/lib/domain/account-status` is not defined.

- [ ] **Step 3: Commit**

```bash
git add camflea-test/unit/account-status.test.ts
git commit -m "test: define account status behavior"
```

### Task 2: Implement account-status domain helpers

**Files:**
- Create: `camflea-frontend/src/lib/domain/account-status.ts`

**Interfaces:**
- Produces `AccountStatus = "active" | "restricted" | "banned"`.
- Produces `effectiveAccountStatus(status, restrictionExpiresAt, now): AccountStatus`.
- Produces `canUseMarketplace(status): boolean`.

- [ ] **Step 1: Write minimal implementation**

```ts
export type AccountStatus = "active" | "restricted" | "banned";

export function effectiveAccountStatus(
  status: AccountStatus,
  restrictionExpiresAt: string | null | undefined,
  now = new Date(),
): AccountStatus {
  if (status !== "restricted" || !restrictionExpiresAt) return status;
  return new Date(restrictionExpiresAt).getTime() <= now.getTime() ? "active" : "restricted";
}

export function canUseMarketplace(status: AccountStatus) {
  return status === "active";
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/account-status.test.ts`

Expected: PASS with 4 tests.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/lib/domain/account-status.ts camflea-test/unit/account-status.test.ts
git commit -m "feat: add account status domain helpers"
```

### Task 3: Add failing moderation-input tests

**Files:**
- Create: `camflea-test/unit/admin-moderation-input.test.ts`

**Interfaces:**
- Defines the required accepted and rejected shapes for warning and account-status moderation payloads.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { adminAccountStatusInputSchema, adminUserActionInputSchema } from "@/features/admin/admin-actions";

const userId = "00000000-0000-4000-8000-000000000001";

describe("admin moderation input", () => {
  it("accepts an indefinite restriction", () => {
    expect(adminAccountStatusInputSchema.parse({ userId, status: "restricted", reason: "Repeated spam" })).toMatchObject({
      userId,
      status: "restricted",
    });
  });

  it("accepts an ISO expiration for a restriction", () => {
    expect(adminAccountStatusInputSchema.parse({
      userId,
      status: "restricted",
      restrictionExpiresAt: "2026-12-01T12:00:00.000Z",
    }).restrictionExpiresAt).toBe("2026-12-01T12:00:00.000Z");
  });

  it("rejects a duration for active or banned status", () => {
    expect(adminAccountStatusInputSchema.safeParse({
      userId,
      status: "banned",
      restrictionExpiresAt: "2026-12-01T12:00:00.000Z",
    }).success).toBe(false);
  });

  it("keeps warning reason optional", () => {
    expect(adminUserActionInputSchema.parse({ userId })).toEqual({ userId });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/admin-moderation-input.test.ts`

Expected: FAIL because the existing status schema has no `restrictionExpiresAt` rule and does not reject it for bans.

- [ ] **Step 3: Commit**

```bash
git add camflea-test/unit/admin-moderation-input.test.ts
git commit -m "test: define moderation duration validation"
```

### Task 4: Extend moderation input schemas

**Files:**
- Modify: `camflea-frontend/src/features/admin/admin-actions.ts`
- Test: `camflea-test/unit/admin-moderation-input.test.ts`

**Interfaces:**
- `adminAccountStatusInputSchema` accepts `restrictionExpiresAt?: string | null` only for `restricted`.
- `SetAccountStatus` consumers receive `restrictionExpiresAt?: string | null`.

- [ ] **Step 1: Write minimal implementation**

```ts
const restrictionExpiresAt = z.string().datetime({ offset: true }).nullable().optional();

export const adminAccountStatusInputSchema = z
  .object({ userId, status: z.enum(["active", "restricted", "banned"]), reason, restrictionExpiresAt })
  .superRefine((value, context) => {
    if (value.status !== "restricted" && value.restrictionExpiresAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["restrictionExpiresAt"], message: "Only restricted accounts can have an expiration." });
    }
    if (value.status === "restricted" && value.restrictionExpiresAt && new Date(value.restrictionExpiresAt) <= new Date()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["restrictionExpiresAt"], message: "Restriction expiration must be in the future." });
    }
  });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/admin-moderation-input.test.ts`

Expected: PASS with 4 tests.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/admin/admin-actions.ts camflea-test/unit/admin-moderation-input.test.ts
git commit -m "feat: validate moderation restriction durations"
```

### Task 5: Add a failing Supabase migration contract

**Files:**
- Create: `camflea-test/integration/supabase/user-moderation-contract.test.ts`

**Interfaces:**
- The contract test reads `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql` and requires the new column, helper, RPCs, statistics fields, and protected operation guards.

- [ ] **Step 1: Write the failing test**

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(process.cwd(), "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql");

describe("user moderation migration", () => {
  it("contains expiry, effective status, admin stats, and marketplace guards", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/restriction_expires_at/i);
    expect(sql).toMatch(/marketplace_effective_account_status/i);
    expect(sql).toMatch(/marketplace_get_my_account_status/i);
    expect(sql).toMatch(/listing_count/i);
    expect(sql).toMatch(/message_count/i);
    expect(sql).toMatch(/marketplace_send_message/i);
    expect(sql).toMatch(/marketplace_add_to_cart/i);
    expect(sql).toMatch(/marketplace_listings/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/supabase/user-moderation-contract.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Commit**

```bash
git add camflea-test/integration/supabase/user-moderation-contract.test.ts
git commit -m "test: define user moderation migration contract"
```

### Task 6: Add account-status expiry storage and indexes

**Files:**
- Create: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`

**Interfaces:**
- Adds nullable `restriction_expires_at TIMESTAMPTZ` to `public.marketplace_account_status`.
- Adds an index on `(status, restriction_expires_at, updated_at)`.

- [ ] **Step 1: Write minimal SQL**

```sql
BEGIN;

ALTER TABLE public.marketplace_account_status
  ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS marketplace_account_status_effective_idx
  ON public.marketplace_account_status(status, restriction_expires_at, updated_at DESC);
```

- [ ] **Step 2: Run the contract test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/supabase/user-moderation-contract.test.ts`

Expected: FAIL only on helper/RPC/statistics expectations; the migration file and expiry assertion pass.

- [ ] **Step 3: Commit**

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql
git commit -m "feat: add restriction expiry storage"
```

### Task 7: Add centralized effective-status SQL functions

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`

**Interfaces:**
- Adds `public.marketplace_effective_account_status(_user_id UUID) RETURNS TEXT`.
- Adds `public.marketplace_get_my_account_status() RETURNS TABLE(status TEXT, reason TEXT, restriction_expires_at TIMESTAMPTZ, warning_count INTEGER)`.

- [ ] **Step 1: Write failing SQL contract assertions**

Add to `camflea-test/integration/supabase/user-moderation-contract.test.ts`:

```ts
expect(sql).toMatch(/RETURNS TEXT[\s\S]*marketplace_effective_account_status/i);
expect(sql).toMatch(/RETURNS TABLE[\s\S]*marketplace_get_my_account_status/i);
expect(sql).toMatch(/status = 'restricted'[\s\S]*restriction_expires_at > now\(\)/i);
```

Run the same contract test and confirm the new assertions fail.

- [ ] **Step 2: Write minimal SQL**

```sql
CREATE OR REPLACE FUNCTION public.marketplace_effective_account_status(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(profile.is_banned, false) OR account.status = 'banned' THEN 'banned'
    WHEN account.status = 'restricted'
      AND (account.restriction_expires_at IS NULL OR account.restriction_expires_at > now()) THEN 'restricted'
    ELSE 'active'
  END
  FROM public.student_profiles AS profile
  LEFT JOIN public.marketplace_account_status AS account ON account.user_id = profile.user_id
  WHERE profile.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_get_my_account_status()
RETURNS TABLE(status TEXT, reason TEXT, restriction_expires_at TIMESTAMPTZ, warning_count INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.marketplace_effective_account_status(auth.uid()), account.reason,
         account.restriction_expires_at, COALESCE(account.warning_count, 0)
  FROM public.marketplace_account_status AS account
  WHERE account.user_id = auth.uid()
  UNION ALL
  SELECT public.marketplace_effective_account_status(auth.uid()), NULL, NULL, 0
  WHERE auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.marketplace_account_status WHERE user_id = auth.uid());
$$;
```

- [ ] **Step 3: Run contract test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/supabase/user-moderation-contract.test.ts`

Expected: PASS for helper and account-status RPC assertions.

- [ ] **Step 4: Commit**

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/integration/supabase/user-moderation-contract.test.ts
git commit -m "feat: centralize effective account status"
```

### Task 8: Extend admin moderation RPCs with expiration

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Modify: `camflea-frontend/src/features/admin/admin-actions.ts`

**Interfaces:**
- SQL signature: `admin_set_account_status(_user_id UUID, _status TEXT, _reason TEXT DEFAULT NULL, _restriction_expires_at TIMESTAMPTZ DEFAULT NULL)`.
- Restricted status accepts null or a future expiration; active and banned force null.
- Warning updates preserve both status and expiry.

- [ ] **Step 1: Add failing contract assertions**

```ts
expect(sql).toMatch(/admin_set_account_status\([\s\S]*_restriction_expires_at TIMESTAMPTZ/i);
expect(sql).toMatch(/_status = 'restricted'[\s\S]*_restriction_expires_at <= now\(\)/i);
expect(sql).toMatch(/restriction_expires_at = EXCLUDED\.restriction_expires_at/i);
```

Run the contract test and verify those assertions fail.

- [ ] **Step 2: Add SQL implementation**

Use the existing admin RPC body as the base, validate `auth.uid()` and admin role, reject a past expiration, set `restriction_expires_at` only for `restricted`, preserve `warning_count`, update `student_profiles.is_banned`, and include `restriction_expires_at` in `metadata_summary`.

- [ ] **Step 3: Update the TypeScript validator and adapter input**

```ts
export const adminAccountStatusInputSchema = z.object({
  userId,
  status: z.enum(["active", "restricted", "banned"]),
  reason,
  restrictionExpiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});
```

The server adapter passes `_restriction_expires_at: input.restrictionExpiresAt ?? null`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/admin-moderation-input.test.ts ../camflea-test/integration/supabase/user-moderation-contract.test.ts`

Expected: PASS.

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-frontend/src/features/admin/admin-actions.ts camflea-frontend/src/features/admin/admin-actions.server.ts camflea-test/integration/supabase/user-moderation-contract.test.ts
git commit -m "feat: support expiring admin restrictions"
```

### Task 9: Add aggregate statistics to the admin user RPC

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Test: `camflea-test/integration/supabase/user-moderation-contract.test.ts`

**Interfaces:**
- `admin_list_student_profiles()` returns `restriction_expires_at`, `listing_count`, `available_listing_count`, `sold_listing_count`, `transaction_count`, `completed_purchase_count`, `message_count`, and `report_count`.

- [ ] **Step 1: Add failing aggregate contract assertions**

```ts
for (const column of ["restriction_expires_at", "listing_count", "available_listing_count", "sold_listing_count", "transaction_count", "completed_purchase_count", "message_count", "report_count"]) {
  expect(sql).toMatch(new RegExp(column, "i"));
}
expect(sql).toMatch(/marketplace_messages[\s\S]*sender_id = profile\.user_id/i);
expect(sql).toMatch(/marketplace_reports[\s\S]*reported_user_id = profile\.user_id/i);
```

Run the test and confirm the new assertions fail.

- [ ] **Step 2: Update the SQL return table and query**

Add correlated count subqueries to the existing admin query:

```sql
(SELECT count(*)::INTEGER FROM public.marketplace_listings listing WHERE listing.seller_id = profile.user_id) AS listing_count,
(SELECT count(*)::INTEGER FROM public.marketplace_listings listing WHERE listing.seller_id = profile.user_id AND listing.status = 'available') AS available_listing_count,
(SELECT count(*)::INTEGER FROM public.marketplace_listings listing WHERE listing.seller_id = profile.user_id AND listing.status = 'sold') AS sold_listing_count,
(SELECT count(*)::INTEGER FROM public.marketplace_transactions transaction_row WHERE transaction_row.buyer_id = profile.user_id OR transaction_row.seller_id = profile.user_id) AS transaction_count,
(SELECT count(*)::INTEGER FROM public.marketplace_transactions transaction_row WHERE transaction_row.buyer_id = profile.user_id AND transaction_row.status = 'completed') AS completed_purchase_count,
(SELECT count(*)::INTEGER FROM public.marketplace_messages message_row WHERE message_row.sender_id = profile.user_id) AS message_count,
(SELECT count(*)::INTEGER FROM public.marketplace_reports report_row WHERE report_row.reported_user_id = profile.user_id) AS report_count
```

Use `public.marketplace_effective_account_status(profile.user_id)` for the returned status.

- [ ] **Step 3: Run contract test and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/supabase/user-moderation-contract.test.ts`

Expected: PASS.

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/integration/supabase/user-moderation-contract.test.ts
git commit -m "feat: expose per-user marketplace statistics"
```

### Task 10: Enforce active status for listing writes and listing-photo writes

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Test: `camflea-test/security/marketplace-moderation-contract.test.ts`

**Interfaces:**
- Listing insert/update/delete and listing-media insert/update/delete policies require `marketplace_effective_account_status(auth.uid()) = 'active'` for student-owned writes.
- Admin security-definer RPCs remain usable by authorized staff.

- [ ] **Step 1: Write the failing policy contract**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve(process.cwd(), "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql"), "utf8");

describe("listing moderation enforcement", () => {
  it("requires active status for listing and media writes", () => {
    expect((sql.match(/marketplace_effective_account_status\(auth\.uid\(\)\) = 'active'/gi) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/storage\.foldername\(name\)[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\)/i);
  });
});
```

Run it and verify it fails.

- [ ] **Step 2: Add policy replacements**

Drop and recreate the existing student listing/storage policies by preserving current ownership/status predicates and adding the active-status requirement to every student write policy.

- [ ] **Step 3: Run the policy contract and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/security/marketplace-moderation-contract.test.ts`

Expected: PASS.

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/security/marketplace-moderation-contract.test.ts
git commit -m "security: block restricted listing writes"
```

### Task 11: Enforce active status for purchase initiation

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Test: `camflea-test/security/marketplace-moderation-contract.test.ts`

**Interfaces:**
- `marketplace_add_to_cart` and `marketplace_request_purchase` reject users whose effective status is restricted or banned.

- [ ] **Step 1: Add failing assertions**

```ts
expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_add_to_cart[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_request_purchase[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
```

Run the security contract and confirm failure.

- [ ] **Step 2: Add guards before the listing/transaction lookup**

```sql
IF public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
  RAISE EXCEPTION 'This account cannot use marketplace actions';
END IF;
```

- [ ] **Step 3: Run the security contract and commit**

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/security/marketplace-moderation-contract.test.ts
git commit -m "security: block restricted purchase actions"
```

### Task 12: Enforce active status for messages

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Test: `camflea-test/security/marketplace-moderation-contract.test.ts`

**Interfaces:**
- `marketplace_send_message` rejects restricted and banned senders through the centralized helper, including expired-restriction normalization.

- [ ] **Step 1: Add failing assertion**

```ts
expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_send_message[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
```

Run the contract and confirm it fails.

- [ ] **Step 2: Replace the direct status-table predicate**

Use the helper guard immediately after the recipient/body validation and before listing-conversation authorization.

- [ ] **Step 3: Run and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/security/marketplace-moderation-contract.test.ts`

Expected: PASS.

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/security/marketplace-moderation-contract.test.ts
git commit -m "security: block restricted messages"
```

### Task 13: Enforce active status for transaction transitions

**Files:**
- Modify: `camflea-supabase/migrations/20261116130000_user_moderation_controls.sql`
- Test: `camflea-test/security/marketplace-moderation-contract.test.ts`

**Interfaces:**
- `marketplace_transition_transaction` rejects restricted and banned users before changing any transaction state.

- [ ] **Step 1: Add failing assertion**

```ts
expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_transition_transaction[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
```

- [ ] **Step 2: Add the guard before selecting the transaction**

```sql
IF auth.uid() IS NULL OR public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
  RAISE EXCEPTION 'This account cannot use marketplace actions';
END IF;
```

- [ ] **Step 3: Run and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/security/marketplace-moderation-contract.test.ts`

Expected: PASS.

```bash
git add camflea-supabase/migrations/20261116130000_user_moderation_controls.sql camflea-test/security/marketplace-moderation-contract.test.ts
git commit -m "security: block restricted transaction changes"
```

### Task 14: Add the new database contract to TypeScript types

**Files:**
- Modify: `camflea-frontend/src/integrations/supabase/types.ts`

**Interfaces:**
- `marketplace_account_status.Row/Insert/Update` contains `restriction_expires_at`.
- `marketplace_get_my_account_status` and expanded `admin_list_student_profiles` appear in `Database.public.Functions`.

- [ ] **Step 1: Add a type-level failing test**

Create `camflea-test/unit/supabase-types.test.ts`:

```ts
import type { Database } from "@/integrations/supabase/types";
import { describe, expectTypeOf, it } from "vitest";

describe("moderation database types", () => {
  it("includes restriction expiry and user statistics", () => {
    expectTypeOf<Database["public"]["Tables"]["marketplace_account_status"]["Row"]["restriction_expires_at"]>().toEqualTypeOf<string | null>();
    expectTypeOf<Database["public"]["Functions"]["marketplace_get_my_account_status"]>().toMatchTypeOf<object>();
    expectTypeOf<Database["public"]["Functions"]["admin_list_student_profiles"]>().toMatchTypeOf<object>();
  });
});
```

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/supabase-types.test.ts`

Expected: FAIL because the generated contract is missing the new fields/function.

- [ ] **Step 2: Update the generated shape**

Add the column to all three row variants and add function argument/return declarations matching the migration exactly.

- [ ] **Step 3: Run and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/supabase-types.test.ts`

Expected: PASS.

```bash
git add camflea-frontend/src/integrations/supabase/types.ts camflea-test/unit/supabase-types.test.ts
git commit -m "chore: update moderation database types"
```

### Task 15: Add failing server-adapter duration coverage

**Files:**
- Create: `camflea-test/integration/server/admin-moderation.server.test.ts`

**Interfaces:**
- The server adapter passes `_restriction_expires_at` and preserves null for an indefinite restriction.

- [ ] **Step 1: Write the failing test**

```ts
it("passes an optional restriction expiration to the admin RPC", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const client = { rpc } as never;
  await setAccountStatusForAdmin(client, "admin-id", {
    userId: "00000000-0000-4000-8000-000000000001",
    status: "restricted",
    restrictionExpiresAt: "2026-12-01T12:00:00.000Z",
  });
  expect(rpc).toHaveBeenCalledWith("admin_set_account_status", expect.objectContaining({
    _restriction_expires_at: "2026-12-01T12:00:00.000Z",
  }));
});
```

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/server/admin-moderation.server.test.ts`

Expected: FAIL because the adapter does not pass the new argument.

- [ ] **Step 2: Commit the failing test**

```bash
git add camflea-test/integration/server/admin-moderation.server.test.ts
git commit -m "test: cover admin restriction expiry adapter"
```

### Task 16: Update the server adapter for duration-aware status changes

**Files:**
- Modify: `camflea-frontend/src/features/admin/admin-actions.server.ts`
- Test: `camflea-test/integration/server/admin-moderation.server.test.ts`

**Interfaces:**
- `setAccountStatusForAdmin` passes `_restriction_expires_at`.
- `listAdminWorkspace` maps the expanded RPC records without dropping statistics.

- [ ] **Step 1: Write minimal implementation**

```ts
const { error } = await client.rpc("admin_set_account_status", {
  _user_id: input.userId,
  _status: input.status,
  _reason: input.reason ?? null,
  _restriction_expires_at: input.restrictionExpiresAt ?? null,
});
```

- [ ] **Step 2: Run focused server test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/server/admin-moderation.server.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/admin/admin-actions.server.ts camflea-test/integration/server/admin-moderation.server.test.ts
git commit -m "feat: forward restriction expiry to Supabase"
```

### Task 17: Add failing shell account-status loading coverage

**Files:**
- Modify: `camflea-test/ui/components/page-shell.test.tsx`

**Interfaces:**
- `ShellData.accountStatus` contains `status`, `reason`, `restrictionExpiresAt`, and `warningCount`.

- [ ] **Step 1: Add the failing test**

```tsx
it("shows a restricted status notice from shell data", async () => {
  renderPage(
    vi.fn().mockResolvedValue({
      ...shellData,
      accountStatus: { status: "restricted", reason: "Repeated spam", restrictionExpiresAt: "2026-12-01T12:00:00.000Z", warningCount: 2 },
    }),
    <h1>Browse items</h1>,
  );
  expect(await screen.findByRole("status", { name: /account restricted/i })).toBeVisible();
});
```

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/page-shell.test.tsx`

Expected: FAIL because account status is not rendered.

- [ ] **Step 2: Commit the failing test**

```bash
git add camflea-test/ui/components/page-shell.test.tsx
git commit -m "test: cover shell account status loading"
```

### Task 18: Load effective status in the authenticated shell

**Files:**
- Modify: `camflea-frontend/src/components/camflea-page-shell.tsx`
- Modify: `camflea-test/ui/components/page-shell.test.tsx`

**Interfaces:**
- `ShellData.accountStatus` is required for successfully hydrated sessions.
- `loadShellData()` invokes `marketplace_get_my_account_status` and maps its row to camelCase.

- [ ] **Step 1: Implement the loader mapping**

```ts
const { data: accountRows, error: accountError } = await supabase.rpc("marketplace_get_my_account_status");
if (accountError) throw accountError;
const account = accountRows?.[0];
const accountStatus = {
  status: effectiveAccountStatus(account?.status ?? "active", account?.restriction_expires_at),
  reason: account?.reason ?? null,
  restrictionExpiresAt: account?.restriction_expires_at ?? null,
  warningCount: account?.warning_count ?? 0,
} as const;
```

Use `status: "active"` only for the no-row case, never for a failed account-status request.

- [ ] **Step 2: Update test fixtures and run**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/page-shell.test.tsx`

Expected: PASS with the new status notice test still red until Tasks 19–24 integrate the presentation gate; existing hydration tests compile with the new fixture fields.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/components/camflea-page-shell.tsx camflea-test/ui/components/page-shell.test.tsx
git commit -m "feat: load account status in page shell"
```

### Task 19: Add account-status context tests

**Files:**
- Create: `camflea-test/ui/components/account-status-context.test.tsx`

**Interfaces:**
- `AccountStatusProvider` provides `useAccountStatus()` with `status`, `reason`, `restrictionExpiresAt`, `warningCount`, and `canUseMarketplace`.

- [ ] **Step 1: Write the failing test**

```tsx
function Probe() {
  const account = useAccountStatus();
  return <output>{account.status}:{String(account.canUseMarketplace)}</output>;
}

it("exposes the effective status to child controls", () => {
  render(<AccountStatusProvider value={{ status: "restricted", reason: null, restrictionExpiresAt: null, warningCount: 1 }}><Probe /></AccountStatusProvider>);
  expect(screen.getByRole("status")).toHaveTextContent("restricted:false");
});
```

Run and confirm failure because the context does not exist.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/components/account-status-context.test.tsx
git commit -m "test: define account status context"
```

### Task 20: Implement account-status context

**Files:**
- Create: `camflea-frontend/src/components/account-status-context.tsx`
- Test: `camflea-test/ui/components/account-status-context.test.tsx`

**Interfaces:**
- `AccountStatusValue` contains `status: AccountStatus`, `reason: string | null`, `restrictionExpiresAt: string | null`, `warningCount: number`, `canUseMarketplace: boolean`.
- `useAccountStatus()` throws a clear error when used outside the provider.

- [ ] **Step 1: Implement provider and hook**

```tsx
const AccountStatusContext = createContext<AccountStatusValue | null>(null);

export function AccountStatusProvider({ value, children }: { value: Omit<AccountStatusValue, "canUseMarketplace">; children: ReactNode }) {
  return <AccountStatusContext.Provider value={{ ...value, canUseMarketplace: canUseMarketplace(value.status) }}>{children}</AccountStatusContext.Provider>;
}

export function useAccountStatus() {
  const value = useContext(AccountStatusContext);
  if (!value) throw new Error("useAccountStatus must be used inside AccountStatusProvider");
  return value;
}
```

- [ ] **Step 2: Run the focused test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/account-status-context.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/components/account-status-context.tsx camflea-test/ui/components/account-status-context.test.tsx
git commit -m "feat: provide account status context"
```

### Task 21: Add failing restricted-banner coverage

**Files:**
- Create: `camflea-test/ui/components/account-status-banner.test.tsx`

**Interfaces:**
- `AccountStatusBanner` renders expiry copy for a timed restriction and manual-restoration copy for an indefinite restriction.

- [ ] **Step 1: Write the failing test**

```tsx
it("explains a timed restriction", () => {
  render(<AccountStatusBanner status="restricted" restrictionExpiresAt="2026-12-01T12:00:00.000Z" />);
  expect(screen.getByRole("status")).toHaveTextContent(/cannot post, message, or purchase/i);
  expect(screen.getByRole("status")).toHaveTextContent(/Dec 1, 2026/i);
});
```

Run and confirm the component is missing.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/components/account-status-banner.test.tsx
git commit -m "test: cover restricted account notice"
```

### Task 22: Implement the restricted-account banner

**Files:**
- Create: `camflea-frontend/src/components/account-status-banner.tsx`
- Test: `camflea-test/ui/components/account-status-banner.test.tsx`

**Interfaces:**
- `AccountStatusBanner({ status, restrictionExpiresAt }): JSX.Element | null`.

- [ ] **Step 1: Implement the component**

```tsx
export function AccountStatusBanner({ status, restrictionExpiresAt }: { status: AccountStatus; restrictionExpiresAt: string | null }) {
  if (status !== "restricted") return null;
  const expiry = restrictionExpiresAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(restrictionExpiresAt))
    : "until an administrator restores your account";
  return <div role="status" aria-label="Account restricted" className="account-status-banner"><strong>Account restricted</strong><span>You can browse listings, but you cannot post, message, or purchase. Restriction ends {expiry}.</span></div>;
}
```

- [ ] **Step 2: Run focused test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/account-status-banner.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/components/account-status-banner.tsx camflea-test/ui/components/account-status-banner.test.tsx
git commit -m "feat: explain restricted account access"
```

### Task 23: Add failing banned-modal coverage

**Files:**
- Create: `camflea-test/ui/components/banned-account-modal.test.tsx`

**Interfaces:**
- The modal renders a dialog named “You are banned from CamFlea” and signs out when the sign-out action is pressed.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders the blocking banned modal and signs out", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  render(<BannedAccountModal onSignOut={signOut} />);
  expect(screen.getByRole("dialog", { name: /you are banned from camflea/i })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
  expect(signOut).toHaveBeenCalledOnce();
});
```

Run and confirm the component is missing.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/components/banned-account-modal.test.tsx
git commit -m "test: cover banned account modal"
```

### Task 24: Implement the banned-account modal

**Files:**
- Create: `camflea-frontend/src/components/banned-account-modal.tsx`
- Test: `camflea-test/ui/components/banned-account-modal.test.tsx`

**Interfaces:**
- `BannedAccountModal({ onSignOut }): JSX.Element` renders an always-open, modal `AlertDialog` with no cancel action.

- [ ] **Step 1: Implement legacy-inspired dialog content**

```tsx
<AlertDialog open>
  <AlertDialogContent role="dialog" aria-describedby="banned-account-copy">
    <div className="banned-account-icon"><Ban aria-hidden="true" /></div>
    <AlertDialogHeader>
      <AlertDialogTitle>You are banned from CamFlea</AlertDialogTitle>
      <AlertDialogDescription id="banned-account-copy">Your account has been permanently banned from the platform due to community-guideline violations.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter><Button type="button" variant="destructive" onClick={() => void onSignOut()}>Sign out</Button></AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 2: Run focused test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/banned-account-modal.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/components/banned-account-modal.tsx camflea-test/ui/components/banned-account-modal.test.tsx
git commit -m "feat: add banned account modal"
```

### Task 25: Integrate account-status gate into the page shell

**Files:**
- Modify: `camflea-frontend/src/components/camflea-page-shell.tsx`
- Modify: `camflea-frontend/src/components/app-shell.tsx`
- Test: `camflea-test/ui/components/page-shell.test.tsx`

**Interfaces:**
- Hydrated marketplace pages render `AccountStatusProvider`, `AccountStatusBanner` for restricted users, and `BannedAccountModal` for banned users.
- Sign-out calls Supabase auth and routes to `/auth` with replacement navigation.

- [ ] **Step 1: Add failing shell assertions**

```tsx
it("blocks a banned user with the modal", async () => {
  renderPage(vi.fn().mockResolvedValue({ ...shellData, accountStatus: { status: "banned", reason: null, restrictionExpiresAt: null, warningCount: 3 } }), <h1>Browse items</h1>);
  expect(await screen.findByRole("dialog", { name: /you are banned from camflea/i })).toBeVisible();
});
```

Run the page-shell test and confirm failure.

- [ ] **Step 2: Add the provider/gate composition**

Render `AppShell` inside `AccountStatusProvider`; place the restricted banner above page children and the banned modal after the shell so its overlay covers the viewport. The sign-out handler calls `supabase.auth.signOut()` and `navigate({ to: "/auth", replace: true })`.

- [ ] **Step 3: Run focused shell tests**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/page-shell.test.tsx ../camflea-test/ui/components/account-status-context.test.tsx ../camflea-test/ui/components/banned-account-modal.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add camflea-frontend/src/components/camflea-page-shell.tsx camflea-frontend/src/components/app-shell.tsx camflea-test/ui/components/page-shell.test.tsx
git commit -m "feat: gate marketplace by account status"
```

### Task 26: Add failing restricted listing-form coverage

**Files:**
- Modify: `camflea-test/ui/features/listing-form.test.tsx`

**Interfaces:**
- A restricted account sees the form but cannot submit or edit listing controls.

- [ ] **Step 1: Add the failing test**

```tsx
it("disables posting for a restricted account", () => {
  render(<AccountStatusProvider value={{ status: "restricted", reason: null, restrictionExpiresAt: null, warningCount: 1 }}><ListingForm onSave={vi.fn()} /></AccountStatusProvider>);
  expect(screen.getByRole("button", { name: /post item/i })).toBeDisabled();
  expect(screen.getByText(/cannot post/i)).toBeInTheDocument();
});
```

Run the listing-form tests and confirm failure.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/features/listing-form.test.tsx
git commit -m "test: cover restricted listing form"
```

### Task 27: Disable restricted listing creation in the form

**Files:**
- Modify: `camflea-frontend/src/features/listings/listing-form.tsx`
- Test: `camflea-test/ui/features/listing-form.test.tsx`

**Interfaces:**
- `ListingForm` reads `useAccountStatus()` and disables its fieldset, uploader, and submit button when `canUseMarketplace` is false.

- [ ] **Step 1: Implement the disabled state**

```tsx
const { canUseMarketplace } = useAccountStatus();
const marketplaceDisabled = !canUseMarketplace;
...
{marketplaceDisabled ? <p role="status">Your account is restricted and cannot post items.</p> : null}
<fieldset disabled={saving || marketplaceDisabled} className="contents">{/* existing form controls */}</fieldset>
```

- [ ] **Step 2: Run focused listing-form tests**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/listing-form.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/listings/listing-form.tsx camflea-test/ui/features/listing-form.test.tsx
git commit -m "feat: disable restricted listing posts"
```

### Task 28: Add failing restricted-message coverage

**Files:**
- Modify: `camflea-test/ui/features/messages.test.tsx`

**Interfaces:**
- A restricted account sees the conversation history but cannot compose or send a new message.

- [ ] **Step 1: Add the failing test**

```tsx
it("disables message composition for a restricted account", async () => {
  render(<AccountStatusProvider value={{ status: "restricted", reason: null, restrictionExpiresAt: null, warningCount: 1 }}><MessageThread participantName="Seller" messages={[]} onSend={vi.fn()} /></AccountStatusProvider>);
  expect(screen.getByRole("textbox", { name: /message/i })).toBeDisabled();
  expect(screen.getByText(/cannot send messages/i)).toBeInTheDocument();
});
```

Run the message tests and confirm failure.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/features/messages.test.tsx
git commit -m "test: cover restricted message composer"
```

### Task 29: Disable restricted message composition

**Files:**
- Modify: `camflea-frontend/src/features/messages/message-thread.tsx`
- Modify: `camflea-frontend/src/features/messages/message-page.tsx`
- Test: `camflea-test/ui/features/messages.test.tsx`

**Interfaces:**
- `MessageThread` accepts optional `disabled?: boolean` and renders an explanatory status while disabling input/send/retry.
- `MessagePage` passes `disabled={!useAccountStatus().canUseMarketplace}`.

- [ ] **Step 1: Implement the prop and UI**

```tsx
export function MessageThread({ disabled = false, ...props }: MessageThreadProps) {
  ...
  <form aria-disabled={disabled}>
    <Input disabled={disabled || busy} ... />
    <Button disabled={disabled || busy}>...</Button>
  </form>
  {disabled ? <p role="status">Your account is restricted and cannot send messages.</p> : null}
}
```

- [ ] **Step 2: Run focused tests**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/messages.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/messages/message-thread.tsx camflea-frontend/src/features/messages/message-page.tsx camflea-test/ui/features/messages.test.tsx
git commit -m "feat: disable restricted message sending"
```

### Task 30: Add failing restricted listing-detail action coverage

**Files:**
- Modify: `camflea-test/ui/features/listing-detail.test.tsx`

**Interfaces:**
- Restricted users can inspect listing details but cannot message or purchase.

- [ ] **Step 1: Add the failing test**

```tsx
it("disables message and purchase actions for a restricted account", () => {
  render(<AccountStatusProvider value={{ status: "restricted", reason: null, restrictionExpiresAt: null, warningCount: 1 }}><ListingDetail listing={availableListing} /></AccountStatusProvider>);
  expect(screen.getByRole("button", { name: /message seller/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /purchase/i })).toBeDisabled();
});
```

Run the listing-detail tests and confirm failure.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/features/listing-detail.test.tsx
git commit -m "test: cover restricted listing actions"
```

### Task 31: Disable restricted purchase and message actions

**Files:**
- Modify: `camflea-frontend/src/features/listings/listing-detail.tsx`
- Test: `camflea-test/ui/features/listing-detail.test.tsx`

**Interfaces:**
- `ListingDetail` reads `useAccountStatus()` and combines `available && canUseMarketplace` for message/purchase disabled state.
- Reporting and browsing remain available.

- [ ] **Step 1: Implement disabled action state**

```tsx
const { canUseMarketplace } = useAccountStatus();
const actionsAvailable = available && canUseMarketplace;
<button disabled={!actionsAvailable} ...>Message seller</button>
<button disabled={!actionsAvailable} ...>Purchase</button>
{available && !canUseMarketplace ? <p role="note">Your account is restricted from messaging and purchasing.</p> : null}
```

- [ ] **Step 2: Run focused test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/listing-detail.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/listings/listing-detail.tsx camflea-test/ui/features/listing-detail.test.tsx
git commit -m "feat: disable restricted listing actions"
```

### Task 32: Add failing admin-user data model coverage

**Files:**
- Create: `camflea-test/unit/admin-user-data.test.ts`

**Interfaces:**
- `AdminUser` includes restriction expiry and all eight per-user statistics.

- [ ] **Step 1: Write the failing type/fixture test**

```ts
import type { AdminUser } from "@/features/admin/admin-dashboard-data";
import { describe, expect, it } from "vitest";

describe("admin user statistics", () => {
  it("accepts the moderation and activity fields", () => {
    const user: AdminUser = {
      user_id: "user", email: "student@example.test", first_name: "A", last_name: "Student",
      school: null, program: null, year_level: null, profile_image: null, bio: null,
      is_banned: false, status: "active", reason: null, warning_count: 2,
      restriction_expires_at: null, listing_count: 3, available_listing_count: 2,
      sold_listing_count: 1, transaction_count: 4, completed_purchase_count: 1,
      message_count: 6, report_count: 0, created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(user.completed_purchase_count).toBe(1);
  });
});
```

Run and confirm failure because the fields do not exist.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/unit/admin-user-data.test.ts
git commit -m "test: define admin user statistics shape"
```

### Task 33: Extend the admin user data model

**Files:**
- Modify: `camflea-frontend/src/features/admin/admin-dashboard-data.ts`
- Test: `camflea-test/unit/admin-user-data.test.ts`

**Interfaces:**
- `AdminUser` exactly matches the new RPC result fields.

- [ ] **Step 1: Add the fields**

```ts
restriction_expires_at: string | null;
listing_count: number;
available_listing_count: number;
sold_listing_count: number;
transaction_count: number;
completed_purchase_count: number;
message_count: number;
report_count: number;
```

- [ ] **Step 2: Run focused type test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit/admin-user-data.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/admin/admin-dashboard-data.ts camflea-test/unit/admin-user-data.test.ts
git commit -m "feat: model per-user admin statistics"
```

### Task 34: Add failing restriction-duration action coverage

**Files:**
- Create: `camflea-test/ui/features/restrict-user-action.test.tsx`

**Interfaces:**
- The control emits `restrictionExpiresAt: null` for Indefinite and a future ISO timestamp for a preset duration.

- [ ] **Step 1: Write the failing test**

```tsx
it("submits an indefinite restriction", async () => {
  const onConfirm = vi.fn();
  render(<RestrictUserAction userName="A Student" onConfirm={onConfirm}><Button>Restrict</Button></RestrictUserAction>);
  await userEvent.click(screen.getByRole("button", { name: "Restrict" }));
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /duration/i }), "indefinite");
  await userEvent.click(screen.getByRole("button", { name: /^restrict$/i }));
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ restrictionExpiresAt: null }));
});
```

Run and confirm failure because the component does not exist.

- [ ] **Step 2: Commit**

```bash
git add camflea-test/ui/features/restrict-user-action.test.tsx
git commit -m "test: cover restriction duration control"
```

### Task 35: Implement restriction-duration confirmation

**Files:**
- Create: `camflea-frontend/src/features/admin/restrict-user-action.tsx`
- Test: `camflea-test/ui/features/restrict-user-action.test.tsx`

**Interfaces:**
- `RestrictUserAction({ userName, onConfirm, children })` calls `onConfirm({ reason, restrictionExpiresAt })`.
- Duration options are `indefinite`, `24-hours`, `7-days`, `30-days`, and `custom`.

- [ ] **Step 1: Implement with Radix Alert Dialog**

Use an optional reason textarea, a labeled select, a local date-time input for `custom`, and compute presets from `Date.now()` only at confirmation time. Submit ISO UTC strings for timed restrictions and null for Indefinite.

- [ ] **Step 2: Run focused UI test**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/restrict-user-action.test.tsx`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add camflea-frontend/src/features/admin/restrict-user-action.tsx camflea-test/ui/features/restrict-user-action.test.tsx
git commit -m "feat: add restriction duration control"
```

### Task 36: Extract admin user management and add failing statistics UI coverage

**Files:**
- Create: `camflea-test/ui/features/admin-user-management.test.tsx`
- Create: `camflea-frontend/src/features/admin/admin-user-management.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx`

**Interfaces:**
- `AdminUserManagement` accepts `users`, `onAction`, `warnUser`, and `setAccountStatus` and renders one record per user.

- [ ] **Step 1: Write the failing UI test**

```tsx
it("shows per-user activity statistics", () => {
  render(<AdminUserManagement users={[adminUserFixture]} onAction={vi.fn()} warnUser={vi.fn()} setAccountStatus={vi.fn()} />);
  expect(screen.getByText("3 listings")).toBeInTheDocument();
  expect(screen.getByText("1 completed purchase")).toBeInTheDocument();
  expect(screen.getByText("6 messages sent")).toBeInTheDocument();
  expect(screen.getByText("0 reports received")).toBeInTheDocument();
});
```

Run and confirm failure because the extracted component and statistics are missing.

- [ ] **Step 2: Extract existing `UserManagement` and `UserRecord`**

Move the existing user-directory functions and their imports to `admin-user-management.tsx`, export `AdminUserManagement`, preserve the current search/status/school filters, and update `AdminDashboard` to render the new component.

- [ ] **Step 3: Add the statistics summary**

Render a compact stats grid in each record using the real `AdminUser` values and pluralized labels. Keep warning count and effective status visible without expanding the record.

- [ ] **Step 4: Run focused admin UI tests**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/admin-user-management.test.tsx ../camflea-test/integration/server/admin-dashboard.test.tsx`

Expected: PASS after updating fixtures for the new required fields.

- [ ] **Step 5: Commit**

```bash
git add camflea-frontend/src/features/admin/admin-user-management.tsx camflea-frontend/src/features/admin/admin-dashboard.tsx camflea-test/ui/features/admin-user-management.test.tsx camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "feat: show per-user activity statistics"
```

### Task 37: Wire duration-aware admin controls and warned filtering

**Files:**
- Modify: `camflea-frontend/src/features/admin/admin-user-management.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx`
- Test: `camflea-test/ui/features/admin-user-management.test.tsx`

**Interfaces:**
- Warn submits an incrementing action with a reason.
- Restrict uses `RestrictUserAction` and passes the selected expiry.
- Ban passes `restrictionExpiresAt: null`.
- Restore passes `status: "active"` and null expiry.
- Status filter accepts `warned` and matches users with `warning_count > 0`.

- [ ] **Step 1: Add failing interaction assertions**

```tsx
it("filters warned users and forwards restriction expiry", async () => {
  const setAccountStatus = vi.fn().mockResolvedValue({ success: true });
  render(<AdminUserManagement users={[{ ...adminUserFixture, warning_count: 2 }]} onAction={vi.fn()} warnUser={vi.fn()} setAccountStatus={setAccountStatus} />);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /filter users by status/i }), "warned");
  expect(screen.getByText(/2 warnings/i)).toBeInTheDocument();
});
```

Run and confirm failure because `warned` is not an option and the restriction control is not wired.

- [ ] **Step 2: Implement the controls and filter**

Update the callback type in `admin-dashboard.tsx`, pass it through `AdminUserManagement`, add the `warned` option, and use the new component for restriction confirmation. Keep status mutations inside `onAction` so refresh behavior is unchanged.

- [ ] **Step 3: Run and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/features/admin-user-management.test.tsx`

Expected: PASS.

```bash
git add camflea-frontend/src/features/admin/admin-user-management.tsx camflea-frontend/src/features/admin/admin-dashboard.tsx camflea-test/ui/features/admin-user-management.test.tsx
git commit -m "feat: wire moderation controls and warning filter"
```

### Task 38: Add accessibility and visual polish for moderation surfaces

**Files:**
- Modify: `camflea-frontend/src/styles.css`
- Modify: `camflea-frontend/src/components/account-status-banner.tsx`
- Modify: `camflea-frontend/src/components/banned-account-modal.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-user-management.tsx`
- Test: `camflea-test/ui/components/account-status-banner.test.tsx`, `banned-account-modal.test.tsx`, `admin-user-management.test.tsx`

**Interfaces:**
- Status banner and modal have visible focus styles, sufficient semantic labels, responsive layout, and no icon-only unlabeled controls.
- Admin statistics remain readable on narrow screens.

- [ ] **Step 1: Add failing accessibility assertions**

```tsx
expect(screen.getByRole("status", { name: /account restricted/i })).toHaveAttribute("aria-live", "polite");
expect(screen.getByRole("dialog", { name: /you are banned from camflea/i })).toHaveAttribute("aria-modal", "true");
```

Run the focused UI tests and confirm failure where attributes are absent.

- [ ] **Step 2: Add semantic attributes and responsive styles**

Use existing CamFlea palette tokens, add a subtle red status treatment consistent with the legacy modal, keep the content readable at mobile widths, and preserve reduced-motion behavior.

- [ ] **Step 3: Run focused UI tests and commit**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/ui/components/account-status-banner.test.tsx ../camflea-test/ui/components/banned-account-modal.test.tsx ../camflea-test/ui/features/admin-user-management.test.tsx`

Expected: PASS.

```bash
git add camflea-frontend/src/styles.css camflea-frontend/src/components/account-status-banner.tsx camflea-frontend/src/components/banned-account-modal.tsx camflea-frontend/src/features/admin/admin-user-management.tsx camflea-test/ui/components/account-status-banner.test.tsx camflea-test/ui/components/banned-account-modal.test.tsx camflea-test/ui/features/admin-user-management.test.tsx
git commit -m "style: polish moderation status surfaces"
```

### Task 39: Validate migration syntax and seed compatibility

**Files:**
- Modify: `camflea-test/integration/supabase/schema-contract.test.ts`
- Modify: `camflea-test/integration/supabase/seed-contract.test.ts` only if the new field must be represented in fixtures.

**Interfaces:**
- The new migration is included in contract validation and does not break seed assumptions.

- [ ] **Step 1: Add the migration to the contract list**

```ts
const moderationMigrationPath = path.resolve(process.cwd(), "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql");
expect(existsSync(moderationMigrationPath)).toBe(true);
```

- [ ] **Step 2: Run Supabase/local schema checks**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/integration/supabase/schema-contract.test.ts ../camflea-test/integration/supabase/seed-contract.test.ts`

If the Supabase CLI is installed, also run: `supabase db lint --workdir camflea-supabase`.

Expected: exit code 0. SQL errors must be fixed in the migration, not hidden by changing assertions.

- [ ] **Step 3: Commit**

```bash
git add camflea-test/integration/supabase/schema-contract.test.ts camflea-test/integration/supabase/seed-contract.test.ts
git commit -m "test: validate moderation migration integration"
```

### Task 40: Run the full frontend quality gate

**Files:**
- No source changes expected; modify only a test fixture if a real failure identifies a missing required field.

**Interfaces:**
- All existing and new tests remain enabled and deterministic.

- [ ] **Step 1: Run focused suites first**

Run: `npm --prefix camflea-frontend test -- ../camflea-test/unit ../camflea-test/security ../camflea-test/integration/supabase/user-moderation-contract.test.ts ../camflea-test/ui/components/page-shell.test.tsx ../camflea-test/ui/features/listing-form.test.tsx ../camflea-test/ui/features/listing-detail.test.tsx ../camflea-test/ui/features/messages.test.tsx ../camflea-test/ui/features/admin-user-management.test.tsx`

Expected: all focused suites pass.

- [ ] **Step 2: Run the repository lint and full test suite**

Run from the repository root: `npm --prefix camflea-frontend run lint`

Run: `npm --prefix camflea-frontend test`

Expected: exit code 0 with no focused or skipped tests.

- [ ] **Step 3: Commit any required fixture-only corrections**

If a fixture correction is needed, keep it limited to the failing test’s required fields, rerun the failing command, and commit:

```bash
git add camflea-test
git commit -m "test: align moderation fixtures with workspace data"
```

### Task 41: Run the production build and final repository checks

**Files:**
- No source changes expected unless the build exposes a type/import error.

- [ ] **Step 1: Run the production build**

Run: `npm --prefix camflea-frontend run build`

Expected: exit code 0.

- [ ] **Step 2: Run final repository checks**

Run: `git diff --check`

Run: `git status --short --branch`

Run: `git log --oneline -35`

Expected: clean diff, only intended commits, and at least 30 non-empty commits created during this implementation in addition to the approved design/plan commits.

- [ ] **Step 3: Commit verified plan tracking if needed**

```bash
git add docs/superpowers/plans/2026-11-16-user-moderation-controls.md
git commit -m "docs: record moderation implementation plan"
```

## Self-review checklist

- Spec coverage: Tasks 1–4 cover unlimited warnings and input validation; Tasks 5–14 cover schema, expiry, effective status, admin statistics, and database enforcement; Tasks 15–16 cover authenticated server adapters; Tasks 17–25 cover shell status, restriction notice, and banned modal; Tasks 26–31 cover disabled marketplace controls; Tasks 32–37 cover per-user statistics, duration controls, warning filtering, and admin actions; Tasks 38–41 cover accessibility, migration validation, frontend gates, and build verification.
- Placeholder scan: no task depends on an undefined future decision, skipped check, or disabled quality gate.
- Type consistency: the SQL function parameter `_restriction_expires_at`, TypeScript property `restrictionExpiresAt`, database field `restriction_expires_at`, and `AdminUser` statistic names are used consistently throughout the plan.
- Commit count: Tasks 1–41 each define a non-empty commit step, exceeding the requested minimum of 30 commits.
